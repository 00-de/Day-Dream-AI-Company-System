/* ==========================================================
   SDayDream Music Studio — Phase 3
   /api/ai  … Groq / Gemini / OpenAI への中継
   APIキーはこのサーバー側だけで扱い、ブラウザには渡しません。

   Vercel の Settings → Environment Variables に入れる名前:
     GROQ_API_KEY      （無料枠あり・速い）
     GEMINI_API_KEY    （無料枠あり）
     OPENAI_API_KEY    （有料）
     ANTHROPIC_API_KEY （Claude・有料・日本語の作詞が得意）
   1つでも入っていれば動きます。
   ========================================================== */

const MODELS = {
  groq:   process.env.GROQ_MODEL   || "llama-3.3-70b-versatile",
  openai: process.env.OPENAI_MODEL || "gpt-4o-mini",
  gemini: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  claude: process.env.CLAUDE_MODEL || "claude-sonnet-5"
};

function available() {
  const a = [];
  if (process.env.GROQ_API_KEY) a.push("groq");
  if (process.env.GEMINI_API_KEY) a.push("gemini");
  if (process.env.OPENAI_API_KEY) a.push("openai");
  if (process.env.ANTHROPIC_API_KEY) a.push("claude");
  return a;
}

/* ---------- 各社の呼び出し ---------- */
async function callGroq(system, user, json) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.GROQ_API_KEY },
    body: JSON.stringify({
      model: MODELS.groq, temperature: 0.9, max_tokens: 2000,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      ...(json ? { response_format: { type: "json_object" } } : {})
    })
  });
  if (!r.ok) throw new Error("groq " + r.status + " " + (await r.text()).slice(0, 300));
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}
async function callOpenAI(system, user, json) {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.OPENAI_API_KEY },
    body: JSON.stringify({
      model: MODELS.openai, temperature: 0.9, max_tokens: 2000,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      ...(json ? { response_format: { type: "json_object" } } : {})
    })
  });
  if (!r.ok) throw new Error("openai " + r.status + " " + (await r.text()).slice(0, 300));
  const d = await r.json();
  return d.choices?.[0]?.message?.content || "";
}
async function callGemini(system, user, json) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" +
    MODELS.gemini + ":generateContent?key=" + process.env.GEMINI_API_KEY;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.9, maxOutputTokens: 2000,
        ...(json ? { responseMimeType: "application/json" } : {})
      }
    })
  });
  if (!r.ok) throw new Error("gemini " + r.status + " " + (await r.text()).slice(0, 300));
  const d = await r.json();
  return d.candidates?.[0]?.content?.parts?.map(p => p.text).join("") || "";
}

async function callClaude(system, user, json) {
  // Claude には JSON モードが無いので、返答の冒頭を「{」で始めさせて確実にJSONにする
  const messages = [{ role: "user", content: user }];
  if (json) messages.push({ role: "assistant", content: "{" });
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODELS.claude, max_tokens: 2000, temperature: 1,
      system, messages
    })
  });
  if (!r.ok) throw new Error("claude " + r.status + " " + (await r.text()).slice(0, 300));
  const d = await r.json();
  const text = (d.content || []).filter(c => c.type === "text").map(c => c.text).join("");
  return json ? "{" + text : text;
}

async function ask(preferred, system, user, json) {
  const list = available();
  if (!list.length) { const e = new Error("APIキーが未設定です"); e.code = "NO_KEY"; throw e; }
  const order = preferred && list.includes(preferred)
    ? [preferred, ...list.filter(x => x !== preferred)] : list;
  let last;
  for (const p of order) {
    try {
      const fn = p === "groq" ? callGroq : p === "openai" ? callOpenAI
               : p === "claude" ? callClaude : callGemini;
      const text = await fn(system, user, json);
      if (text && text.trim()) return { provider: p, model: MODELS[p], text: text.trim() };
      last = new Error(p + " から空の応答");
    } catch (e) { last = e; }
  }
  throw last || new Error("すべての提供元に失敗しました");
}

/* ---------- タスクごとの指示文 ---------- */
const BASE = `あなたは日本の音楽ユニット「DayDreamプラス（DayDream＋）」専属の作詞家です。
メンバーは 悠真（キーボード・ボーカル、リーダー）、結衣（メインボーカル）、葵（ギター・ボーカル）、
蓮（ギター・コーラス）、美琴（演歌ボーカル）、大地（ドラム）。
歌える日本語で書きます。字余りを避け、1行はおよそ12〜22音に収めます。
既存の楽曲の歌詞は引用も模倣もしません。すべて新しく書き下ろします。
説明や前置きは書かず、求められたものだけを出力します。`;

