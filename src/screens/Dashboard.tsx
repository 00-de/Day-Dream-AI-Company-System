import { useMemo, useState } from 'react'
import type { AiStaff } from '../types'
import { STAFF_GROUP_LABEL, countStaffStatus, yen } from '../data/defaults'
import { useData } from '../lib/data'
import { Panel, MoreLink, ProgressBar, StateBadge, ACCENT, StatusDot } from '../components/Ui'
import { Donut, Sparkline } from '../components/Charts'
import { StaffCard } from '../components/StaffCard'
import { SecretaryChat } from '../components/SecretaryChat'
import { Avatar } from '../components/Avatar'
import { IconMusic, IconImage, IconFilm, IconMic, IconYoutube, IconCloud, IconCheck } from '../components/Icons'

/* ============================================================
   画面① 経営・AI社員ダッシュボード
   ============================================================ */

const TOOLS = [
  { label: '音楽制作', icon: IconMusic, accent: 'purple' as const },
  { label: '画像生成', icon: IconImage, accent: 'cyan' as const },
  { label: 'MV制作', icon: IconFilm, accent: 'pink' as const },
  { label: 'ライブ管理', icon: IconMic, accent: 'amber' as const },
  { label: 'YouTube管理', icon: IconYoutube, accent: 'blue' as const },
]

