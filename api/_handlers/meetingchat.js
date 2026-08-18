/* ============================================================
   会議ルームの発言 API
   URL: /api/meetingchat

   会議中に人間が発言したとき、参加しているAI社員が
   その場で応答します（1〜3人が返します）。
   ============================================================ */

import { askProviders, availableProviders, buildContext, parseJson } from '../_provider.js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, available: availableProviders() })
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POSTでリクエストしてください' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const {
      topic = '',
      participants = [],
      history = [],
      speaker = { name: '社長', title: '社長' },
      message = '',
      // 複数人がまとめて発言する場合はこちらを使います
      messages = [],
      replyCount = 2,
      context = null,
    } = body

    // 複数人の発言をまとめます（1人だけの場合も同じ形にそろえます）
    const speeches = (Array.isArray(messages) && messages.length > 0
      ? messages
      : [{ name: speaker.name, title: speaker.title, text: message }]
    )
      .filter((m) => m && typeof m.text === 'string' && m.text.trim())
      .slice(0, 3)
      .map((m) => ({
        name: m.name ?? '社長',
        title: m.title ?? '',
        text: m.text.trim().slice(0, 1500),
      }))

    if (speeches.length === 0) return res.status(400).json({ error: '発言を入力してください' })
    if (!Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ error: '参加しているAI社員がいません' })
    }

    const members = participants.slice(0, 6)
    const n = Math.min(3, Math.max(1, Number(replyCount) || 2))

    // これまでの会議の流れ（直近だけ渡します）
    const flow = history
      .slice(-14)
      .map((t) => `${t.speaker}${t.human ? '（人間）' : ''}：${t.text}`)
      .join('\n')

    const system = [
      'あなたは、DayDream AI株式会社の会議を進行する司会AIです。',
      `議題は「${topic}」です。いま会議中で、人間の参加者${
        speeches.length > 1 ? `${speeches.length}名` : ''
      }が発言しました。`,
      '',
      '【参加しているAI社員】',
      ...members.map((p, i) => `${i + 1}. ${p.name}（${p.role}）`),
      '',
      '【応答の作り方】',
      `・上の中から、この発言に答えるべき ${n} 人を選んで発言させます。`,
      '・選ぶ基準は、発言の内容にいちばん関係が深い担当かどうかです。',
      '・各発言は日本語で2〜4文。担当分野の視点で、具体的に答えます。',
      '・人間の発言には必ず正面から答えます。話をそらさないこと。',
      speeches.length > 1
        ? `・${speeches.length}名が発言しています。全員の発言に触れ、誰の意見かを名前を挙げて明示します。意見が食い違う場合は、その違いを整理したうえで折り合いのつけ方を示します。`
        : '',
      '・現場の事情（会場・機材・人手・予算）に関わる指摘は重く受け止め、実現するために何が要るかを補います。',
      '・違う考えを述べる場合も、頭から否定せず、理由と代案を添えます。',
      '・数字は下の「現在の状況」にあるものだけを使い、作らないこと。',
      '・これまでの会議の流れと矛盾しないようにします。',
      '',
      '【これまでの会議の流れ】',
      flow || '（まだ発言はありません）',
      '',
      '【現在の状況】',
      buildContext(context) || '（データ未登録）',
      '',
      '【出力形式】次のJSONだけを返してください。前後に説明やコードブロックは付けないこと。',
      `{ "replies": [{ "speaker": "AI社員の名前", "text": "発言内容" }] }`,
      'speaker は、上の参加者リストにある名前をそのまま使ってください。',
    ].join('\n')

    const userMessage = speeches
      .map((sp) => `${sp.name}（${sp.title}）の発言：\n${sp.text}`)
      .join('\n\n')

    const result = await askProviders(system, [{ role: 'user', content: userMessage }], {
      maxTokens: 400 + n * 300 + speeches.length * 150,
      heavy: true,
      json: true,
    })

    if (result.error === 'NO_KEY') {
      return res.status(503).json({ error: 'APIキーが設定されていません', detail: result.detail, code: 'NO_KEY' })
    }
    if (result.error) {
      return res.status(502).json({ error: 'AIへの接続に失敗しました', detail: result.detail, code: 'ALL_FAILED' })
    }

    const parsed = parseJson(result.text)
    if (!parsed || !Array.isArray(parsed.replies)) {
      return res.status(502).json({
        error: '応答を読み取れませんでした',
        detail: `AIの返答（先頭300字）：${String(result.text || '').slice(0, 300)}`,
        code: 'BAD_FORMAT',
      })
    }

    return res.status(200).json({
      replies: parsed.replies.filter((r) => r && r.speaker && r.text).slice(0, 3),
      provider: result.provider,
    })
  } catch (e) {
    return res.status(500).json({ error: 'サーバー内部エラー', detail: String(e?.message || e) })
  }
}
