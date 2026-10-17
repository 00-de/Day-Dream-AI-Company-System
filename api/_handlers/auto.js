/* ============================================================
   AI社員の自動作業 API
   URL: /api?fn=auto&job=<仕事の種類>&key=<合言葉>

   GitHub Actions が決まった時刻に呼び出します。
   人がログインしていなくても、AI社員が勝手に作業を進めます。

   【用意している仕事】
   ・daily-report  … 悠真AIが日報を作る（毎朝7時）
   ・weekly-report … 悠真AIが週報を作る（毎週月曜）
   ・overdue-check … 期限切れタスクを見つけてお知らせに出す

   【安全のしくみ】
   合言葉（AUTO_TASK_SECRET）が一致しないと動きません。
   URLを知られても、合言葉がなければ実行できません。
   ============================================================ */

import { askProviders, buildContext, parseJson } from '../_provider.js'
import { getDb, readDashboard, readCollection, addNotice } from '../_admin.js'

/** 期限切れかどうか */
function isOverdue(task) {
  if (!task || task.status === 'done' || !task.due) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(task.due) < today
}

/** AIに渡す「会社の状況」を組み立てます */
function buildAppContext(data) {
  if (!data) return null
  return {
    company: data.company,
    finance: data.finance,
    schedule: data.schedule,
    projects: data.projects,
    notices: (data.notices ?? []).map((n) => ({ title: n.title })),
    songs: (data.songs ?? []).map((s) => ({ title: s.title })),
    youtube: data.youtube,
    nextLive: data.nextLive,
    staffList: (data.staff ?? []).map((s) => ({ name: s.name, role: s.role })),
  }
}

/** 実績を集めます */
function collectActivity(data, tasks, meetings, media) {
  const staff = data?.staff ?? []
  const nameOf = (id) => staff.find((s) => s.id === id)?.name ?? '担当なし'

  const done = tasks.filter((t) => t.status === 'done')
  const open = tasks.filter((t) => t.status !== 'done')
  const late = tasks.filter(isOverdue)
  const idle = staff.filter((s) => !tasks.some((t) => t.assignee === s.id && t.status !== 'done'))

  return {
    late,
    text: [
      `■ タスクの状況`,
      `全${tasks.length}件（完了 ${done.length}／進行中 ${open.length}／期限切れ ${late.length}）`,
      '',
      done.length ? `■ 完了したタスク\n${done.slice(0, 12).map((t) => `・${t.title}（${nameOf(t.assignee)}）`).join('\n')}` : '',
      open.length ? `■ 進行中のタスク\n${open.slice(0, 12).map((t) => `・${t.title}（${nameOf(t.assignee)}／期限 ${t.due || '未設定'}）`).join('\n')}` : '',
      late.length ? `■ 期限切れのタスク\n${late.slice(0, 8).map((t) => `・${t.title}（${nameOf(t.assignee)}／期限 ${t.due}）`).join('\n')}` : '',
      idle.length ? `■ 手空きの社員\n${idle.slice(0, 12).map((s) => `${s.name}（${s.role}）`).join('、')}` : '',
      meetings.length ? `■ 最近の会議\n${meetings.slice(0, 5).map((m) => `・${m.topic}`).join('\n')}` : '',
      `■ 制作物\nアップロード済みファイル ${media.length}件`,
    ]
      .filter(Boolean)
      .join('\n'),
  }
}

