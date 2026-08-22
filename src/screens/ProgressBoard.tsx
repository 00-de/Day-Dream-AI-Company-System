import { useMemo, useState } from 'react'
import type { AiStaff, Task } from '../types'
import { useData } from '../lib/data'
import { useLibrary, isOverdue } from '../lib/library'
import { useAuth } from '../lib/auth'
import { STAFF_GROUP_LABEL, countStaffStatus } from '../data/defaults'
import { Panel, ProgressBar, ACCENT, StatusDot, StateBadge } from '../components/Ui'
import { Avatar } from '../components/Avatar'
import { Donut } from '../components/Charts'
import { IconCheck, IconCalendar, IconUsers, IconChart, IconEdit } from '../components/Icons'
import { AskStaffModal } from '../components/AskStaffModal'

/* ============================================================
   仕事の進捗状況（4つのタブ）
   ①全体進捗 ②メンバー別 ③タスク詳細 ④指示リスト
   ============================================================ */

type Tab = 'overview' | 'members' | 'tasks' | 'orders'

const TABS: { key: Tab; label: string; icon: (p: { className?: string }) => JSX.Element }[] = [
  { key: 'overview', label: '全体進捗', icon: IconChart },
  { key: 'members', label: 'メンバー別進捗', icon: IconUsers },
  { key: 'tasks', label: 'タスク詳細', icon: IconCalendar },
  { key: 'orders', label: '仕事の指示', icon: IconEdit },
]

const PRIORITY = { high: ['高', 'text-red-300 ring-red-400/30 bg-red-400/10'], normal: ['中', 'text-cyan-300 ring-cyan-400/30 bg-cyan-400/10'], low: ['低', 'text-slate-400 ring-white/10 bg-white/5'] } as const
const STATUS = { todo: ['未着手', 'text-slate-400'], doing: ['進行中', 'text-cyan-300'], done: ['完了', 'text-emerald-300'] } as const

function shortDate(d: string) {
  if (!d) return '期限なし'
  const [y, m, day] = d.split('-')
  return m && day ? `${m}/${day}` : y
}

/** 期限までの残り日数 */
function daysLeft(due: string): number | null {
  if (!due) return null
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return Math.round((new Date(due).getTime() - t.getTime()) / 86400000)
}

