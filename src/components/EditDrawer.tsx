import { useEffect, useState } from 'react'
import type { AppData, AiStaff, StaffStatus } from '../types'
import { useData } from '../lib/data'
import { Drawer } from './Drawer'
import { STAFF_GROUP_LABEL } from '../data/defaults'

/* ============================================================
   データ編集
   画面に出ている数字・文章をこの場で書き換えて保存します。
   保存先：ログイン中は Firestore、見るだけモードはこの端末。
   ============================================================ */

type Tab = 'finance' | 'schedule' | 'project' | 'staff' | 'media'

const TABS: [Tab, string][] = [
  ['finance', '経営数値'],
  ['schedule', '予定・お知らせ'],
  ['project', 'プロジェクト'],
  ['staff', 'AI社員'],
  ['media', 'YouTube・ライブ'],
]

/** 入力欄 */
function Field({
  label,
  value,
  onChange,
  type = 'text',
  suffix,
}: {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: 'text' | 'number'
  suffix?: string
}) {
  return (
    <label className="block">
      <span className="block text-[10px] text-slate-400 mb-1">{label}</span>
      <span className="flex items-center gap-1.5">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-night-950/70 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-100 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none transition"
        />
        {suffix && <span className="text-[10px] text-slate-500 shrink-0">{suffix}</span>}
      </span>
    </label>
  )
}

