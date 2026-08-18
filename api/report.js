/* ============================================================
   悠真AI：統括レポート（日報・週報）API
   URL: /api/report

   タスク・会議・制作物の状況をまとめて、
   社長がひと目で把握できる報告書を作ります。
   ============================================================ */

import { askProviders, availableProviders, buildContext, parseJson } from './_provider.js'

const SPANS = { day: '日報', week: '週報', month: '月報' }

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, available: availableProviders(), spans: Object.entries(SPANS).map(([k, v]) => ({ key: k, label: v })) })
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POSTでリクエストしてください' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { span = 'day', activity = null, context = null, note = '' } = body

    const spanLabel = SPANS[span] ?? '日報'
    const a = activity ?? {}

    /** 実績を文章にまとめます */
    const activityText = [
      `■ タスクの状況`,
      `全${a.taskTotal ?? 0}件（完了 ${a.taskDone ?? 0}／進行中 ${a.taskOpen ?? 0}／期限切れ ${a.taskLate ?? 0}）`,
      '',
      a.doneList?.length ? `■ 完了したタスク\n${a.doneList.map((t) => `・${t}`).join('\n')}` : '',
      a.openList?.length ? `■ 進行中のタスク\n${a.openList.map((t) => `・${t}`).join('\n')}` : '',
      a.lateList?.length ? `■ 期限切れのタスク\n${a.lateList.map((t) => `・${t}`).join('\n')}` : '',
      a.busyStaff?.length ? `■ 稼働中の社員\n${a.busyStaff.map((s) => `・${s}`).join('\n')}` : '',
      a.idleStaff?.length ? `■ 手空きの社員\n${a.idleStaff.join('、')}` : '',
      a.meetings?.length ? `■ 最近の会議\n${a.meetings.map((m) => `・${m}`).join('\n')}` : '',
      a.mediaCount ? `■ 制作物\nアップロード済みファイル ${a.mediaCount}件` : '',
      note.trim() ? `■ 社長からの補足\n${note.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const system = [
      'あなたは 悠真AI（リーダー・統括）です。社長のトシさんに提出する報告書を書きます。',
      `今回は「${spanLabel}」です。`,
      '',
      '【書き方のルール】',
      '・社長が忙しい前提で、結論から書きます。読むのに1分かからない量にします。',
      '・下の実績データに書かれていることだけを使います。数字を推測で作らないこと。',
      '・良かったことだけでなく、遅れや詰まっている点も正直に書きます。',
      '・「頑張りました」ではなく、何がどれだけ進んだかを具体的に書きます。',
      '・期限切れがあれば必ず触れ、どう取り戻すかを提案します。',
      '・手空きの社員がいれば、次に何を任せるかを提案します。',
      '・社長が今日（今週）判断すべきことを、はっきり挙げます。',
      '',
      '【会社の状況】',
      buildContext(context) || '（データ未登録）',
      '',
      '【出力形式】次のJSONだけを返してください。前後に説明やコードブロックは付けないこと。',
      `{
  "headline": "ひと言でいうと（30字以内）",
  "mood": "good|normal|warn",
  "summary": "全体の状況（3〜4文）",
  "progress": ["進んだこと1", "進んだこと2"],
  "concerns": ["気になること1", "気になること2"],
  "decisions": ["社長に判断してほしいこと1", "2"],
  "assignments": [{ "staff": "AI社員名", "task": "次に任せたい仕事" }],
  "tomorrow": ["次にやること1", "2", "3"]
}`,
    ].join('\n')

    const result = await askProviders(system, [{ role: 'user', content: `【実績データ】\n${activityText.slice(0, 6000)}` }], {
      maxTokens: 2200,
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
    if (!p) return res.status(502).json({ error: 'レポートを読み取れませんでした', code: 'BAD_FORMAT' })

    return res.status(200).json({
      span,
      spanLabel,
      headline: p.headline ?? '',
      mood: ['good', 'normal', 'warn'].includes(p.mood) ? p.mood : 'normal',
      summary: p.summary ?? '',
      progress: Array.isArray(p.progress) ? p.progress : [],
      concerns: Array.isArray(p.concerns) ? p.concerns : [],
      decisions: Array.isArray(p.decisions) ? p.decisions : [],
      assignments: Array.isArray(p.assignments) ? p.assignments : [],
      tomorrow: Array.isArray(p.tomorrow) ? p.tomorrow : [],
      provider: result.provider,
    })
  } catch (e) {
    return res.status(500).json({ error: 'サーバー内部エラー', detail: String(e?.message || e) })
  }
}
