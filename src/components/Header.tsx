import { useEffect, useState } from 'react'
import { useData } from '../lib/data'
import { useAuth } from '../lib/auth'
import { IconChart, IconSparkle, IconYoutube, IconSettings, IconBell, IconUsers, IconEdit } from './Icons'
import { StatusDot } from './Ui'

/* ============================================================
   上部ヘッダー（画面切替タブ）
   ============================================================ */

export type ScreenKey = 'management' | 'studio'

type Tab = {
  key: string
  label: string
  screen: ScreenKey
  /** 画面内のこの要素までスクロールする */
  anchor?: string
  icon: (p: { className?: string }) => JSX.Element
}

const TABS: Tab[] = [
  { key: 'management', label: '経営', screen: 'management', icon: IconChart },
  { key: 'staff', label: 'AI社員', screen: 'management', anchor: 'ai-staff', icon: IconUsers },
  { key: 'studio', label: '制作', screen: 'studio', icon: IconSparkle },
  { key: 'youtube', label: 'YouTube', screen: 'studio', anchor: 'youtube', icon: IconYoutube },
]

export function Header({
  screen,
  onChangeScreen,
  onOpenNotices,
  onOpenSettings,
  onOpenEdit,
  noticeCount,
}: {
  screen: ScreenKey
  onChangeScreen: (s: ScreenKey) => void
  onOpenNotices: () => void
  onOpenSettings: () => void
  onOpenEdit: () => void
  noticeCount: number
}) {
  const { data } = useData()
  const { signOut, demo, account } = useAuth()
  const COMPANY = data.company
  const [activeKey, setActiveKey] = useState<string>('management')
  const [clock, setClock] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    setActiveKey((k) => (TABS.find((t) => t.key === k)?.screen === screen ? k : screen))
  }, [screen])

  const handleTab = (tab: Tab) => {
    setActiveKey(tab.key)
    onChangeScreen(tab.screen)
    if (tab.anchor) {
      window.setTimeout(() => {
        document.getElementById(tab.anchor!)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 60)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const time = clock.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  const date = clock.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-night-950/80 border-b border-cyan-400/10">
      <div className="mx-auto max-w-[1800px] px-4 py-2.5 flex items-center gap-4">
        {/* ロゴ */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative w-9 h-9 rounded-xl grid place-content-center bg-gradient-to-br from-cyan-500/25 to-purple-600/25 ring-1 ring-cyan-400/40">
            <span className="font-display font-black text-cyan-300 text-sm">DD</span>
          </div>
          <div className="leading-tight">
            <h1 className="font-display text-[15px] font-bold tracking-wide text-slate-100">
              {COMPANY.system}
            </h1>
            <p className="text-[10px] text-cyan-400/70">{COMPANY.subtitle}</p>
          </div>
        </div>

        {/* タブ */}
        <nav className="flex-1 flex items-center justify-center gap-1 overflow-x-auto" aria-label="画面切替">
          {TABS.map((t) => {
            const on = activeKey === t.key
            const Icon = t.icon
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => handleTab(t)}
                aria-current={on ? 'page' : undefined}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] whitespace-nowrap transition ${
                  on
                    ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40 shadow-glow'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            )
          })}

          <span className="w-px h-5 bg-white/10 mx-1" />

          {account.canEdit && (
          <button
            type="button"
            onClick={onOpenEdit}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] text-slate-400 hover:text-slate-100 hover:bg-white/5 transition"
          >
            <IconEdit className="w-4 h-4" />
            データ編集
          </button>
          )}

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] text-slate-400 hover:text-slate-100 hover:bg-white/5 transition"
          >
            <IconSettings className="w-4 h-4" />
            設定
          </button>

          <button
            type="button"
            onClick={onOpenNotices}
            className="relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] text-slate-400 hover:text-slate-100 hover:bg-white/5 transition"
          >
            <IconBell className="w-4 h-4" />
            通知
            {noticeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 grid place-content-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {noticeCount}
              </span>
            )}
          </button>
        </nav>

        {/* 社長 */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right leading-tight hidden lg:block">
            <p className="font-num text-[13px] text-slate-200">{time}</p>
            <p className="text-[10px] text-slate-500">{date}</p>
          </div>
          <div className="w-9 h-9 rounded-full grid place-content-center bg-gradient-to-br from-blue-500/30 to-cyan-400/20 ring-1 ring-cyan-400/40 text-[13px] font-bold text-cyan-200">
            {account.name.charAt(0)}
          </div>
          <div className="leading-tight hidden md:block">
            <p className="text-[12px] text-slate-200">
              {account.title}：{account.name}
              {demo && (
                <span className="ml-1.5 text-[9px] px-1.5 py-[1px] rounded bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30">
                  見るだけ
                </span>
              )}
            </p>
            <p className="text-[10px] text-slate-500 flex items-center gap-1">
              <StatusDot /> {COMPANY.name}
              {!account.canEdit && <span className="text-slate-600">・閲覧のみ</span>}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="text-[11px] px-2.5 py-1.5 rounded-lg text-slate-400 ring-1 ring-white/10 hover:text-red-300 hover:ring-red-400/40 transition"
          >
            ログアウト
          </button>
        </div>
      </div>
    </header>
  )
}
