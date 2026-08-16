import { useMemo, useState } from 'react'
import type { Task, TaskStatus } from '../types'
import { useLibrary, isOverdue } from '../lib/library'
import { useData } from '../lib/data'
import { useAuth } from '../lib/auth'
import { Panel, ProgressBar, ACCENT } from './Ui'
import { Avatar } from './Avatar'
import { IconCheck } from './Icons'

/* ============================================================
   タスク管理
   ============================================================ */

type Filter = 'all' | 'doing' | 'done' | 'overdue'

const FILTERS: [Filter, string][] = [
  ['all', 'すべて'],
  ['doing', '進行中'],
  ['done', '完了'],
  ['overdue', '期限切れ'],
]

const PRIORITY_LABEL = { high: '高', normal: '中', low: '低' } as const
const PRIORITY_TONE = {
  high: 'text-red-300 ring-red-400/30 bg-red-400/10',
  normal: 'text-cyan-300 ring-cyan-400/30 bg-cyan-400/10',
  low: 'text-slate-400 ring-white/10 bg-white/5',
} as const

/** YYYY-MM-DD → 08/20 */
function shortDate(d: string): string {
  if (!d) return ''
  const [, m, day] = d.split('-')
  return m && day ? `${m}/${day}` : d
}

export function TaskPanel() {
  const { tasks, addTask, updateTask, deleteTask } = useLibrary()
  const { data } = useData()
  const { account } = useAuth()
  const [filter, setFilter] = useState<Filter>('all')
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [assignee, setAssignee] = useState(data.staff[0]?.id ?? '')
  const [due, setDue] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('normal')

  const list = useMemo(() => {
    if (filter === 'doing') return tasks.filter((t) => t.status !== 'done')
    if (filter === 'done') return tasks.filter((t) => t.status === 'done')
    if (filter === 'overdue') return tasks.filter(isOverdue)
    return tasks
  }, [tasks, filter])

  const doneCount = tasks.filter((t) => t.status === 'done').length
  const rate = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0

  const staffOf = (id: string) => data.staff.find((s) => s.id === id)

  const submit = async () => {
    const t = title.trim()
    if (!t) return
    await addTask({ title: t, assignee, due, priority, status: 'todo' })
    setTitle('')
    setDue('')
    setPriority('normal')
    setAdding(false)
  }

  const toggle = async (task: Task) => {
    const next: TaskStatus = task.status === 'done' ? 'doing' : 'done'
    await updateTask(task.id, { status: next })
  }

  return (
    <Panel
      title="タスク管理"
      action={
        <div className="flex gap-1">
          {FILTERS.map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`text-[10px] px-2 py-1 rounded-md transition ${
                filter === k
                  ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      }
    >
      {/* 進捗 */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <div className="flex justify-between text-[10px] text-slate-400 mb-1">
            <span>完了率</span>
            <span className="font-num">
              {doneCount} / {tasks.length} 件
            </span>
          </div>
          <ProgressBar value={rate} accent="gradient" />
        </div>
        <span className="font-num text-[15px] font-bold text-cyan-300">{rate}%</span>
      </div>

      {/* 一覧 */}
      <ul className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
        {list.length === 0 && (
          <li className="text-[11px] text-slate-500 py-4 text-center">タスクはありません</li>
        )}
        {list.map((task) => {
          const st = staffOf(task.assignee)
          const over = isOverdue(task)
          return (
            <li key={task.id} className="panel px-2.5 py-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => void toggle(task)}
                disabled={!account.canEdit}
                aria-label={task.status === 'done' ? '未完了に戻す' : '完了にする'}
                className={`w-5 h-5 shrink-0 rounded grid place-content-center ring-1 transition ${
                  task.status === 'done'
                    ? 'bg-emerald-400/20 ring-emerald-400/40 text-emerald-300'
                    : 'ring-white/15 text-transparent hover:ring-cyan-400/50'
                } disabled:opacity-40`}
              >
                <IconCheck className="w-3.5 h-3.5" />
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={`text-[12px] truncate ${
                    task.status === 'done' ? 'text-slate-500 line-through' : 'text-slate-100'
                  }`}
                >
                  {task.title}
                </p>
                <p className="flex items-center gap-1.5 text-[9px] text-slate-500 mt-0.5">
                  {st && <span className={ACCENT[st.accent].text}>{st.name}</span>}
                  {task.due && (
                    <span className={`font-num ${over ? 'text-red-400' : ''}`}>
                      {shortDate(task.due)}
                      {over && ' 期限切れ'}
                    </span>
                  )}
                </p>
              </div>

              {st && <Avatar name={st.name} src={st.avatar} accent={st.accent} size={24} rounded="rounded-md" />}

              <span
                className={`text-[9px] px-1.5 py-[2px] rounded ring-1 shrink-0 ${PRIORITY_TONE[task.priority]}`}
              >
                {PRIORITY_LABEL[task.priority]}
              </span>

              {account.canEdit && (
                <button
                  type="button"
                  onClick={() => void deleteTask(task.id)}
                  className="text-slate-600 hover:text-red-300 text-[11px] px-0.5 transition"
                  aria-label="このタスクを削除"
                >
                  ✕
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {/* 追加 */}
      {account.canEdit && (
        <div className="mt-3 pt-3 border-t border-white/10">
          {!adding ? (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="w-full py-2 rounded-lg text-[11px] text-slate-300 ring-1 ring-white/10 hover:ring-cyan-400/40 hover:text-cyan-200 transition"
            >
              ＋ タスクを追加
            </button>
          ) : (
            <div className="space-y-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void submit()}
                autoFocus
                placeholder="やることを入力…"
                aria-label="タスクの内容"
                className="w-full bg-night-950/70 rounded-lg px-2.5 py-2 text-[12px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
              />
              <div className="flex gap-2">
                <select
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  aria-label="担当するAI社員"
                  className="flex-1 min-w-0 bg-night-950/70 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
                >
                  {data.staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  aria-label="期限"
                  className="bg-night-950/70 rounded-lg px-2 py-1.5 text-[11px] font-num text-slate-200 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
                />
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Task['priority'])}
                  aria-label="優先度"
                  className="bg-night-950/70 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
                >
                  <option value="high">優先度：高</option>
                  <option value="normal">優先度：中</option>
                  <option value="low">優先度：低</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={!title.trim()}
                  className="flex-1 py-2 rounded-lg text-[12px] font-bold text-cyan-50 bg-cyan-500/30 ring-1 ring-cyan-400/50 hover:bg-cyan-500/45 disabled:opacity-40 transition"
                >
                  追加する
                </button>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="px-3 rounded-lg text-[11px] text-slate-400 ring-1 ring-white/10 hover:text-slate-100 transition"
                >
                  やめる
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}
