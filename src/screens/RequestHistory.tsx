import { useEffect, useMemo, useState } from 'react'
import { useData } from '../lib/data'
import { useAuth } from '../lib/auth'
import { useLibrary } from '../lib/library'
import { watchRequests, deleteRequest, recordToText, type RequestRecord } from '../lib/requests'
import { copyText, downloadText } from '../lib/integrations'
import { Panel, ACCENT, StateBadge } from '../components/Ui'
import { Avatar } from '../components/Avatar'
import { IconCheck, IconUsers } from '../components/Icons'

/* ============================================================
   依頼履歴
   AI社員に過去に頼んだ内容と、その結果を見返せます
   ============================================================ */

function when(iso: string): string {
  const d = new Date(iso)
  const w = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
  return `${d.getMonth() + 1}/${d.getDate()}（${w}）${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`
}

function groupOf(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const day = new Date(d)
  day.setHours(0, 0, 0, 0)
  const diff = Math.round((today.getTime() - day.getTime()) / 86400000)
  if (diff <= 0) return '今日'
  if (diff === 1) return '昨日'
  if (diff < 7) return '今週'
  if (diff < 30) return '今月'
  return 'それ以前'
}

export function RequestHistory() {
  const { data } = useData()
  const { user, account } = useAuth()
  const { addTask } = useLibrary()

  const [records, setRecords] = useState<RequestRecord[]>([])
  const [staffId, setStaffId] = useState('all')
  const [keyword, setKeyword] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [copied, setCopied] = useState('')
  const [added, setAdded] = useState<string[]>([])

  useEffect(() => watchRequests(Boolean(user), setRecords), [user])

  const staffOf = (id: string) => data.staff.find((s) => s.id === id)

  const staffCounts = useMemo(() => {
    const map = new Map<string, number>()
    records.forEach((r) => map.set(r.staffId, (map.get(r.staffId) ?? 0) + 1))
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [records])

  const list = useMemo(() => {
    let l = records
    if (staffId !== 'all') l = l.filter((r) => r.staffId === staffId)
    const k = keyword.trim().toLowerCase()
    if (k) {
      l = l.filter(
        (r) =>
          r.request.toLowerCase().includes(k) ||
          r.answer.toLowerCase().includes(k) ||
          (r.deliverable ?? '').toLowerCase().includes(k) ||
          r.staffName.toLowerCase().includes(k),
      )
    }
    return l
  }, [records, staffId, keyword])

  const grouped = useMemo(() => {
    const g: { label: string; items: RequestRecord[] }[] = []
    list.forEach((r) => {
      const label = groupOf(r.createdAt)
      const hit = g.find((x) => x.label === label)
      if (hit) hit.items.push(r)
      else g.push({ label, items: [r] })
    })
    return g
  }, [list])

  const doCopy = async (r: RequestRecord) => {
    if (await copyText(recordToText(r))) {
      setCopied(r.id)
      window.setTimeout(() => setCopied(''), 1800)
    }
  }

  const saveTask = async (r: RequestRecord, title: string) => {
    await addTask({ title, assignee: r.staffId, status: 'todo', due: '', priority: 'normal' })
    setAdded((l) => [...l, `${r.id}:${title}`])
  }

  return (
    <div className="space-y-3">
      <div className="layout-grid grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Panel title="依頼の総数">
          <p className="font-num text-[28px] font-bold text-cyan-300 leading-none">{records.length}</p>
          <p className="text-[10px] text-slate-400 mt-1">件の依頼を記録しています</p>
        </Panel>
        <Panel title="よく頼んでいる社員">
          {staffCounts.length === 0 ? (
            <p className="text-[11px] text-slate-500 py-2">まだありません</p>
          ) : (
            <ul className="space-y-1">
              {staffCounts.slice(0, 3).map(([id, n]) => {
                const st = staffOf(id)
                return (
                  <li key={id} className="flex items-center gap-2 text-[11px]">
                    {st && <Avatar name={st.name} src={st.avatar} accent={st.accent} size={20} rounded="rounded" />}
                    <span className={st ? ACCENT[st.accent].text : 'text-slate-300'}>{st?.name ?? id}</span>
                    <span className="ml-auto font-num text-slate-400">{n}件</span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
        <Panel title="保存先">
          <p className="text-[12px] text-slate-200">
            {user ? 'Firestore（全員で共有）' : 'この端末の中だけ'}
          </p>
          <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
            {user
              ? 'パソコンとスマホのどちらからでも同じ履歴が見られます'
              : 'ログインすると、全員で共有される履歴になります'}
          </p>
        </Panel>
      </div>

      <Panel title="絞り込み">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="依頼内容・回答・社員名で探す"
          aria-label="キーワードで探す"
          className="w-full bg-night-950/70 rounded-lg px-3 py-2.5 text-[13px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
        />
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          <button
            type="button"
            onClick={() => setStaffId('all')}
            className={`text-[11px] px-2.5 py-1.5 rounded-md transition ${
              staffId === 'all'
                ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40'
                : 'text-slate-400 ring-1 ring-white/10 hover:text-slate-100'
            }`}
          >
            すべて（{records.length}）
          </button>
          {staffCounts.map(([id, n]) => {
            const st = staffOf(id)
            const on = staffId === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => setStaffId(id)}
                className={`text-[11px] px-2.5 py-1.5 rounded-md transition ${
                  on ? 'ring-1 bg-white/[0.06]' : 'text-slate-400 ring-1 ring-white/10 hover:text-slate-100'
                }`}
                style={
                  on && st
                    ? { color: ACCENT[st.accent].hex, boxShadow: `0 0 0 1px ${ACCENT[st.accent].hex}66` }
                    : undefined
                }
              >
                {st?.name ?? id}（{n}）
              </button>
            )
          })}
        </div>
      </Panel>

      {list.length === 0 ? (
        <Panel title="依頼履歴">
          <div className="text-center py-8">
            <IconUsers className="w-8 h-8 text-slate-700 mx-auto" />
            <p className="text-[12px] text-slate-500 mt-2">
              {records.length === 0 ? 'まだ依頼の記録はありません' : '条件に合う依頼が見つかりませんでした'}
            </p>
            {records.length === 0 && (
              <p className="text-[10px] text-slate-600 mt-1">
                「AI社員」画面で依頼すると、ここに記録されていきます
              </p>
            )}
          </div>
        </Panel>
      ) : (
        grouped.map((g) => (
          <div key={g.label}>
            <p className="text-[11px] text-slate-500 mb-1.5 px-1">
              {g.label}（{g.items.length}件）
            </p>
            <div className="space-y-2">
              {g.items.map((r) => {
                const st = staffOf(r.staffId)
                const accent = st?.accent ?? 'cyan'
                const open = openId === r.id
                return (
                  <section key={r.id} className="panel p-3">
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : r.id)}
                      className="w-full flex items-start gap-2.5 text-left"
                    >
                      <Avatar name={r.staffName} src={st?.avatar} accent={accent} size={38} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2">
                          <span className={`text-[12px] font-bold ${ACCENT[accent].text}`}>{r.staffName}</span>
                          <span className="text-[9px] text-slate-600 font-num">{when(r.createdAt)}</span>
                        </p>
                        <p className="text-[12px] text-slate-100 mt-0.5 leading-snug">{r.request}</p>
                        {!open && (
                          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{r.answer}</p>
                        )}
                      </div>
                      <span className="text-[14px] text-slate-500 shrink-0">{open ? '▲' : '▼'}</span>
                    </button>

                    {open && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5">
                        {r.extra && (
                          <p className="text-[11px] text-slate-400">
                            条件：<span className="text-slate-200">{r.extra}</span>
                          </p>
                        )}

                        <div>
                          <p className="text-[10px] text-slate-500 mb-1">回答</p>
                          <p className="text-[12px] text-slate-100 leading-relaxed whitespace-pre-wrap">
                            {r.answer}
                          </p>
                        </div>

                        {r.deliverable && (
                          <div className="panel p-2.5">
                            <p className="text-[10px] text-slate-500 mb-1">成果物</p>
                            <pre className="text-[12px] text-slate-100 whitespace-pre-wrap font-sans leading-relaxed max-h-[320px] overflow-y-auto">
                              {r.deliverable}
                            </pre>
                          </div>
                        )}

                        {(r.points?.length ?? 0) > 0 && (
                          <div>
                            <p className="text-[10px] text-slate-500 mb-1">押さえておきたい点</p>
                            <ul className="space-y-1">
                              {r.points!.map((x, i) => (
                                <li key={i} className="flex gap-1.5 text-[11px] text-slate-200 leading-relaxed">
                                  <IconCheck className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
                                  {x}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {(r.nextTasks?.length ?? 0) > 0 && (
                          <div>
                            <p className="text-[10px] text-slate-500 mb-1">次にやるとよいこと</p>
                            <ul className="space-y-1.5">
                              {r.nextTasks!.map((t, i) => {
                                const done = added.includes(`${r.id}:${t}`)
                                return (
                                  <li key={i} className="flex items-center gap-2">
                                    <span className="text-[11px] text-slate-200 flex-1">{t}</span>
                                    {account.canEdit && (
                                      <button
                                        type="button"
                                        onClick={() => void saveTask(r, t)}
                                        disabled={done}
                                        className={`text-[10px] px-2 py-1 rounded ring-1 shrink-0 transition ${
                                          done
                                            ? 'text-emerald-300 ring-emerald-400/40 bg-emerald-400/10'
                                            : 'text-cyan-200 ring-cyan-400/40 hover:bg-cyan-400/15'
                                        }`}
                                      >
                                        {done ? '登録済み' : 'タスクに'}
                                      </button>
                                    )}
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 items-center">
                          <button
                            type="button"
                            onClick={() => void doCopy(r)}
                            className={`text-[11px] px-3 py-1.5 rounded-lg ring-1 transition ${
                              copied === r.id
                                ? 'text-emerald-300 ring-emerald-400/40 bg-emerald-400/10'
                                : 'text-cyan-200 ring-cyan-400/40 hover:bg-cyan-400/15'
                            }`}
                          >
                            {copied === r.id ? 'コピーしました' : '全文をコピー'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              downloadText(`${r.staffName}-${r.createdAt.slice(0, 10)}.txt`, recordToText(r))
                            }
                            className="text-[11px] px-3 py-1.5 rounded-lg text-slate-300 ring-1 ring-white/10 hover:ring-cyan-400/40 hover:text-cyan-200 transition"
                          >
                            保存
                          </button>
                          <StateBadge text={r.provider} />
                          {account.canEdit && (
                            <button
                              type="button"
                              onClick={() => void deleteRequest(r.id, Boolean(user))}
                              className="ml-auto text-[10px] text-slate-600 hover:text-red-300 transition"
                            >
                              この記録を削除
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
