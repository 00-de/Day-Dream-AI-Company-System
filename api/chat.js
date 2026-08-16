/* ============================================================
   AI秘書チャット API（Vercel サーバーレス関数）
   URL: /api/chat

   APIキーはこのサーバー側だけで読み込みます。
   ブラウザには絶対に出ないので、VITE_ 接頭辞は付けないでください。

   優先順： Groq → Gemini → OpenAI
   先に成功したものの答えを返します。
   ============================================================ */

/** 使えるプロバイダの設定 */
const PROVIDERS = [
  {
    name: 'groq',
    label: 'Groq',
    envKey: 'GROQ_API_KEY',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  },
  {
    name: 'gemini',
    label: 'Gemini',
    envKey: 'GEMINI_API_KEY',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },
  {
    name: 'openai',
    label: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
]

/** 会社の状況を、AIが読める短い文章にまとめる */
function buildContext(ctx) {
  if (!ctx) return ''
  const lines = []

  if (ctx.company) {
    lines.push(`会社名：${ctx.company.name} ／ 社長：${ctx.company.presidentName}`)
  }
  if (ctx.finance) {
    const f = ctx.finance
    lines.push(
      `今月の売上：${f.monthSales?.toLocaleString('ja-JP')}円（前月比 ${f.monthSalesDiff}）` +
        ` ／ 利益：${f.monthProfit?.toLocaleString('ja-JP')}円（前月比 ${f.monthProfitDiff}）` +
        ` ／ 目標 ${f.goal?.toLocaleString('ja-JP')}円に対して達成率 ${f.goalRate}%、残り${f.daysLeft}日`,
    )
  }
  if (Array.isArray(ctx.schedule) && ctx.schedule.length) {
    lines.push('今日の予定：' + ctx.schedule.map((s) => `${s.time} ${s.title}`).join(' / '))
  }
  if (Array.isArray(ctx.projects) && ctx.projects.length) {
    lines.push('プロジェクト進捗：' + ctx.projects.map((p) => `${p.name} ${p.progress}%`).join(' / '))
  }
  if (ctx.staffSummary) {
    const s = ctx.staffSummary
    lines.push(
      `AI社員：全${s.total}人（稼働中${s.active}人 / 待機中${s.standby}人 / メンテ中${s.maintenance}人、稼働率${s.rate}%）`,
    )
  }
  if (Array.isArray(ctx.staffList) && ctx.staffList.length) {
    lines.push('AI社員の担当：' + ctx.staffList.map((s) => `${s.name}(${s.role})`).join('、'))
  }
  if (ctx.nextLive) {
    const l = ctx.nextLive
    const rest = (l.checks || []).filter((c) => !c.done).map((c) => c.label)
    lines.push(
      `次回ライブ：${l.date} ${l.title}（${l.venue}）準備進捗${l.progress}%` +
        (rest.length ? ` ／ 残タスク：${rest.join('・')}` : ' ／ 準備完了'),
    )
  }
  if (ctx.youtube) {
    const y = ctx.youtube
    lines.push(
      `YouTube：登録者${y.subscribers}人（${y.subscribersDiff}）／ 総再生${y.views}回 ／ 総視聴時間${y.watchHours}時間`,
    )
  }
  if (Array.isArray(ctx.songs) && ctx.songs.length) {
    lines.push('最近の楽曲：' + ctx.songs.map((s) => s.title).join('、'))
  }
  if (Array.isArray(ctx.notices) && ctx.notices.length) {
    lines.push('お知らせ：' + ctx.notices.map((n) => n.title).join(' / '))
  }

  return lines.join('\n')
}

/** AIへの指示文をつくる */
function buildSystemPrompt(ctx, persona) {
  const who = persona?.name || 'AI秘書'
  const role = persona?.role || 'スケジュール管理・社長の補佐'
  const userName = ctx?.company?.presidentName || 'トシさん'

  return [
    `あなたは「${who}」です。担当は「${role}」。`,
    `DayDream AI株式会社で働くAI社員として、社長の${userName}を補佐します。`,
    '',
    '【話し方のルール】',
    '・必ず日本語で答えます。',
    '・親しみやすく、前向きで、簡潔に。基本は3〜5文以内。',
    '・箇条書きが分かりやすい場面では箇条書きを使います。',
    '・数字を答えるときは、下の「現在の状況」の数字をそのまま使います。推測で数字を作らないこと。',
    '・「現在の状況」に書かれていないことを聞かれたら、正直に分からないと伝え、どこを見れば分かるかを案内します。',
    '・専門用語は避け、パソコンが得意でない人にも伝わる言葉を選びます。',
    '',
    '【現在の状況】',
    buildContext(ctx) || '（データがまだ登録されていません）',
  ].join('\n')
}

/* ── 各プロバイダの呼び出し ───────────────────────── */

async function callGroq(key, model, system, messages) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 800,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  })
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = await res.json()
  const text = json?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Groqの応答が空でした')
  return text
}

async function callGemini(key, model, system, messages) {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = await res.json()
  const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim()
  if (!text) throw new Error('Geminiの応答が空でした')
  return text
}

async function callOpenAI(key, model, system, messages) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 800,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const json = await res.json()
  const text = json?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenAIの応答が空でした')
  return text
}

/* ── 本体 ─────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // 設定確認用：どのAIが使える状態かを返します（キーの中身は返しません）
    return res.status(200).json({
      ok: true,
      available: PROVIDERS.filter((p) => Boolean(process.env[p.envKey])).map((p) => p.label),
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POSTでリクエストしてください' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { messages = [], context = null, persona = null } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages が空です' })
    }

    // 直近12往復だけ送る（費用と速度のため）
    const trimmed = messages
      .filter((m) => m && typeof m.content === 'string' && m.content.trim())
      .slice(-24)
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))

    const system = buildSystemPrompt(context, persona)

    const errors = []
    for (const p of PROVIDERS) {
      const key = process.env[p.envKey]
      if (!key) continue
      try {
        let reply
        if (p.name === 'groq') reply = await callGroq(key, p.model, system, trimmed)
        else if (p.name === 'gemini') reply = await callGemini(key, p.model, system, trimmed)
        else reply = await callOpenAI(key, p.model, system, trimmed)

        return res.status(200).json({ reply, provider: p.label, model: p.model })
      } catch (e) {
        errors.push(`${p.label}: ${e.message}`)
      }
    }

    if (errors.length === 0) {
      return res.status(503).json({
        error: 'APIキーが設定されていません',
        detail:
          'Vercelの Settings → Environment Variables に GROQ_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY のいずれかを登録し、再デプロイしてください。',
        code: 'NO_KEY',
      })
    }

    return res.status(502).json({
      error: 'AIへの接続に失敗しました',
      detail: errors.join(' / '),
      code: 'ALL_FAILED',
    })
  } catch (e) {
    return res.status(500).json({ error: 'サーバー内部エラー', detail: String(e?.message || e) })
  }
}