export function ProgressBoard() {
  const { data } = useData()
  const { tasks, updateTask, addTask, deleteTask } = useLibrary()
  const { account } = useAuth()
  const [tab, setTab] = useState<Tab>('overview')
  const [selected, setSelected] = useState<AiStaff | null>(null)
  const [asking, setAsking] = useState<AiStaff | null>(null)
  const [filter, setFilter] = useState<'all' | 'todo' | 'doing' | 'done' | 'late'>('all')
  const [orderTo, setOrderTo] = useState(data.staff[0]?.id ?? '')
  const [orderText, setOrderText] = useState('')
  const [orderDue, setOrderDue] = useState('')
  const [orderPri, setOrderPri] = useState<Task['priority']>('normal')

  const s = countStaffStatus(data.staff)
  const staffOf = (id: string) => data.staff.find((x) => x.id === id)

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.status === 'done')
    const late = tasks.filter(isOverdue)
    return {
      total: tasks.length,
      done: done.length,
      open: tasks.length - done.length,
      late: late.length,
      rate: tasks.length ? Math.round((done.length / tasks.length) * 100) : 0,
    }
  }, [tasks])

  const perStaff = useMemo(
    () =>
      data.staff.map((st) => {
        const mine = tasks.filter((t) => t.assignee === st.id)
        const done = mine.filter((t) => t.status === 'done')
        return {
          staff: st,
          all: mine,
          open: mine.filter((t) => t.status !== 'done'),
          done,
          late: mine.filter(isOverdue),
          rate: mine.length ? Math.round((done.length / mine.length) * 100) : 0,
        }
      }),
    [data.staff, tasks],
  )

  const filtered = useMemo(() => {
    if (filter === 'late') return tasks.filter(isOverdue)
    if (filter === 'all') return tasks
    return tasks.filter((t) => t.status === filter)
  }, [tasks, filter])

  /** 選んだメンバーのタイムスケジュール（期限順） */
  const timeline = useMemo(() => {
    if (!selected) return []
    return tasks
      .filter((t) => t.assignee === selected.id)
      .slice()
      .sort((a, b) => {
        if (!a.due) return 1
        if (!b.due) return -1
        return a.due.localeCompare(b.due)
      })
  }, [selected, tasks])

  const submitOrder = async () => {
    const title = orderText.trim()
    if (!title) return
    await addTask({ title, assignee: orderTo, status: 'todo', due: orderDue, priority: orderPri })
    setOrderText('')
    setOrderDue('')
  }

  const toggle = (t: Task) => void updateTask(t.id, { status: t.status === 'done' ? 'doing' : 'done' })

  return (
    <div className="space-y-3">
      <AskStaffModal staff={asking} onClose={() => setAsking(null)} />

      {/* タブ */}
      <nav className="panel px-2 py-2 flex flex-wrap gap-1.5" aria-label="進捗状況のタブ">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] transition ${
                tab === t.key
                  ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40 shadow-glow'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          )
        })}
      </nav>

      {/* ── ①全体進捗 ───────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-3">
          <div className="layout-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Panel title="タスク完了率">
              <div className="flex items-center gap-3">
                <Donut value={stats.rate} size={82} accent="cyan" />
                <div className="text-[10px] space-y-1">
                  <p className="text-slate-400">完了 <b className="font-num text-emerald-300">{stats.done}</b></p>
                  <p className="text-slate-400">残り <b className="font-num text-cyan-300">{stats.open}</b></p>
                  <p className="text-slate-400">全体 <b className="font-num text-slate-100">{stats.total}</b></p>
                </div>
              </div>
            </Panel>
            <Panel title="期限切れ">
              <p className={`font-num text-[28px] font-bold leading-none ${stats.late ? 'text-red-400' : 'text-emerald-400'}`}>
                {stats.late}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">{stats.late ? '対応が必要です' : '遅れはありません'}</p>
            </Panel>
            <Panel title="AI社員の稼働">
              <div className="flex items-center gap-3">
                <Donut value={s.rate} size={82} accent="green" />
                <div className="text-[10px] space-y-1">
                  <p className="text-emerald-300">稼働 <b className="font-num">{s.active}</b>人</p>
                  <p className="text-amber-300">待機 <b className="font-num">{s.standby}</b>人</p>
                </div>
              </div>
            </Panel>
            <Panel title="手空きの社員">
              <p className="font-num text-[28px] font-bold text-slate-200 leading-none">
                {perStaff.filter((p) => p.open.length === 0).length}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">人にタスクを振れます</p>
            </Panel>
          </div>

          <Panel title="プロジェクト進捗">
            <ul className="space-y-3">
              {data.projects.map((p) => (
                <li key={p.name}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-200">{p.name}</span>
                    <span className="font-num text-cyan-300">{p.progress}%</span>
                  </div>
                  <ProgressBar value={p.progress} accent="gradient" />
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="部門別の進み具合">
            <div className="inner-grid grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['core', 'member', 'staff'] as const).map((g) => {
                const list = perStaff.filter((p) => p.staff.group === g)
                const all = list.reduce((n, p) => n + p.all.length, 0)
                const done = list.reduce((n, p) => n + p.done.length, 0)
                const rate = all ? Math.round((done / all) * 100) : 0
                return (
                  <div key={g} className="panel p-3">
                    <p className="text-[11px] text-slate-200">{STAFF_GROUP_LABEL[g]}</p>
                    <p className="text-[9px] text-slate-500 mb-2 font-num">
                      {list.length}人 ／ タスク {done} / {all} 件
                    </p>
                    <ProgressBar value={rate} accent="gradient" />
                    <p className="text-right text-[10px] font-num text-cyan-300 mt-1">{rate}%</p>
                  </div>
                )
              })}
            </div>
          </Panel>
        </div>
      )}

      {/* ── ②メンバー別進捗 ─────────────── */}
      {tab === 'members' && (
        <div className="space-y-3">
          <p className="text-[11px] text-slate-500">
            メンバーをクリックすると、タイムスケジュールが表示されます
          </p>
          <div className="inner-grid grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
            {perStaff.map((p) => (
              <button
                key={p.staff.id}
                type="button"
                onClick={() => setSelected(p.staff)}
                className={`panel panel-hover p-3 text-left ${
                  selected?.id === p.staff.id ? 'ring-1 ring-cyan-400/50' : ''
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Avatar name={p.staff.name} src={p.staff.avatar} accent={p.staff.accent} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className={`text-[12px] font-bold truncate ${ACCENT[p.staff.accent].text}`}>
                      {p.staff.name}
                    </p>
                    <p className="text-[9px] text-slate-500 truncate">{p.staff.role}</p>
                    <p className="flex items-center gap-1 text-[9px] mt-0.5">
                      <StatusDot tone={p.staff.status === 'active' ? 'green' : 'amber'} />
                      <span className="text-slate-400">進行中 {p.open.length}件</span>
                      {p.late.length > 0 && <span className="text-red-400">遅れ {p.late.length}</span>}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <ProgressBar value={p.rate} accent="gradient" height={5} />
                  <p className="text-right text-[9px] font-num text-slate-500 mt-0.5">
                    {p.done.length} / {p.all.length} 件 完了
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* タイムスケジュール */}
          {selected && (
            <Panel
              title={`${selected.name} のタイムスケジュール`}
              action={
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-[11px] text-slate-500 hover:text-slate-200"
                >
                  閉じる
                </button>
              }
            >
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-white/10">
                <Avatar name={selected.name} src={selected.avatar} accent={selected.accent} size={52} />
                <div className="flex-1">
                  <p className={`text-[13px] font-bold ${ACCENT[selected.accent].text}`}>{selected.name}</p>
                  <p className="text-[10px] text-slate-400">{selected.role}</p>
                </div>
                <span className="flex items-center gap-2">
                  <StateBadge
                    text={selected.status === 'active' ? '稼働中' : '待機中'}
                    tone={selected.status === 'active' ? 'good' : 'warn'}
                  />
                  <button
                    type="button"
                    onClick={() => setAsking(selected)}
                    className="ask-btn-sm px-4 py-2 rounded-lg text-[12px]"
                  >
                    依頼する
                  </button>
                </span>
              </div>

              {timeline.length === 0 ? (
                <p className="text-[11px] text-slate-500 text-center py-6">
                  担当しているタスクはありません
                </p>
              ) : (
                <ol className="relative pl-5">
                  <span className="absolute left-[7px] top-1 bottom-1 w-px bg-white/10" aria-hidden="true" />
                  {timeline.map((t) => {
                    const left = daysLeft(t.due)
                    const late = isOverdue(t)
                    const dotColor =
                      t.status === 'done' ? 'bg-emerald-400' : late ? 'bg-red-400' : 'bg-cyan-400'
                    return (
                      <li key={t.id} className="relative pb-3">
                        <span
                          className={`absolute -left-5 top-1.5 w-3 h-3 rounded-full ${dotColor} ring-2 ring-night-900`}
                          aria-hidden="true"
                        />
                        <div className="panel p-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`font-num text-[11px] ${late ? 'text-red-400' : 'text-cyan-300'}`}>
                              {shortDate(t.due)}
                            </span>
                            {left !== null && t.status !== 'done' && (
                              <span className="text-[9px] text-slate-500">
                                {left < 0 ? `${-left}日超過` : left === 0 ? '本日まで' : `あと${left}日`}
                              </span>
                            )}
                            <span className={`ml-auto text-[9px] px-1.5 py-[1px] rounded ring-1 ${PRIORITY[t.priority][1]}`}>
                              {PRIORITY[t.priority][0]}
                            </span>
                          </div>
                          <p
                            className={`text-[12px] mt-1 ${
                              t.status === 'done' ? 'text-slate-600 line-through' : 'text-slate-100'
                            }`}
                          >
                            {t.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`text-[9px] ${STATUS[t.status][1]}`}>{STATUS[t.status][0]}</span>
                            {account.canEdit && (
                              <button
                                type="button"
                                onClick={() => toggle(t)}
                                className="ml-auto text-[9px] px-2 py-0.5 rounded ring-1 ring-white/10 text-slate-300 hover:ring-cyan-400/40 hover:text-cyan-200 transition"
                              >
                                {t.status === 'done' ? '未完了に戻す' : '完了にする'}
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </Panel>
          )}
        </div>
      )}

      {/* ── ③タスク詳細 ─────────────────── */}
      {tab === 'tasks' && (
        <Panel
          title={`タスク詳細（${filtered.length}件）`}
          action={
            <div className="flex gap-1">
              {([
                ['all', 'すべて'],
                ['todo', '未着手'],
                ['doing', '進行中'],
                ['done', '完了'],
                ['late', '期限切れ'],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  className={`text-[10px] px-2 py-1 rounded-md transition ${
                    filter === k
                      ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          }
        >
          {filtered.length === 0 ? (
            <p className="text-[11px] text-slate-500 text-center py-6">該当するタスクはありません</p>
          ) : (
            <ul className="scroll-box space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
              {filtered.map((t) => {
                const st = staffOf(t.assignee)
                const late = isOverdue(t)
                const left = daysLeft(t.due)
                return (
                  <li key={t.id} className="panel p-2.5 flex items-center gap-2.5">
                    {account.canEdit && (
                      <button
                        type="button"
                        onClick={() => toggle(t)}
                        aria-label={t.status === 'done' ? '未完了に戻す' : '完了にする'}
                        className={`w-5 h-5 shrink-0 rounded grid place-content-center ring-1 transition ${
                          t.status === 'done'
                            ? 'bg-emerald-400/20 ring-emerald-400/40 text-emerald-300'
                            : 'ring-white/15 text-transparent hover:ring-cyan-400/50'
                        }`}
                      >
                        <IconCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {st && <Avatar name={st.name} src={st.avatar} accent={st.accent} size={30} rounded="rounded-lg" />}
                    <div className="min-w-0 flex-1">
                      <p className={`text-[12px] truncate ${t.status === 'done' ? 'text-slate-600 line-through' : 'text-slate-100'}`}>
                        {t.title}
                      </p>
                      <p className="text-[9px] text-slate-500 flex items-center gap-2">
                        <span>{st?.name ?? '担当なし'}</span>
                        <span className={STATUS[t.status][1]}>{STATUS[t.status][0]}</span>
                        <span className={`font-num ${late ? 'text-red-400' : ''}`}>
                          {shortDate(t.due)}
                          {left !== null && t.status !== 'done' && (left < 0 ? `（${-left}日超過）` : left === 0 ? '（本日）' : `（あと${left}日）`)}
                        </span>
                      </p>
                    </div>
                    <span className={`text-[9px] px-1.5 py-[2px] rounded ring-1 shrink-0 ${PRIORITY[t.priority][1]}`}>
                      {PRIORITY[t.priority][0]}
                    </span>
                    {account.canEdit && (
                      <button
                        type="button"
                        onClick={() => void deleteTask(t.id)}
                        className="text-slate-600 hover:text-red-300 text-[11px] px-0.5"
                        aria-label="削除"
                      >
                        ✕
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      )}

      {/* ── ④仕事の指示 ─────────────────── */}
      {tab === 'orders' && (
        <div className="layout-grid grid grid-cols-1 xl:grid-cols-3 gap-3">
          <Panel title="指示を出す" className="xl:col-span-1">
            {!account.canEdit ? (
              <p className="text-[11px] text-slate-500 py-4 text-center">
                指示を出す権限がありません（閲覧のみ）
              </p>
            ) : (
              <div className="space-y-2.5">
                <label className="block">
                  <span className="block text-[10px] text-slate-400 mb-1">誰に</span>
                  <select
                    value={orderTo}
                    onChange={(e) => setOrderTo(e.target.value)}
                    className="w-full bg-night-950/70 rounded-lg px-2 py-2 text-[12px] text-slate-200 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
                  >
                    {data.staff.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}（{st.role}）
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-[10px] text-slate-400 mb-1">仕事の内容</span>
                  <textarea
                    value={orderText}
                    onChange={(e) => setOrderText(e.target.value)}
                    rows={3}
                    placeholder="例：新曲のサビの歌詞を3案つくる"
                    className="w-full bg-night-950/70 rounded-lg px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none resize-none"
                  />
                </label>

                <div className="flex gap-2">
                  <label className="flex-1">
                    <span className="block text-[10px] text-slate-400 mb-1">期限</span>
                    <input
                      type="date"
                      value={orderDue}
                      onChange={(e) => setOrderDue(e.target.value)}
                      className="w-full bg-night-950/70 rounded-lg px-2 py-1.5 text-[11px] font-num text-slate-200 ring-1 ring-white/10 outline-none"
                    />
                  </label>
                  <label className="flex-1">
                    <span className="block text-[10px] text-slate-400 mb-1">優先度</span>
                    <select
                      value={orderPri}
                      onChange={(e) => setOrderPri(e.target.value as Task['priority'])}
                      className="w-full bg-night-950/70 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 ring-1 ring-white/10 outline-none"
                    >
                      <option value="high">高</option>
                      <option value="normal">中</option>
                      <option value="low">低</option>
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => void submitOrder()}
                  disabled={!orderText.trim()}
                  className="w-full py-2.5 rounded-lg text-[12px] font-bold text-cyan-50 bg-cyan-500/30 ring-1 ring-cyan-400/50 hover:bg-cyan-500/45 disabled:opacity-40 transition"
                >
                  この指示を出す
                </button>
                <p className="text-[9px] text-slate-600">
                  出した指示は、担当者のタイムスケジュールとタスク管理に入ります
                </p>
              </div>
            )}
          </Panel>

          <Panel title="指示リスト（担当者ごと）" className="xl:col-span-2">
            <ul className="scroll-box space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {perStaff
                .filter((p) => p.open.length > 0)
                .map((p) => (
                  <li key={p.staff.id}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Avatar name={p.staff.name} src={p.staff.avatar} accent={p.staff.accent} size={24} rounded="rounded-md" />
                      <span className={`text-[11px] font-bold ${ACCENT[p.staff.accent].text}`}>
                        {p.staff.name}
                      </span>
                      <span className="text-[9px] text-slate-600">{p.staff.role}</span>
                      <span className="ml-auto text-[9px] text-slate-500 font-num">{p.open.length}件</span>
                    </div>
                    <ul className="space-y-1 pl-2">
                      {p.open.map((t) => {
                        const late = isOverdue(t)
                        return (
                          <li key={t.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03]">
                            {account.canEdit && (
                              <button
                                type="button"
                                onClick={() => toggle(t)}
                                aria-label="完了にする"
                                className="w-4 h-4 shrink-0 rounded grid place-content-center ring-1 ring-white/15 text-transparent hover:ring-cyan-400/50 transition"
                              >
                                <IconCheck className="w-3 h-3" />
                              </button>
                            )}
                            <span className="text-[11px] text-slate-200 truncate flex-1">{t.title}</span>
                            <span className={`text-[9px] font-num shrink-0 ${late ? 'text-red-400' : 'text-slate-500'}`}>
                              {shortDate(t.due)}
                            </span>
                            <span className={`text-[9px] px-1 rounded ring-1 shrink-0 ${PRIORITY[t.priority][1]}`}>
                              {PRIORITY[t.priority][0]}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </li>
                ))}
              {perStaff.every((p) => p.open.length === 0) && (
                <li className="text-[11px] text-slate-500 text-center py-6">
                  進行中の指示はありません
                </li>
              )}
            </ul>
          </Panel>
        </div>
      )}
    </div>
  )
}
