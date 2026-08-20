/* ============================================================
   全社員の意見収集 API（Vercel サーバーレス関数）
   URL: /api/opinions

   会議に参加していないAI社員に、決まった内容への意見を聞きます。
   全員分をまとめて1回のリクエストで取得します。
   ============================================================ */

import { askProviders, availableProviders, buildContext, parseJson } from '../_provider.js'

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
      topic = '',
      summary = '',
      decisions = [],
      members = [],
      humanOpinions = [],
      context = null,
    } = body

    if (!topic.trim()) return res.status(400).json({ error: '議題がありません' })
    if (!Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: '意見を聞く相手がいません' })
    }

    const list = members.slice(0, 24)

    const system = [
      'あなたは、DayDream AI株式会社の全社員から意見を集める集計AIです。',
      '会議に参加していなかった社員に、決まった内容を伝えて感想を聞く場面です。',
      '',
      '【意見を聞く相手】',
      ...list.map((m, i) => `${i + 1}. ${m.name}（${m.role}）`),
      '',
      '【書き方のルール】',
      '・全員分、それぞれの担当分野の視点から書きます。日本語で2〜3文。',
      '・全員が賛成では意味がありません。担当上どうしても引っかかる人は、はっきり懸念を述べます。',
      '・stance は次の3つから選びます： agree（賛成）／ conditional（条件付き賛成）／ concern（懸念あり）',
      '・目安として、agree 半分、conditional 3割、concern 2割くらいの割合にします。',
      '・懸念を書くときは、必ず「代わりにこうすれば」という提案を添えます。',
      '・自分の担当と関係が薄い議題なら、正直に「専門外だが」と前置きして一般的な感想を述べます。',
      '・数字は下の「現在の状況」にあるものだけを使い、作らないこと。',
      '',
      '【現在の状況】',
      buildContext(context) || '（データ未登録）',
      humanOpinions.length
        ? '\n【人間スタッフの意見】\n' + humanOpinions.map((h) => `・${h.name}：${h.text}`).join('\n')
        : '',
      '',
      '【出力形式】',
      '次のJSONだけを返してください。前後に説明やコードブロックは付けないこと。',
      `{
  "opinions": [
    { "name": "社員名", "stance": "agree", "text": "意見（2〜3文）" }
  ]
}`,
      `opinions は ${list.length} 件ちょうど、上のリストの名前をそのまま使って作ってください。`,
    ].join('\n')

    const userMessage = [
      `議題：${topic.trim()}`,
      summary.trim() ? `会議の結論：${summary.trim()}` : '',
      Array.isArray(decisions) && decisions.length ? `決定事項：\n${decisions.map((d) => `・${d}`).join('\n')}` : '',
      'この内容について、全員から意見を集めてください。',
    ]
      .filter(Boolean)
      .join('\n')

    const result = await askProviders(system, [{ role: 'user', content: userMessage }], {
      maxTokens: 4000,
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
    if (!parsed || !Array.isArray(parsed.opinions)) {
      return res.status(502).json({ error: '意見を読み取れませんでした', code: 'BAD_FORMAT' })
    }

    const stances = ['agree', 'conditional', 'concern']
    const opinions = parsed.opinions
      .filter((o) => o && o.name && o.text)
      .map((o) => ({
        name: String(o.name),
        stance: stances.includes(o.stance) ? o.stance : 'agree',
        text: String(o.text),
      }))

    return res.status(200).json({ opinions, provider: result.provider })
  } catch (e) {
    return res.status(500).json({ error: 'サーバー内部エラー', detail: String(e?.message || e) })
  }
}
