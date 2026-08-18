import { useMemo, useState } from 'react'
import type { AiStaff, Task } from '../types'
import { useData } from '../lib/data'
import { useLibrary, isOverdue } from '../lib/library'
import { useAuth } from '../lib/auth'
import { STAFF_GROUP_LABEL, countStaffStatus } from '../data/defaults'
import { Panel, ProgressBar, ACCENT, StatusDot, StateBadge } from '../components/Ui'
import { Avatar } from '../components/Avatar'
import { Donut } from '../components/Charts'
import { IconCheck } from '../components/Icons'
import { AgentPanel } from '../components/AgentPanel'
import { SnsPanel, CheckPanel } from '../components/StaffWorkPanel'

/* ============================================================
   AI社員ボード
   誰がいま何のタスクを持っているかを一覧で確認できます
   ============================================================ */

const STATUS_TEXT = { active: '稼働中', standby: '待機中', maintenance: 'メンテ中' } as const

function shortDate(d: string) {
  if (!d) return ''
  const [, m, day] = d.split('-')
  return m && day ? `${m}/${day}` : d
}

export function StaffBoard() {
  const { data } = useData()
  const [toCheck, setToCheck] = useState('')
  const { tasks, updateTask } = useLibrary()
  const { account } = useAuth()
  const [group, setGroup] = useState<'all' | 'core' | 'member' | 'staff'>('all')
  const [onlyBusy, setOnlyBusy] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const s = countStaffStatus(data.staff)

  /** 社員ごとのタスクをまとめる */
  const board = useMemo(() => {
    return data.staff.map((st) => {
      const mine = tasks.filter((t) => t.assignee === st.id)
      const done = mine.filter((t) => t.status === 'done')
      const open = mine.filter((t) => t.status !== 'done')
      const late = mine.filter(isOverdue)
      return {
        staff: st,
        tasks: mine,
        open,
        done,
        late,
        rate: mine.length ? Math.round((done.length / mine.length) * 100) : 0,
      }
    })
  }, [data.staff, tasks])

  const list = useMemo(() => {
    let l = board
    if (group !== 'all') l = l.filter((b) => b.staff.group === group)
    if (onlyBusy) l = l.filter((b) => b.open.length > 0)
    return l
  }, [board, group, onlyBusy])

  const totalOpen = board.reduce((n, b) => n + b.open.length, 0)
  const totalLate = board.reduce((n, b) => n + b.late.length, 0)
  const unassigned = tasks.filter((t) => !data.staff.some((st) => st.id === t.assignee) && t.status !== 'done')

  const toggle = (task: Task) =>
    void updateTask(task.id, { status: task.status === 'done' ? 'doing' : 'done' })

  return (
    <div className="space-y-3">
      {/* AI社員に実際の仕事を頼む */}
      <AgentPanel />

      <div className="layout-grid grid grid-cols-1 xl:grid-cols-2 gap-3">
        <SnsPanel onSendToCheck={setToCheck} />
        <CheckPanel initialText={toCheck} />
      </div>

      {/* 全体のようす */}
      <div className="layout-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Panel title="AI社員の稼働">
          <div className="flex items-center gap-3">
            <Donut value={s.rate} size={78} accent="green" />
            <ul className="text-[10px] space-y-1">
              <li className="flex justify-between gap-3">
                <span className="text-emerald-300">稼働中</span>
                <span className="font-num text-slate-100">{s.active}人</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-amber-300">待機中</span>
                <span className="font-num text-slate-100">{s.standby}人</span>
              </li>
              <li className="flex justify-between gap-3">
                <span className="text-slate-400">合計</span>
                <span className="font-num text-slate-100">{s.total}人</span>
              </li>
            </ul>
          </div>
        </Panel>

        <Panel title="進行中のタスク">
          <p className="font-num text-[26px] font-bold text-cyan-300 leading-none">{totalOpen}</p>
          <p className="text-[10px] text-slate-400 mt-1">件が進行中です</p>
        </Panel>

        <Panel title="期限切れ">
          <p
            className={`font-num text-[26px] font-bold leading-none ${
              totalLate > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}
          >
            {totalLate}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">
            {totalLate > 0 ? '対応が必要です' : '遅れはありません'}
          </p>
        </Panel>

        <Panel title="タスクの無い社員">
          <p className="font-num text-[26px] font-bold text-slate-300 leading-none">
            {board.filter((b) => b.open.length === 0).length}
          </p>
          <p className="text-[10px] text-slate-400 mt-1">人が手空きです</p>
        </Panel>
      </div>

      {/* 絞り込み */}
      <div className="panel px-3 py-2 flex flex-wrap items-center gap-2">
        {(['all', 'core', 'member', 'staff'] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroup(g)}
            className={`text-[11px] px-2.5 py-1.5 rounded-md transition ${
              group === g
                ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40'
                : 'text-slate-400 ring-1 ring-white/10 hover:text-slate-100'
            }`}
          >
            {g === 'all' ? 'すべて' : STAFF_GROUP_LABEL[g]}
          </button>
        ))}
        <span className="w-px h-4 bg-white/10 mx-1" />
        <button
          type="button"
          onClick={() => setOnlyBusy((v) => !v)}
          className={`text-[11px] px-2.5 py-1.5 rounded-md transition ${
            onlyBusy
              ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40'
              : 'text-slate-400 ring-1 ring-white/10 hover:text-slate-100'
          }`}
        >
          タスクを持つ人だけ表示
        </button>
        <span className="ml-auto text-[10px] text-slate-500">{list.length}人を表示中</span>
      </div>

      {/* 社員ごとのカード */}
      <div className="inner-grid grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
        {list.map((b) => {
          const a = ACCENT[b.staff.accent]
          const opened = openId === b.staff.id
          const shown = opened ? b.tasks : b.tasks.slice(0, 4)
          return (
            <section key={b.staff.id} className="panel p-3">
              {/* 見出し */}
              <div className="flex items-start gap-2.5">
                <Avatar name={b.staff.name} src={b.staff.avatar} accent={b.staff.accent} size={46} />
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-bold ${a.text} truncate`}>{b.staff.name}</p>
                  {b.staff.nameEn && <p className="text-[9px] text-slate-600">{b.staff.nameEn}</p>}
                  <p className="text-[10px] text-slate-400 truncate">{b.staff.role}</p>
                  <p className="flex items-center gap-1 text-[10px] mt-0.5">
                    <StatusDot
                      tone={
                        b.staff.status === 'active' ? 'green' : b.staff.status === 'standby' ? 'amber' : 'red'
                      }
                    />
                    <span className={b.staff.status === 'active' ? 'text-emerald-300' : 'text-amber-300'}>
                      {STATUS_TEXT[b.staff.status]}
                    </span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-num text-[18px] font-bold text-slate-100 leading-none">
                    {b.open.length}
                  </p>
                  <p className="text-[9px] text-slate-500">進行中</p>
                  {b.late.length > 0 && (
                    <p className="text-[9px] text-red-400 mt-0.5">遅れ {b.late.length}</p>
                  )}
                </div>
              </div>

              {/* 進捗 */}
              <div className="mt-2.5">
                <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                  <span>完了 {b.done.length} / {b.tasks.length} 件</span>
                  <span className="font-num">{b.rate}%</span>
                </div>
                <ProgressBar value={b.rate} accent="gradient" height={5} />
              </div>

              {/* タスク一覧 */}
              <ul className="mt-2.5 space-y-1">
                {b.tasks.length === 0 && (
                  <li className="text-[10px] text-slate-600 py-2 text-center">
                    担当しているタスクはありません
                  </li>
                )}
                {shown.map((t) => {
                  const late = isOverdue(t)
                  return (
                    <li key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03]">
                      <button
                        type="button"
                        onClick={() => toggle(t)}
                        disabled={!account.canEdit}
                        aria-label={t.status === 'done' ? '未完了に戻す' : '完了にする'}
                        className={`w-4 h-4 shrink-0 rounded grid place-content-center ring-1 transition ${
                          t.status === 'done'
                            ? 'bg-emerald-400/20 ring-emerald-400/40 text-emerald-300'
                            : 'ring-white/15 text-transparent hover:ring-cyan-400/50'
                        } disabled:opacity-40`}
                      >
                        <IconCheck className="w-3 h-3" />
                      </button>
                      <span
                        className={`text-[11px] truncate flex-1 ${
                          t.status === 'done' ? 'text-slate-600 line-through' : 'text-slate-200'
                        }`}
                      >
                        {t.title}
                      </span>
                      {t.priority === 'high' && t.status !== 'done' && (
                        <span className="text-[9px] px-1 rounded text-red-300 ring-1 ring-red-400/30 shrink-0">
                          高
                        </span>
                      )}
                      {t.due && (
                        <span className={`text-[9px] font-num shrink-0 ${late ? 'text-red-400' : 'text-slate-500'}`}>
                          {shortDate(t.due)}
                        </span>
                      )}
                    </li>
                  )
                })}
              </ul>

              {b.tasks.length > 4 && (
                <button
                  type="button"
                  onClick={() => setOpenId(opened ? null : b.staff.id)}
                  className="mt-2 w-full py-1.5 rounded-lg text-[10px] text-slate-400 ring-1 ring-white/10 hover:text-cyan-200 hover:ring-cyan-400/40 transition"
                >
                  {opened ? '閉じる' : `残り ${b.tasks.length - 4} 件をすべて表示`}
                </button>
              )}
            </section>
          )
        })}
      </div>

      {/* 担当が外れているタスク */}
      {unassigned.length > 0 && (
        <Panel title={`担当が決まっていないタスク（${unassigned.length}件）`}>
          <ul className="space-y-1.5">
            {unassigned.map((t) => (
              <li key={t.id} className="panel px-2.5 py-2 flex items-center gap-2">
                <span className="text-[11px] text-slate-200 truncate flex-1">{t.title}</span>
                <StateBadge text="担当なし" tone="warn" />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-slate-500">
            経営ダッシュボードの「タスク管理」から、担当を割り当てられます
          </p>
        </Panel>
      )}
    </div>
  )
}
