/* ============================================================
   AI社員に仕事を依頼する（全23人共通）
   URL: /api?fn=ask

   どのAI社員にも、担当分野に沿った仕事を頼めます。
   専用機能を持つ社員（陽太AI・葵AIなど）は、
   そちらの画面に案内します。
   ============================================================ */

import { askProviders, availableProviders, buildContext, parseJson } from '../_provider.js'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, available: availableProviders() })
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POSTでリクエストしてください' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { staff = null, request = '', context = null, extra = '' } = body

    if (!staff || !staff.name) return res.status(400).json({ error: '依頼するAI社員が指定されていません' })
    if (!request.trim()) return res.status(400).json({ error: '依頼内容を入力してください' })

    const system = [
      `あなたは「${staff.name}」です。担当は「${staff.role}」。`,
      'DayDream AI株式会社で働くAI社員として、社長から仕事を依頼されました。',
      '',
      '【仕事の進め方】',
      '・自分の担当分野の専門家として答えます。担当外のことは、正直に「専門外ですが」と断ってから答えます。',
      '・「頑張ります」ではなく、実際の成果物を出します。案・文章・手順・表など、そのまま使える形にします。',
      '・数字は下の「会社の状況」にあるものだけを使います。推測で数字を作らないこと。',
      '・分からないことは正直に分からないと言い、何を調べれば分かるかを示します。',
      '・専門用語は避け、パソコンが得意でない人にも伝わる言葉を選びます。',
      '・成果物は日本語で作ります。',
      '',
      '【会社の状況】',
      buildContext(context) || '（データ未登録）',
      extra.trim() ? `\n【補足の条件】\n${extra.trim()}` : '',
      '',
      '【出力形式】次のJSONだけを返してください。前後に説明やコードブロックは付けないこと。',
      `{
  "answer": "依頼への回答（結論から書く。3〜6文）",
  "deliverable": "成果物の本文（案・文章・表など。無い場合は空文字）",
  "points": ["押さえておきたい点1", "点2"],
  "nextTasks": ["次にやるとよいこと1", "2"],
  "needMore": ["判断のために教えてほしいこと（無ければ空配列）"]
}`,
    ].join('\n')

    const result = await askProviders(system, [{ role: 'user', content: `依頼：${request.trim()}` }], {
      maxTokens: 2600,
      heavy: true,
      json: true,
    })

    if (result.error === 'NO_KEY') {
      return res.status(503).json({ error: 'APIキーが設定されていません', detail: result.detail, code: 'NO_KEY' })
    }
    if (result.error) {
      return res.status(502).json({ error: 'AIへの接続に失敗しました', detail: result.detail, code: 'ALL_FAILED' })
    }

    const p = parseJson(result.text)
    if (!p) {
      // JSONで返らなかった場合は、そのまま文章として返します
      return res.status(200).json({
        staff: staff.name,
        answer: result.text,
        deliverable: '',
        points: [],
        nextTasks: [],
        needMore: [],
        provider: result.provider,
      })
    }

    return res.status(200).json({
      staff: staff.name,
      answer: p.answer ?? '',
      deliverable: p.deliverable ?? '',
      points: Array.isArray(p.points) ? p.points : [],
      nextTasks: Array.isArray(p.nextTasks) ? p.nextTasks : [],
      needMore: Array.isArray(p.needMore) ? p.needMore : [],
      provider: result.provider,
    })
  } catch (e) {
    return res.status(500).json({ error: 'サーバー内部エラー', detail: String(e?.message || e) })
  }
}