/* ── 仕事①②：日報・週報をつくる ───────────────── */
async function makeReport(db, span) {
  const spanLabel = span === 'week' ? '週報' : '日報'
  const data = await readDashboard(db)
  const tasks = await readCollection(db, 'tasks')
  const meetings = await readCollection(db, 'meetings', 20)
  const media = await readCollection(db, 'media', 300)

  const activity = collectActivity(data, tasks, meetings, media)

  const system = [
    'あなたは 悠真AI（リーダー・統括）です。社長のトシさんに提出する報告書を書きます。',
    `今回は「${spanLabel}」です。社長はまだこれを読んでいません。朝いちばんに目を通します。`,
    '',
    '【書き方のルール】',
    '・結論から書きます。読むのに1分かからない量にします。',
    '・下の実績データに書かれていることだけを使います。数字を推測で作らないこと。',
    '・良かったことだけでなく、遅れや詰まっている点も正直に書きます。',
    '・期限切れがあれば必ず触れ、どう取り戻すかを提案します。',
    '・手空きの社員がいれば、次に何を任せるかを提案します。',
    '・社長が今日（今週）判断すべきことを、はっきり挙げます。',
    '',
    '【会社の状況】',
    buildContext(buildAppContext(data)) || '（データ未登録）',
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

  const result = await askProviders(system, [{ role: 'user', content: `【実績データ】\n${activity.text.slice(0, 6000)}` }], {
    maxTokens: 2200,
    heavy: true,
    json: true,
  })

  if (result.error) throw new Error(`AIに接続できませんでした：${result.detail}`)

  const p = parseJson(result.text)
  if (!p) throw new Error('レポートを読み取れませんでした')

  const now = new Date()
  const id = `${span}-${now.toISOString().slice(0, 10)}`

  // レポートを保存します（同じ日に2回動いても上書きされるだけです）
  await db.collection('reports').doc(id).set({
    id,
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
    auto: true,
    provider: result.provider,
    createdAt: now.toISOString(),
  })

  // 社長が気づけるよう、お知らせにも出します
  const icon = p.mood === 'warn' ? '⚠️' : '📋'
  await addNotice(db, {
    icon,
    title: `悠真AIが${spanLabel}を作成しました：${p.headline ?? ''}`,
    tone: p.mood === 'warn' ? 'warn' : 'info',
  })

  return { ok: true, job: `${span}-report`, headline: p.headline, provider: result.provider }
}

/* ── 仕事③：期限切れを見つけて知らせる ───────────── */
async function checkOverdue(db) {
  const data = await readDashboard(db)
  const tasks = await readCollection(db, 'tasks')
  const staff = data?.staff ?? []
  const late = tasks.filter(isOverdue)

  if (late.length === 0) {
    return { ok: true, job: 'overdue-check', late: 0, message: '期限切れはありません' }
  }

  const nameOf = (id) => staff.find((s) => s.id === id)?.name ?? '担当なし'
  const list = late.slice(0, 5).map((t) => `${t.title}（${nameOf(t.assignee)}）`).join('、')

  await addNotice(db, {
    icon: '⏰',
    title: `期限切れのタスクが${late.length}件あります：${list}`,
    tone: 'warn',
  })

  return { ok: true, job: 'overdue-check', late: late.length }
}

/* ── 本体 ─────────────────────────────────────── */
export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`)
  const job = url.searchParams.get('job') || 'daily-report'

  // 合言葉の確認（これが無いと誰でも実行できてしまいます）
  const secret = process.env.AUTO_TASK_SECRET
  const given = req.headers['x-auto-key'] || url.searchParams.get('key') || ''

  if (!secret) {
    return res.status(503).json({
      error: '自動実行の合言葉が設定されていません',
      detail: 'Vercelの環境変数に AUTO_TASK_SECRET を登録してください。',
      code: 'NO_SECRET',
    })
  }
  if (given !== secret) {
    return res.status(401).json({ error: '合言葉が違います', code: 'BAD_KEY' })
  }

  const db = getDb()
  if (!db) {
    return res.status(503).json({
      error: 'Firebaseのサーバー用の鍵が設定されていません',
      detail: 'Vercelの環境変数に FIREBASE_SERVICE_ACCOUNT を登録してください。',
      code: 'NO_ADMIN',
    })
  }

  try {
    if (job === 'daily-report') return res.status(200).json(await makeReport(db, 'day'))
    if (job === 'weekly-report') return res.status(200).json(await makeReport(db, 'week'))
    if (job === 'overdue-check') return res.status(200).json(await checkOverdue(db))

    return res.status(400).json({
      error: '知らない仕事です',
      detail: 'job には daily-report / weekly-report / overdue-check のいずれかを指定してください。',
    })
  } catch (e) {
    return res.status(500).json({ error: '自動作業に失敗しました', detail: String(e?.message || e) })
  }
}
