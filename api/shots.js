/* ============================================================
   MV絵コンテ生成 API（Vercel サーバーレス関数）
   URL: /api/shots

   曲の情報から「5秒×◯枚」のカット割りを作り、
   各カットの英語プロンプトまで一気に用意します。
   ============================================================ */

import { askProviders, availableProviders, buildContext, parseJson } from './_provider.js'

/** 秒数を 0:05 の形にする */
function toTime(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, available: availableProviders() })
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POSTでリクエストしてください' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const {
      title = '',
      lyrics = '',
      mood = '',
      shotCount = 48,
      secondsPerShot = 5,
      style = 'anime',
      context = null,
    } = body

    if (!title.trim() && !lyrics.trim() && !mood.trim()) {
      return res.status(400).json({ error: '曲名か歌詞か雰囲気のいずれかを入力してください' })
    }

    const count = Math.min(90, Math.max(4, Number(shotCount) || 48))
    const per = Math.min(15, Math.max(2, Number(secondsPerShot) || 5))

    const styleGuide =
      style === 'photo'
        ? 'cinematic photorealistic style, shallow depth of field'
        : style === 'illust'
          ? 'digital illustration, painterly, soft brush strokes'
          : 'high quality anime style, clean lineart, cel shading'

    const system = [
      `あなたは DayDream AI株式会社の映像ディレクターです。${per}秒ずつ静止画を切り替えるMVの絵コンテを作ります。`,
      '',
      '【作り方のルール】',
      `・全部で ${count} カット。1カット ${per} 秒なので、曲全体は約 ${Math.round((count * per) / 60)} 分です。`,
      '・イントロ→1番→サビ→2番→サビ→ラストの流れで、感情の起伏をつけます。',
      '・promptは必ず英語で書きます。画像生成AIは英語のほうが正確なためです。',
      `・すべてのpromptの末尾に、必ず「${styleGuide}」を含めて絵柄をそろえます。`,
      '・promptは「構図, 被写体, 動き, 服装, 背景, 照明, 画風」の順に、カンマ区切りで並べます。',
      '・連続するカットは、背景や時間帯を急に変えないこと。少しずつ変化させて流れを作ります。',
      '・サビのカットは、引きの構図で5人全員が映る絵を入れます。',
      '・実在の人物名やアーティスト名、ブランド名は入れません。',
      '・sceneは日本語で、何が映っているかを一言で書きます。',
      '',
      '【会社の状況】',
      buildContext(context) || '（データ未登録）',
      '',
      '【出力形式】',
      '次のJSONだけを返してください。前後に説明やコードブロックは付けないこと。',
      `{
  "title": "MVのタイトル",
  "concept": "全体のコンセプト（2〜3文）",
  "negative": "全カット共通で避けたい要素の英語指定",
  "aspect": "16:9",
  "shots": [
    { "no": 1, "section": "イントロ", "scene": "日本語の説明", "prompt": "english prompt" }
  ]
}`,
      `shots は必ず ${count} 個ちょうど作ってください。`,
    ].join('\n')

    const userMessage = [
      title.trim() ? `曲名：${title.trim()}` : '',
      mood.trim() ? `雰囲気：${mood.trim()}` : '',
      lyrics.trim() ? `歌詞：\n${lyrics.trim().slice(0, 2000)}` : '',
      `${count}カット分の絵コンテを作ってください。`,
    ]
      .filter(Boolean)
      .join('\n')

    const result = await askProviders(system, [{ role: 'user', content: userMessage }], {
      maxTokens: 8000,
      json: true,
    })

    if (result.error === 'NO_KEY') {
      return res.status(503).json({ error: 'APIキーが設定されていません', detail: result.detail, code: 'NO_KEY' })
    }
    if (result.error) {
      return res.status(502).json({ error: 'AIへの接続に失敗しました', detail: result.detail, code: 'ALL_FAILED' })
    }

    const parsed = parseJson(result.text)
    if (!parsed || !Array.isArray(parsed.shots) || parsed.shots.length === 0) {
      return res.status(502).json({ error: '絵コンテを読み取れませんでした。もう一度お試しください', code: 'BAD_FORMAT' })
    }

    // 時間を計算して付け足します
    const shots = parsed.shots.slice(0, count).map((s, i) => ({
      no: i + 1,
      section: s.section ?? '',
      scene: s.scene ?? '',
      prompt: s.prompt ?? '',
      start: toTime(i * per),
      end: toTime((i + 1) * per),
    }))

    return res.status(200).json({
      title: parsed.title || title,
      concept: parsed.concept || '',
      negative: parsed.negative || '',
      aspect: parsed.aspect || '16:9',
      secondsPerShot: per,
      shots,
      provider: result.provider,
    })
  } catch (e) {
    return res.status(500).json({ error: 'サーバー内部エラー', detail: String(e?.message || e) })
  }
}
