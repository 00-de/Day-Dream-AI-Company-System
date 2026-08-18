import type { AppData, Task, Meeting, MediaItem } from '../types'
import { buildContext } from './ai'
import { isOverdue } from './library'

/* ============================================================
   悠真AI（統括レポート）と 拓斗AI（開発支援）
   ============================================================ */

/* ── 悠真AI：日報・週報 ─────────────────── */

export type Span = 'day' | 'week' | 'month'
export const SPAN_LABEL: Record<Span, string> = { day: '日報', week: '週報', month: '月報' }

export interface Report {
  span: Span
  spanLabel: string
  headline: string
  mood: 'good' | 'normal' | 'warn'
  summary: string
  progress: string[]
  concerns: string[]
  decisions: string[]
  assignments: { staff: string; task: string }[]
  tomorrow: string[]
  provider: string
  error?: string
  detail?: string
}

/** 実績を集めて、AIに渡せる形にします */
export function collectActivity(data: AppData, tasks: Task[], meetings: Meeting[], media: MediaItem[]) {
  const nameOf = (id: string) => data.staff.find((s) => s.id === id)?.name ?? '担当なし'
  const done = tasks.filter((t) => t.status === 'done')
  const open = tasks.filter((t) => t.status !== 'done')
  const late = tasks.filter(isOverdue)

  const busy = data.staff
    .map((s) => ({ s, n: tasks.filter((t) => t.assignee === s.id && t.status !== 'done').length }))
    .filter((x) => x.n > 0)

  const idle = data.staff.filter((s) => !tasks.some((t) => t.assignee === s.id && t.status !== 'done'))

  return {
    taskTotal: tasks.length,
    taskDone: done.length,
    taskOpen: open.length,
    taskLate: late.length,
    doneList: done.slice(0, 12).map((t) => `${t.title}（${nameOf(t.assignee)}）`),
    openList: open.slice(0, 12).map((t) => `${t.title}（${nameOf(t.assignee)}／期限 ${t.due || '未設定'}）`),
    lateList: late.slice(0, 8).map((t) => `${t.title}（${nameOf(t.assignee)}／期限 ${t.due}）`),
    busyStaff: busy.slice(0, 12).map((x) => `${x.s.name}：${x.n}件`),
    idleStaff: idle.slice(0, 12).map((s) => `${s.name}（${s.role}）`),
    meetings: meetings.slice(0, 5).map((m) => `${m.topic}（決定 ${m.decisions.length}件）`),
    mediaCount: media.length,
  }
}

export async function makeReport(
  span: Span,
  note: string,
  data: AppData,
  tasks: Task[],
  meetings: Meeting[],
  media: MediaItem[],
): Promise<Report> {
  const empty: Report = {
    span,
    spanLabel: SPAN_LABEL[span],
    headline: '',
    mood: 'normal',
    summary: '',
    progress: [],
    concerns: [],
    decisions: [],
    assignments: [],
    tomorrow: [],
    provider: '',
  }
  try {
    const res = await fetch('/api?fn=report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        span,
        note,
        activity: collectActivity(data, tasks, meetings, media),
        context: buildContext(data),
      }),
    })
    if (res.ok) return (await res.json()) as Report
    const err = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null
    return { ...empty, error: err?.error ?? 'レポートを作れませんでした', detail: err?.detail }
  } catch {
    return { ...empty, error: '通信に失敗しました' }
  }
}

/** レポートを、保存できる文章にします */
export function reportToText(r: Report, data: AppData): string {
  const lines = [
    `【${r.spanLabel}】${data.company.name}`,
    `${new Date().toLocaleString('ja-JP')}　作成：悠真AI`,
    '',
    `■ ${r.headline}`,
    r.summary,
    '',
  ]
  if (r.progress.length) lines.push('■ 進んだこと', ...r.progress.map((x) => `・${x}`), '')
  if (r.concerns.length) lines.push('■ 気になること', ...r.concerns.map((x) => `・${x}`), '')
  if (r.decisions.length) lines.push('■ 社長に判断してほしいこと', ...r.decisions.map((x) => `・${x}`), '')
  if (r.assignments.length)
    lines.push('■ 次に任せたい仕事', ...r.assignments.map((x) => `・${x.staff}：${x.task}`), '')
  if (r.tomorrow.length) lines.push('■ 次にやること', ...r.tomorrow.map((x) => `・${x}`))
  return lines.join('\n')
}

/* ── 拓斗AI：開発支援 ───────────────────── */

export type DevMode = 'write' | 'debug' | 'explain'
export const DEV_MODE_LABEL: Record<DevMode, string> = {
  write: 'コードを書く',
  debug: '不具合を調べる',
  explain: '仕組みを説明する',
}

export interface DevResult {
  mode: DevMode
  answer: string
  code: string
  filename: string
  steps: string[]
  warnings: string[]
  provider: string
  error?: string
}

export async function askDev(mode: DevMode, request: string, code: string): Promise<DevResult> {
  const empty: DevResult = { mode, answer: '', code: '', filename: '', steps: [], warnings: [], provider: '' }
  try {
    const res = await fetch('/api?fn=dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, request, code }),
    })
    if (res.ok) return (await res.json()) as DevResult
    const err = (await res.json().catch(() => null)) as { error?: string } | null
    return { ...empty, error: err?.error ?? '回答を作れませんでした' }
  } catch {
    return { ...empty, error: '通信に失敗しました' }
  }
}
