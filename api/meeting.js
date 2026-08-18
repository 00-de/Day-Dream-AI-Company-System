/* ============================================================
   AI会議ルーム API（Vercel サーバーレス関数）
   URL: /api/meeting

   議題と参加するAI社員を受け取り、
   それぞれの担当に沿った発言・議事録・決定事項・タスクを返します。
   ============================================================ */

import { askProviders, availableProviders, buildContext, parseJson } from './_provider.js'

/** 会議の指示文をつくる */
function buildSystemPrompt(ctx, participants, rounds, humanOpinions) {
  const userName = ctx?.company?.presidentName || 'トシさん'
  const members = participants
    .map((p, i) => `${i + 1}. ${p.name}（${p.role}）`)
    .join('\n')

  const hasHuman = Array.isArray(humanOpinions) && humanOpinions.length > 0
  const humanBlock = hasHuman
    ? [
        '',
        '【会議前に集めた、人間スタッフの意見】',
        ...humanOpinions.map((h) => `・${h.name}（${h.title}）：${h.text}`),
        '',
        '【人間スタッフの意見の扱い方】',
        '・この意見は、実際に現場で動いている人が書いたものです。AI社員より現実の状況に詳しいと考えてください。',
        '・AI社員は必ず、誰かの意見に名前を挙げて言及します（「高木さんが言われた〜について」のように）。',
        '・賛同するだけでなく、実行するために足りない点や、具体化する方法を補います。',
        '・人間スタッフの意見と違う考えを述べる場合は、頭から否定せず、理由と代案を添えます。',
        '・現場の事情（会場・機材・人手・予算）に関わる指摘は、特に重く受け止めます。',
      ].join('\n')
    : ''

  return [
    'あなたは、DayDream AI株式会社の会議を進行する司会AIです。',
    `参加者は次のAI社員です。社長の${userName}が議長として同席しています。`,
    '',
    members,
    '',
    '【会議のつくり方】',
    `・全部で${rounds}巡、参加者が順番に発言します（合計 ${participants.length * rounds} 発言）。`,
    '・各発言は日本語で、2〜4文。自分の担当分野の視点で具体的に話します。',
    '・前の人の発言を受けて、賛成・補足・懸念・代案など、会話としてつながるようにします。',
    '・全員が同じ意見にならないようにします。立場の違いから来る意見の対立や、現実的な懸念も入れてください。',
    '・数字は下の「現在の状況」にあるものだけを使います。無い数字は作らないこと。',
    '・最後に議事録・決定事項・次にやることをまとめます。',
    '・次にやることは、必ず参加者の誰かを担当に割り当てます。',
    '・人間スタッフから出た意見のうち、対応が必要なものは「次にやること」に必ず入れます。',
    '',
    '【現在の状況】',
    buildContext(ctx) || '（データがまだ登録されていません）',
    humanBlock,
    '',
    '【出力形式】',
    '次のJSONだけを返してください。前後に説明文やコードブロックは付けないこと。',
    '{',
    '  "turns": [{ "speaker": "AI社員の名前", "text": "発言内容" }],',
    '  "summary": "会議全体の要約（3〜5文）",',
    '  "decisions": ["決定したこと1", "決定したこと2"],',
    '  "tasks": [{ "title": "やること", "assignee": "担当するAI社員の名前", "priority": "high|normal|low" }]',
    '}',
    '',
    'speaker と assignee は、上の参加者リストにある名前をそのまま使ってください。',
  ].join('\n')
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
    const { topic = '', participants = [], context = null, rounds = 2, note = '', humanOpinions = [] } = body

    if (!topic.trim()) {
      return res.status(400).json({ error: '議題を入力してください' })
    }
    if (!Array.isArray(participants) || participants.length < 2) {
      return res.status(400).json({ error: '参加するAI社員を2人以上選んでください' })
    }

    const safeRounds = Math.min(3, Math.max(1, Number(rounds) || 2))
    const cleanOpinions = (Array.isArray(humanOpinions) ? humanOpinions : [])
      .filter((h) => h && typeof h.text === 'string' && h.text.trim())
      .slice(0, 5)
      .map((h) => ({ name: h.name ?? '', title: h.title ?? '', text: h.text.trim().slice(0, 800) }))

    const system = buildSystemPrompt(context, participants.slice(0, 6), safeRounds, cleanOpinions)

    const userMessage = [
      `議題：${topic.trim()}`,
      note.trim() ? `補足：${note.trim()}` : '',
      cleanOpinions.length
        ? `※ 人間スタッフから${cleanOpinions.length}件の意見が出ています。必ず踏まえて議論してください。`
        : '',
      'この議題で会議を行い、指定のJSON形式で返してください。',
    ]
      .filter(Boolean)
      .join('\n')

    // 発言数に応じて必要な出力量を見積もります（足りないとJSONが途中で切れます）
    const needTokens = Math.min(8000, 1200 + participants.length * safeRounds * 260)

    let result = await askProviders(system, [{ role: 'user', content: userMessage }], {
      maxTokens: needTokens,
      heavy: true,
      json: true,
    })

    if (result.error === 'NO_KEY') {
      return res.status(503).json({ error: 'APIキーが設定されていません', detail: result.detail, code: 'NO_KEY' })
    }
    if (result.error) {
      return res.status(502).json({ error: 'AIへの接続に失敗しました', detail: result.detail, code: 'ALL_FAILED' })
    }

    let parsed = parseJson(result.text)

    // JSONが途中で切れた場合は、発言を短くして1回だけ作り直します
    if (!parsed || !Array.isArray(parsed.turns)) {
      const retry = await askProviders(
        system + '\n\n※ 各発言は必ず2文以内にして、JSON全体が途中で切れないようにしてください。',
        [{ role: 'user', content: userMessage }],
        { maxTokens: needTokens, heavy: true, json: false },
      )
      if (!retry.error) {
        result = retry
        parsed = parseJson(retry.text)
      }
    }

    if (!parsed || !Array.isArray(parsed.turns)) {
      return res.status(502).json({
        error: 'AIの回答を読み取れませんでした',
        // 実際に返ってきた内容の先頭を返します（原因調べ用）
        detail: `AIの返答（先頭400字）：${String(result.text || '').slice(0, 400)}`,
        code: 'BAD_FORMAT',
      })
    }

    return res.status(200).json({
      turns: parsed.turns.filter((t) => t && t.speaker && t.text),
      summary: parsed.summary || '',
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      provider: result.provider,
      model: result.model,
    })
  } catch (e) {
    return res.status(500).json({ error: 'サーバー内部エラー', detail: String(e?.message || e) })
  }
}