export function Dashboard({ onGoStudio }: { onGoStudio: () => void }) {
  const { data } = useData()
  const [group, setGroup] = useState<'all' | 'core' | 'member' | 'staff'>('all')
  const [selected, setSelected] = useState<AiStaff | null>(null)

  // Firestore（または端末内）のデータを使う
  const {
    finance: FINANCE,
    salesTrend: SALES_TREND,
    profitTrend: PROFIT_TREND,
    schedule: SCHEDULE,
    notices: NOTICES,
    projects: PROJECTS,
    projectSummary: PROJECT_SUMMARY,
    files: FILES,
    storage: STORAGE,
    systemStatus: SYSTEM_STATUS,
    systemMetrics: SYSTEM_METRICS,
    network: NETWORK,
    backup: BACKUP,
    staff: AI_STAFF,
  } = data

  const s = countStaffStatus(AI_STAFF)

  const list = useMemo(
    () => (group === 'all' ? AI_STAFF : AI_STAFF.filter((x) => x.group === group)),
    [group, AI_STAFF],
  )

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
      {/* ─────────── 左：メインエリア ─────────── */}
      <div className="xl:col-span-9 space-y-3">
        {/* KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Panel title="売上サマリー（今月）" className="lg:col-span-1">
            <p className="font-num text-[22px] font-bold text-slate-50 leading-none">{yen(FINANCE.monthSales)}</p>
            <p className="mt-1 text-[10px] text-slate-400">
              前月比 <span className="text-emerald-400 font-bold">{FINANCE.monthSalesDiff}</span>
            </p>
            <div className="mt-1.5 -mx-1">
              <Sparkline data={SALES_TREND} accent="blue" height={40} />
            </div>
          </Panel>

          <Panel title="利益サマリー（今月）">
            <p className="font-num text-[22px] font-bold text-slate-50 leading-none">{yen(FINANCE.monthProfit)}</p>
            <p className="mt-1 text-[10px] text-slate-400">
              前月比 <span className="text-emerald-400 font-bold">{FINANCE.monthProfitDiff}</span>
            </p>
            <div className="mt-1.5 -mx-1">
              <Sparkline data={PROFIT_TREND} accent="purple" height={40} />
            </div>
          </Panel>

          <Panel title="目標達成率">
            <div className="flex items-center gap-3">
              <Donut value={FINANCE.goalRate} size={82} accent="blue" />
              <div className="text-[10px] leading-relaxed">
                <p className="text-slate-400">目標</p>
                <p className="font-num text-slate-100 text-[12px]">{yen(FINANCE.goal)}</p>
                <p className="mt-1 text-slate-400">達成</p>
                <p className="font-num text-slate-100 text-[12px]">{yen(FINANCE.achieved)}</p>
                <p className="mt-1 text-cyan-300">残り {FINANCE.daysLeft} 日</p>
              </div>
            </div>
          </Panel>

          <Panel title="AI稼働状況">
            <div className="flex items-center gap-3">
              <Donut value={s.rate} size={82} accent="green" />
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
                  <span className="text-slate-400">メンテ中</span>
                  <span className="font-num text-slate-100">{s.maintenance}人</span>
                </li>
                <li className="pt-1 border-t border-white/10 flex justify-between gap-3">
                  <span className="text-slate-400">合計</span>
                  <span className="font-num text-slate-100">{s.total}人</span>
                </li>
              </ul>
            </div>
          </Panel>

          <Panel title="今日の予定" action={<MoreLink label="週間" />}>
            <ul className="space-y-1.5">
              {SCHEDULE.map((sc) => (
                <li key={sc.time} className="flex items-center gap-2 text-[11px]">
                  <span className="font-num text-slate-400 w-9 shrink-0">{sc.time}</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${ACCENT[sc.accent].bg} shrink-0`} />
                  <span className="text-slate-200 truncate">{sc.title}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* AI社員 */}
        <Panel
          title={`AI社員（${AI_STAFF.length}人）`}
          className="scroll-mt-20"
          action={
            <div className="flex gap-1">
              {(['all', 'core', 'member', 'staff'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGroup(g)}
                  className={`text-[10px] px-2 py-1 rounded-md transition ${
                    group === g
                      ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                  }`}
                >
                  {g === 'all' ? 'すべて' : STAFF_GROUP_LABEL[g]}
                </button>
              ))}
            </div>
          }
        >
          <div id="ai-staff" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5 gap-2.5">
            {list.map((st) => (
              <StaffCard key={st.id} staff={st} onSelect={setSelected} />
            ))}
          </div>

          {selected && (
            <div className="mt-3 panel p-3 flex items-start gap-3">
              <Avatar name={selected.name} src={selected.avatar} accent={selected.accent} size={56} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-slate-100">
                  {selected.name}
                  {selected.nameEn && <span className="ml-2 text-[10px] text-slate-500">{selected.nameEn}</span>}
                </p>
                <p className="text-[11px] text-slate-400">{selected.role}</p>
                <p className="mt-1 text-[11px] text-slate-300">
                  現在 <span className="font-num text-cyan-300">{selected.tasks}件</span> のタスクを担当中。
                  指示はAI秘書チャットから送信できます。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-[11px] text-slate-500 hover:text-slate-200"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>
          )}
        </Panel>

        {/* 下段 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Panel title="ファイル管理" action={<MoreLink onClick={onGoStudio} />}>
            <div className="grid grid-cols-5 gap-2">
              {FILES.map((f) => (
                <div key={f.label} className="text-center panel-hover panel py-2.5 px-1">
                  <div className="text-[16px]">{f.icon}</div>
                  <p className="text-[10px] text-slate-300 mt-1 truncate">{f.label}</p>
                  <p className="font-num text-[10px] text-slate-500">{f.count}</p>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                <span>ストレージ使用量</span>
                <span className="font-num">
                  {STORAGE.used} {STORAGE.unit} / {STORAGE.total} {STORAGE.unit}
                </span>
              </div>
              <ProgressBar value={(STORAGE.used / STORAGE.total) * 100} accent="gradient" />
            </div>
          </Panel>

          <Panel title="自動バックアップ">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl grid place-content-center bg-cyan-400/10 ring-1 ring-cyan-400/30 text-cyan-300">
                <IconCloud className="w-6 h-6" />
              </div>
              <div className="text-[11px] space-y-0.5">
                <p className="text-slate-400">
                  最終バックアップ：<span className="text-slate-100 font-num">{BACKUP.last}</span>
                </p>
                <p className="text-slate-400">
                  次回バックアップ：<span className="text-slate-100 font-num">{BACKUP.next}</span>
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
              <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
              バックアップ状況
              <span className="ml-auto">
                <StateBadge text={BACKUP.state} />
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {SYSTEM_METRICS.map((m) => (
                <div key={m.label} className="text-center">
                  <Donut value={m.value} size={62} stroke={6} accent={m.accent} />
                  <p className="text-[9px] text-slate-400 mt-1">{m.label}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="AI秘書チャット">
            <SecretaryChat compact />
          </Panel>
        </div>
      </div>

      {/* ─────────── 右：サイドレール ─────────── */}
      <div className="xl:col-span-3 space-y-3">
        <Panel title="お知らせ・アラート" action={<MoreLink />}>
          <ul className="space-y-2">
            {NOTICES.map((n) => (
              <li key={n.id} className="flex items-start gap-2">
                <span className="text-[14px] leading-none mt-0.5">{n.icon}</span>
                <p className="flex-1 text-[11px] text-slate-200 leading-snug">{n.title}</p>
                <span className="text-[9px] text-slate-500 shrink-0">{n.ago}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="制作・運用ツール" action={<MoreLink label="すべてのツール" onClick={onGoStudio} />}>
          <div className="grid grid-cols-4 gap-2">
            {TOOLS.map((t) => {
              const Icon = t.icon
              const a = ACCENT[t.accent]
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={onGoStudio}
                  className="panel panel-hover py-2.5 grid place-items-center gap-1"
                >
                  <span className={`w-8 h-8 rounded-lg grid place-content-center ${a.text}`} style={{ background: `${a.hex}1f` }}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-[9px] text-slate-300 text-center leading-tight">{t.label}</span>
                </button>
              )
            })}
          </div>
        </Panel>

        <Panel title="プロジェクト状況" action={<MoreLink />}>
          <div className="flex gap-2 mb-3 text-[10px]">
            <span className="flex-1 panel py-1.5 text-center">
              進行中 <b className="font-num text-cyan-300">{PROJECT_SUMMARY.running}</b>
            </span>
            <span className="flex-1 panel py-1.5 text-center">
              完了 <b className="font-num text-emerald-300">{PROJECT_SUMMARY.done}</b>
            </span>
            <span className="flex-1 panel py-1.5 text-center">
              保留 <b className="font-num text-amber-300">{PROJECT_SUMMARY.hold}</b>
            </span>
          </div>
          <ul className="space-y-2.5">
            {PROJECTS.map((p) => (
              <li key={p.name}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-slate-300">{p.name}</span>
                  <span className="font-num text-slate-400">{p.progress}%</span>
                </div>
                <ProgressBar value={p.progress} accent="gradient" height={5} />
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="システムステータス" action={<MoreLink label="詳細を見る" />}>
          <ul className="space-y-2">
            {SYSTEM_STATUS.map((x) => (
              <li key={x.name} className="flex items-center gap-2 text-[11px]">
                <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300">{x.name}</span>
                <span className="ml-auto">
                  <StateBadge text={x.state} tone={x.state === '正常' ? 'good' : 'warn'} />
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-400">
              <StatusDot /> ネットワーク
            </span>
            <span className="font-num text-cyan-300">
              {NETWORK.speed} <span className="text-[9px] text-slate-500">{NETWORK.unit}</span>
            </span>
          </div>
        </Panel>
      </div>
    </div>
  )
}