function buildTask(task, p) {
  const mem = (p.members || []).join("・");
  const struct = (p.structure || []).join(" → ");
  switch (task) {
    case "lyrics":
      return {
        system: BASE,
        user: `次の条件で歌詞を書いてください。

テーマ: ${p.theme || "指定なし"}
入れたい言葉: ${(p.words || []).join("、") || "なし"}
ジャンル: ${p.genre || ""} ／ 雰囲気: ${p.mood || ""}
テンポ: ${p.bpm || ""}BPM ／ 拍子: ${p.meter || "4/4"} ／ キー: ${p.key || ""}
言語: ${p.lang === "en" ? "英語" : p.lang === "mix" ? "日本語（サビの一部だけ英語）" : "日本語"}
歌唱編成: ${p.formation || ""}（${mem}）
構成: ${struct}

出力の決まり:
- 各セクションの見出しを [Verse 1: 結衣] のように、セクション名と歌唱担当を英語コロン区切りで書く
- サビは選ばれた全員のユニゾンとし [Chorus: ${mem.replace(/・/g, " & ")}] と書く
- Aメロ・Bメロは担当を交代させる
- サビの1行目は曲全体の軸になる印象的な一行にし、繰り返し登場させる
- 見出しと歌詞だけを出力する`,
        json: false
      };
    case "polish":
      return {
        system: BASE,
        user: `次の歌詞を推敲してください。構成の見出し（[ ] の行）はそのまま残します。
直すのは、歌いにくい語呂、助詞の不自然さ、同じ言い回しの重複、字余りです。
世界観とテーマ「${p.theme || ""}」は変えません。推敲後の歌詞だけを出力してください。

${p.lyrics || ""}`,
        json: false
      };
    case "titles":
      return {
        system: BASE,
        user: `テーマ「${p.theme || ""}」、ジャンル「${p.genre || ""}」、雰囲気「${p.mood || ""}」の楽曲に、
日本語の曲名を8つ考えてください。既存曲名と重複しない、短く覚えやすいものにします。
JSON で {"titles":["…","…"]} の形だけを返してください。`,
        json: true
      };
    case "style":
      return {
        system: `あなたは音楽生成AI（Suno）向けのスタイル指示文を書く専門家です。英語のカンマ区切り一行で、
ジャンル・音色・編成・テンポ・雰囲気・音作りを過不足なく並べます。説明は書きません。`,
        user: `次の条件を、Suno の Style 欄に貼れる英語一行のスタイル指示文にしてください。
現在の下書き: ${p.style || ""}
ジャンル: ${p.genre || ""} ／ 雰囲気: ${p.mood || ""} ／ ${p.bpm || ""}BPM ／ ${p.meter || ""} ／ key ${p.key || ""}
編成: ${p.formation || ""}（${mem}）
避けたい要素: ${p.negative || "なし"}
スタイル指示文だけを1行で返してください。`,
        json: false
      };
    case "review":
      return {
        system: `あなたは音楽制作チームの4人のスタッフです。
Takagi（経営・公開計画）、Ota（制作・歌詞と構成）、Nakao（開発・書き出しと技術）、Shun（分析・反応予測）。
それぞれの担当の立場から、実行できる具体的な指摘を1〜2文で述べます。褒めるだけの感想は書きません。`,
        user: `次の楽曲案をレビューしてください。

曲名: ${p.title || "(未定)"}
テーマ: ${p.theme || ""} ／ ジャンル: ${p.genre || ""} ／ 雰囲気: ${p.mood || ""}
テンポ: ${p.bpm || ""}BPM ／ ${p.meter || ""} ／ 編成: ${p.formation || ""}（${mem}）

歌詞:
${(p.lyrics || "").slice(0, 2500)}

JSON で {"reviews":[{"name":"Takagi","role":"経営","comment":"…"},…]} の形だけを返してください。4人分すべて含めます。`,
        json: true
      };
    case "yomi":
      return {
        system: `あなたは日本語の読み仮名を付ける校正者です。説明は書きません。`,
        user: `次の歌詞の各行に、ひらがなの読みを付けてください。
出力は1行につき「元の行 / よみがな」の形にし、[ ] の見出し行はそのまま残します。

${p.lyrics || ""}`,
        json: false
      };
    default:
      return null;
  }
}

/* ---------- 本体 ---------- */
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true, providers: available(),
      models: available().reduce((a, p) => (a[p] = MODELS[p], a), {}),
      message: available().length ? "接続できます" : "APIキーが未設定です（デモ動作）"
    });
  }
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "POST で呼んでください" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { task, payload = {}, provider } = body;
    const spec = buildTask(task, payload);
    if (!spec) return res.status(400).json({ ok: false, error: "task が不正です: " + task });

    const r = await ask(provider, spec.system, spec.user, spec.json);
    let data = null;
    if (spec.json) {
      const m = r.text.match(/\{[\s\S]*\}/);
      try { data = JSON.parse(m ? m[0] : r.text); } catch (e) { data = null; }
    }
    return res.status(200).json({ ok: true, provider: r.provider, model: r.model, text: r.text, data });
  } catch (e) {
    const noKey = e && e.code === "NO_KEY";
    return res.status(noKey ? 503 : 500).json({
      ok: false, code: noKey ? "NO_KEY" : "ERROR",
      error: String(e && e.message || e).slice(0, 500)
    });
  }
};