export function EditDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, save, saveState, reset, source } = useData()
  const [tab, setTab] = useState<Tab>('finance')
  const [draft, setDraft] = useState<AppData>(data)

  // 開いたときに最新のデータを読み込む
  useEffect(() => {
    if (open) setDraft(data)
  }, [open, data])

  const set = <K extends keyof AppData>(key: K, value: AppData[K]) =>
    setDraft((d) => ({ ...d, [key]: value }))

  const num = (v: string) => Number(v.replace(/[^0-9.-]/g, '')) || 0

  const updateStaff = (id: string, patch: Partial<AiStaff>) =>
    set('staff', draft.staff.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const submit = async () => {
    await save(draft)
  }

  const sourceLabel =
    source === 'firestore' ? 'Firestoreに保存されます' : 'この端末の中だけに保存されます'

  return (
    <Drawer open={open} title="データ編集" onClose={onClose}>
      {/* タブ */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`text-[11px] px-2.5 py-1.5 rounded-md transition ${
              tab === k
                ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40'
                : 'text-slate-400 ring-1 ring-white/10 hover:text-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── 経営数値 ───────────────────────── */}
      {tab === 'finance' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="今月の売上"
              type="number"
              value={draft.finance.monthSales}
              onChange={(v) => set('finance', { ...draft.finance, monthSales: num(v) })}
              suffix="円"
            />
            <Field
              label="前月比（売上）"
              value={draft.finance.monthSalesDiff}
              onChange={(v) => set('finance', { ...draft.finance, monthSalesDiff: v })}
            />
            <Field
              label="今月の利益"
              type="number"
              value={draft.finance.monthProfit}
              onChange={(v) => set('finance', { ...draft.finance, monthProfit: num(v) })}
              suffix="円"
            />
            <Field
              label="前月比（利益）"
              value={draft.finance.monthProfitDiff}
              onChange={(v) => set('finance', { ...draft.finance, monthProfitDiff: v })}
            />
            <Field
              label="今月の目標"
              type="number"
              value={draft.finance.goal}
              onChange={(v) => set('finance', { ...draft.finance, goal: num(v) })}
              suffix="円"
            />
            <Field
              label="達成額"
              type="number"
              value={draft.finance.achieved}
              onChange={(v) => set('finance', { ...draft.finance, achieved: num(v) })}
              suffix="円"
            />
            <Field
              label="目標達成率"
              type="number"
              value={draft.finance.goalRate}
              onChange={(v) => set('finance', { ...draft.finance, goalRate: num(v) })}
              suffix="%"
            />
            <Field
              label="残り日数"
              type="number"
              value={draft.finance.daysLeft}
              onChange={(v) => set('finance', { ...draft.finance, daysLeft: num(v) })}
              suffix="日"
            />
          </div>

          <div className="pt-3 border-t border-white/10 grid grid-cols-2 gap-2">
            <Field
              label="会社名"
              value={draft.company.name}
              onChange={(v) => set('company', { ...draft.company, name: v })}
            />
            <Field
              label="社長名"
              value={draft.company.presidentName}
              onChange={(v) => set('company', { ...draft.company, presidentName: v })}
            />
          </div>
        </div>
      )}

      {/* ── 予定・お知らせ ─────────────────── */}
      {tab === 'schedule' && (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] text-slate-300 mb-2">今日の予定</p>
            <div className="space-y-2">
              {draft.schedule.map((s, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={s.time}
                    onChange={(e) =>
                      set(
                        'schedule',
                        draft.schedule.map((x, j) => (i === j ? { ...x, time: e.target.value } : x)),
                      )
                    }
                    className="w-16 bg-night-950/70 rounded-lg px-2 py-1.5 text-[12px] font-num text-slate-100 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
                  />
                  <input
                    value={s.title}
                    onChange={(e) =>
                      set(
                        'schedule',
                        draft.schedule.map((x, j) => (i === j ? { ...x, title: e.target.value } : x)),
                      )
                    }
                    className="flex-1 min-w-0 bg-night-950/70 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-100 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => set('schedule', draft.schedule.filter((_, j) => j !== i))}
                    className="text-slate-500 hover:text-red-300 text-[12px] px-1"
                    aria-label="この予定を削除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                set('schedule', [...draft.schedule, { time: '09:00', title: '新しい予定', accent: 'cyan' }])
              }
              className="mt-2 text-[11px] px-2.5 py-1.5 rounded-md ring-1 ring-white/10 text-slate-300 hover:ring-cyan-400/40 hover:text-cyan-200 transition"
            >
              ＋ 予定を追加
            </button>
          </div>

          <div className="pt-3 border-t border-white/10">
            <p className="text-[11px] text-slate-300 mb-2">お知らせ・アラート</p>
            <div className="space-y-2">
              {draft.notices.map((n, i) => (
                <div key={n.id} className="flex gap-2 items-center">
                  <input
                    value={n.icon}
                    onChange={(e) =>
                      set('notices', draft.notices.map((x, j) => (i === j ? { ...x, icon: e.target.value } : x)))
                    }
                    className="w-10 text-center bg-night-950/70 rounded-lg px-1 py-1.5 text-[13px] ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
                  />
                  <input
                    value={n.title}
                    onChange={(e) =>
                      set('notices', draft.notices.map((x, j) => (i === j ? { ...x, title: e.target.value } : x)))
                    }
                    className="flex-1 min-w-0 bg-night-950/70 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-100 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => set('notices', draft.notices.filter((_, j) => j !== i))}
                    className="text-slate-500 hover:text-red-300 text-[12px] px-1"
                    aria-label="このお知らせを削除"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                set('notices', [
                  ...draft.notices,
                  { id: `n${Date.now()}`, icon: '📢', title: '新しいお知らせ', ago: 'たった今', tone: 'info' },
                ])
              }
              className="mt-2 text-[11px] px-2.5 py-1.5 rounded-md ring-1 ring-white/10 text-slate-300 hover:ring-cyan-400/40 hover:text-cyan-200 transition"
            >
              ＋ お知らせを追加
            </button>
          </div>
        </div>
      )}

      {/* ── プロジェクト ───────────────────── */}
      {tab === 'project' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Field
              label="進行中"
              type="number"
              value={draft.projectSummary.running}
              onChange={(v) => set('projectSummary', { ...draft.projectSummary, running: num(v) })}
              suffix="件"
            />
            <Field
              label="完了"
              type="number"
              value={draft.projectSummary.done}
              onChange={(v) => set('projectSummary', { ...draft.projectSummary, done: num(v) })}
              suffix="件"
            />
            <Field
              label="保留"
              type="number"
              value={draft.projectSummary.hold}
              onChange={(v) => set('projectSummary', { ...draft.projectSummary, hold: num(v) })}
              suffix="件"
            />
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2">
            {draft.projects.map((p, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  value={p.name}
                  onChange={(e) =>
                    set('projects', draft.projects.map((x, j) => (i === j ? { ...x, name: e.target.value } : x)))
                  }
                  className="flex-1 min-w-0 bg-night-950/70 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-100 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
                />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={p.progress}
                  onChange={(e) =>
                    set(
                      'projects',
                      draft.projects.map((x, j) => (i === j ? { ...x, progress: Number(e.target.value) } : x)),
                    )
                  }
                  className="w-24 accent-cyan-400"
                  aria-label={`${p.name} の進捗`}
                />
                <span className="w-9 text-right font-num text-[11px] text-cyan-300">{p.progress}%</span>
                <button
                  type="button"
                  onClick={() => set('projects', draft.projects.filter((_, j) => j !== i))}
                  className="text-slate-500 hover:text-red-300 text-[12px] px-1"
                  aria-label="このプロジェクトを削除"
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => set('projects', [...draft.projects, { name: '新しいプロジェクト', progress: 0 }])}
              className="text-[11px] px-2.5 py-1.5 rounded-md ring-1 ring-white/10 text-slate-300 hover:ring-cyan-400/40 hover:text-cyan-200 transition"
            >
              ＋ プロジェクトを追加
            </button>
          </div>
        </div>
      )}

      {/* ── AI社員 ─────────────────────────── */}
      {tab === 'staff' && (
        <div className="space-y-2">
          <p className="text-[10px] text-slate-500 mb-2">
            担当・稼働状況・タスク数を変更できます（全{draft.staff.length}人）
          </p>
          {draft.staff.map((s) => (
            <div key={s.id} className="panel p-2.5 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-slate-100 truncate flex-1">{s.name}</span>
                <span className="text-[9px] text-slate-500">{STAFF_GROUP_LABEL[s.group]}</span>
              </div>
              <input
                value={s.role}
                onChange={(e) => updateStaff(s.id, { role: e.target.value })}
                className="w-full bg-night-950/70 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-200 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
                aria-label={`${s.name} の担当`}
              />
              <div className="flex gap-2">
                <select
                  value={s.status}
                  onChange={(e) => updateStaff(s.id, { status: e.target.value as StaffStatus })}
                  className="flex-1 bg-night-950/70 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
                  aria-label={`${s.name} の稼働状況`}
                >
                  <option value="active">稼働中</option>
                  <option value="standby">待機中</option>
                  <option value="maintenance">メンテ中</option>
                </select>
                <input
                  type="number"
                  min={0}
                  value={s.tasks}
                  onChange={(e) => updateStaff(s.id, { tasks: Number(e.target.value) || 0 })}
                  className="w-20 bg-night-950/70 rounded-lg px-2 py-1.5 text-[11px] font-num text-slate-200 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
                  aria-label={`${s.name} のタスク数`}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── YouTube・ライブ ────────────────── */}
      {tab === 'media' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="チャンネル登録者数"
              value={draft.youtube.subscribers}
              onChange={(v) => set('youtube', { ...draft.youtube, subscribers: v })}
            />
            <Field
              label="登録者の増減"
              value={draft.youtube.subscribersDiff}
              onChange={(v) => set('youtube', { ...draft.youtube, subscribersDiff: v })}
            />
            <Field
              label="総再生回数"
              value={draft.youtube.views}
              onChange={(v) => set('youtube', { ...draft.youtube, views: v })}
            />
            <Field
              label="再生回数の増減"
              value={draft.youtube.viewsDiff}
              onChange={(v) => set('youtube', { ...draft.youtube, viewsDiff: v })}
            />
            <Field
              label="総視聴時間"
              value={draft.youtube.watchHours}
              onChange={(v) => set('youtube', { ...draft.youtube, watchHours: v })}
            />
            <Field
              label="視聴時間の増減"
              value={draft.youtube.watchHoursDiff}
              onChange={(v) => set('youtube', { ...draft.youtube, watchHoursDiff: v })}
            />
          </div>

          <div className="pt-3 border-t border-white/10 space-y-2">
            <p className="text-[11px] text-slate-300">次回ライブ</p>
            <Field
              label="日付"
              value={draft.nextLive.date}
              onChange={(v) => set('nextLive', { ...draft.nextLive, date: v })}
            />
            <Field
              label="タイトル"
              value={draft.nextLive.title}
              onChange={(v) => set('nextLive', { ...draft.nextLive, title: v })}
            />
            <Field
              label="会場"
              value={draft.nextLive.venue}
              onChange={(v) => set('nextLive', { ...draft.nextLive, venue: v })}
            />
            <Field
              label="準備進捗"
              type="number"
              value={draft.nextLive.progress}
              onChange={(v) => set('nextLive', { ...draft.nextLive, progress: num(v) })}
              suffix="%"
            />
            <div className="space-y-1.5 pt-1">
              {draft.nextLive.checks.map((c, i) => (
                <label key={i} className="flex items-center gap-2 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={c.done}
                    onChange={(e) =>
                      set('nextLive', {
                        ...draft.nextLive,
                        checks: draft.nextLive.checks.map((x, j) =>
                          i === j ? { ...x, done: e.target.checked } : x,
                        ),
                      })
                    }
                    className="accent-emerald-400"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 保存 ───────────────────────────── */}
      <div className="sticky bottom-0 -mx-4 mt-5 px-4 py-3 bg-night-900/95 backdrop-blur border-t border-white/10">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={saveState === 'saving'}
            className="flex-1 py-2.5 rounded-lg text-[13px] font-bold text-cyan-50 bg-cyan-500/30 ring-1 ring-cyan-400/50 hover:bg-cyan-500/45 disabled:opacity-50 transition"
          >
            {saveState === 'saving'
              ? '保存しています…'
              : saveState === 'saved'
                ? '保存しました'
                : saveState === 'error'
                  ? '保存できませんでした'
                  : '保存する'}
          </button>
          <button
            type="button"
            onClick={() => void reset()}
            className="px-3 rounded-lg text-[11px] text-slate-400 ring-1 ring-white/10 hover:text-red-300 hover:ring-red-400/40 transition"
          >
            初期値に戻す
          </button>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">{sourceLabel}</p>
      </div>
    </Drawer>
  )
}
