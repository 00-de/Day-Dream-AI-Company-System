import type { AppData } from '../types'
import { buildContext } from './ai'

/* ============================================================
   AI社員に実務をさせる（ブラウザ側）
   検索APIのキーはサーバー側（/api/agent）だけが持っています
   ============================================================ */

export type JobKey = 'venue' | 'sponsor' | 'research'

export interface AgentItem {
  name: string
  place?: string
  capacity?: string
  cost?: string
  note?: string
  source?: string
  confidence?: 'high' | 'medium' | 'low'
}

export interface AgentResult {
  job: JobKey
  label: string
  staff: string
  queries: string[]
  engines: string[]
  summary: string
  items: AgentItem[]
  draft: string
  nextSteps: string[]
  sourceCount: number
  provider: string
  error?: string
  /** 失敗したときの詳しい内容（原因調べ用） */
  detail?: string
}

export const JOB_INFO: Record<JobKey, { label: string; staffId: string; hint: string; icon: string }> = {
  venue: {
    label: 'ライブ会場をさがす',
    staffId: 'sales',
    hint: '例：岐阜県と愛知県で、300人規模のライブができるホールを探して',
    icon: '🎤',
  },
  sponsor: {
    label: 'スポンサー候補をさがす',
    staffId: 'sales',
    hint: '例：岐阜県内で、地域の音楽イベントに協賛してくれそうな企業を探して',
    icon: '🤝',
  },
  research: {
    label: '調べてメモを作る',
    staffId: 'researcher',
    hint: '例：インディーズバンドがYouTube登録者を増やす方法の最新の傾向を調べて',
    icon: '🔍',
  },
}

/** 設定状況を確認する */
export async function checkAgent(): Promise<{ ai: string[]; search: string[] }> {
  try {
    const res = await fetch('/api?fn=agent', { method: 'GET' })
    if (!res.ok) return { ai: [], search: [] }
    const j = (await res.json()) as { ai?: string[]; search?: string[] }
    return { ai: j.ai ?? [], search: j.search ?? [] }
  } catch {
    return { ai: [], search: [] }
  }
}

/** AI社員に仕事を依頼する */
export async function runAgent(job: JobKey, request: string, data: AppData): Promise<AgentResult> {
  try {
    const res = await fetch('/api?fn=agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, request, context: buildContext(data) }),
    })
    if (res.ok) return (await res.json()) as AgentResult

    const err = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null
    return {
      detail: err?.detail,
      job,
      label: '',
      staff: '',
      queries: [],
      engines: [],
      summary: '',
      items: [],
      draft: '',
      nextSteps: [],
      sourceCount: 0,
      provider: '',
      error: err?.error ?? '依頼を実行できませんでした',
    }
  } catch {
    return {
      job,
      label: '',
      staff: '',
      queries: [],
      engines: [],
      summary: '',
      items: [],
      draft: '',
      nextSteps: [],
      sourceCount: 0,
      provider: '',
      error: '通信に失敗しました',
    }
  }
}

/** 結果を、そのまま保存できる文章にする */
export function resultToText(r: AgentResult, request: string): string {
  const lines = [
    `【${r.label}】${r.staff}`,
    `依頼：${request}`,
    `作成：${new Date().toLocaleString('ja-JP')}（検索：${r.engines.join('・')} ／ ${r.sourceCount}件のページを確認）`,
    '',
    '■ 要約',
    r.summary,
    '',
    '■ 候補一覧',
  ]

  r.items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.name}`)
    if (it.place) lines.push(`   所在：${it.place}`)
    if (it.capacity) lines.push(`   規模：${it.capacity}`)
    if (it.cost) lines.push(`   費用：${it.cost}`)
    if (it.note) lines.push(`   備考：${it.note}`)
    if (it.source) lines.push(`   出典：${it.source}`)
    lines.push('')
  })

  if (r.draft) lines.push('■ 文面の下書き', r.draft, '')
  if (r.nextSteps.length) lines.push('■ 次にやること', ...r.nextSteps.map((s) => `・${s}`))

  lines.push('', '※ 検索結果には古い情報が含まれることがあります。連絡前に出典URLで必ずご確認ください。')
  return lines.join('\n')
}
