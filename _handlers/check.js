/* ============================================================
   澪AI：公開前チェック API
   URL: /api/check

   歌詞・告知文・投稿文などを公開する前に、
   誤字・不適切表現・事実確認が必要な点を洗い出します。
   ============================================================ */

import { askProviders, availableProviders, buildContext, parseJson } from '../_provider.js'

const KINDS = {
  post: 'SNS投稿文',
  lyrics: '歌詞',
  news: 'お知らせ・告知文',
  mail: 'メール・依頼文',
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      available: availableProviders(),
      kinds: Object.entries(KINDS).map(([k, v]) => ({ key: k, label: v })),
    })
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POSTでリクエストしてください' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { text = '', kind = 'post', context = null } = body

    if (!text.trim()) return res.status(400).json({ error: 'チェックする文章を入力してください' })

    const kindLabel = KINDS[kind] ?? 'テキスト'

    const system = [
      'あなたは 澪AI（品質管理担当）です。公開前の文章をチェックします。',
      `対象は「${kindLabel}」です。`,
      '',
      '【チェックする観点】',
      '1. 誤字脱字・変換ミス（「以外」と「意外」など）',
      '2. 文法や言葉づかいの誤り、二重敬語',
      '3. 読みにくい表現（一文が長すぎる、主語が抜けているなど）',
      '4. 誰かを傷つける可能性のある表現、差別的にとられかねない言葉',
      '5. 事実確認が必要な箇所（日付・場所・料金・人数など具体的な情報）',
      '6. 個人情報の書きすぎ（住所・電話番号・本名など）',
      '7. 著作権に触れる可能性（他人の歌詞やキャッチコピーの引用など）',
      '',
      '【判定の付け方】',
      '・重要度は high（公開前に必ず直す）／ medium（直したほうがよい）／ low（好みの問題）',
      '・見つからない場合は、無理に指摘を作らないこと。issues を空にして構いません。',
      '・「◯◯かもしれません」ではなく、どこをどう直すか具体的に書きます。',
      '・修正案は、元の文の雰囲気を壊さない形にします。',
      '',
      '【現在の状況（事実確認に使います）】',
      buildContext(context) || '（データ未登録）',
      '',
      '会社のデータと食い違う数字や日付があれば、必ず指摘してください。',
      '',
      '【出力形式】次のJSONだけを返してください。前後に説明やコードブロックは付けないこと。',
      `{
  "verdict": "ok|caution|stop",
  "summary": "全体の評価（1〜2文）",
  "issues": [
    {
      "level": "high|medium|low",
      "category": "誤字|表現|事実確認|配慮|権利|個人情報",
      "quote": "問題のある箇所（元の文からそのまま抜き出す）",
      "reason": "なぜ直したほうがよいか",
      "fix": "修正案"
    }
  ],
  "corrected": "すべての指摘を反映した修正版の全文",
  "good": ["良かった点1", "良かった点2"]
}`,
      'verdict は、highの指摘があれば stop、mediumのみなら caution、指摘なしなら ok にします。',
    ].join('\n')

    const result = await askProviders(
      system,
      [{ role: 'user', content: `【チェック対象の文章】\n${text.trim().slice(0, 6000)}` }],
      { maxTokens: 3000, json: true },
    )

    if (result.error === 'NO_KEY') {
      return res.status(503).json({ error: 'APIキーが設定されていません', detail: result.detail, code: 'NO_KEY' })
    }
    if (result.error) {
      return res.status(502).json({ error: 'AIへの接続に失敗しました', detail: result.detail, code: 'ALL_FAILED' })
    }

    const parsed = parseJson(result.text)
    if (!parsed) {
      return res.status(502).json({ error: 'チェック結果を読み取れませんでした', code: 'BAD_FORMAT' })
    }

    const issues = Array.isArray(parsed.issues) ? parsed.issues : []
    const levels = ['high', 'medium', 'low']

    return res.status(200).json({
      verdict: ['ok', 'caution', 'stop'].includes(parsed.verdict) ? parsed.verdict : 'caution',
      summary: parsed.summary ?? '',
      issues: issues.map((i) => ({
        level: levels.includes(i.level) ? i.level : 'medium',
        category: i.category ?? '表現',
        quote: i.quote ?? '',
        reason: i.reason ?? '',
        fix: i.fix ?? '',
      })),
      corrected: parsed.corrected ?? '',
      good: Array.isArray(parsed.good) ? parsed.good : [],
      counts: {
        high: issues.filter((i) => i.level === 'high').length,
        medium: issues.filter((i) => i.level === 'medium').length,
        low: issues.filter((i) => i.level === 'low').length,
      },
      provider: result.provider,
    })
  } catch (e) {
    return res.status(500).json({ error: 'サーバー内部エラー', detail: String(e?.message || e) })
  }
}
