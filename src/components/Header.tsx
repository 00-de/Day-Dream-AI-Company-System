import { useEffect, useState } from 'react'
import { useData } from '../lib/data'
import { useAuth } from '../lib/auth'
import { IconChart, IconSparkle, IconYoutube, IconSettings, IconBell, IconUsers, IconEdit, IconMeeting } from './Icons'
import { StatusDot } from './Ui'
import { ScalePicker } from './ScalePicker'
import { useTheme, THEME_LABEL } from '../lib/theme'

/* ============================================================
   上部ヘッダー（画面切替タブ）
   ============================================================ */

export type ScreenKey = 'management' | 'studio' | 'meeting' | 'staff' | 'progress'

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
  { key: 'staff', label: 'AI社員', screen: 'staff', icon: IconUsers },
  { key: 'progress', label: '進捗状況', screen: 'progress', icon: IconChart },
  { key: 'studio', label: '制作', screen: 'studio', icon: IconSparkle },
  { key: 'meeting', label: '会議ルーム', screen: 'meeting', icon: IconMeeting },
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
  const { theme, toggle } = useTheme()
  const COMPANY = data.company
  const [activeKey, setActiveKey] = useState<string>('management')
  const [clock, setClock] = useState(() => new Date())
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    setActiveKey((k) => (TABS.find((t) => t.key === k)?.screen === screen ? k : screen))
  }, [screen])

  const handleTab = (tab: Tab) => {
    setMenuOpen(false)
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
    <header className="sticky top-0 z-30 relative backdrop-blur-xl bg-night-950/80 border-b border-cyan-400/10">
      {/* スマホでメニューを開いたとき、背後をタップで閉じます */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 top-14 bg-black/40 -z-10"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="header-bar mx-auto max-w-[1800px] px-4 py-2.5 flex items-center gap-4">
        {/* スマホ用のメニューボタン */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="メニューを開く"
          aria-expanded={menuOpen}
          className="md:hidden w-9 h-9 shrink-0 grid place-content-center rounded-lg ring-1 ring-white/10 text-slate-300"
        >
          <span className="text-[16px] leading-none">{menuOpen ? '✕' : '☰'}</span>
        </button>

        {/* ロゴ */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative w-9 h-9 rounded-xl grid place-content-center bg-gradient-to-br from-cyan-500/25 to-purple-600/25 ring-1 ring-cyan-400/40">
            <span className="font-display font-black text-cyan-300 text-sm">DD</span>
          </div>
          <div className="leading-tight">
            <h1 className="font-display text-[15px] font-bold tracking-wide text-slate-100">
              {/* スマホでは短い表示にします */}
              <span className="md:hidden">DayDream AI</span>
              <span className="hidden md:inline">{COMPANY.system}</span>
            </h1>
            <p className="hidden sm:block text-[10px] text-cyan-400/70">{COMPANY.subtitle}</p>
          </div>
        </div>

        {/* タブ */}
        <nav
          className={`${
            menuOpen
              ? 'absolute top-full left-0 right-0 flex-col items-stretch gap-1 p-3 border-b border-cyan-400/20 flex max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain shadow-2xl'
              : 'hidden'
          } md:flex md:static md:flex-1 md:flex-row md:items-center md:justify-center md:gap-1 md:p-0 md:bg-transparent md:border-0 md:max-h-none md:overflow-x-auto md:overflow-y-visible md:shadow-none`}
          aria-label="画面切替"
          style={menuOpen ? { backgroundColor: theme === 'bright' ? '#ffffff' : '#080c1a' } : undefined}
        >
          {TABS.map((t) => {
            const on = activeKey === t.key
            const Icon = t.icon
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => handleTab(t)}
                aria-current={on ? 'page' : undefined}
                className={`flex items-center gap-2 px-3.5 py-3 md:py-2 rounded-lg text-[14px] md:text-[13px] whitespace-nowrap transition ${
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

          <span className="hidden md:block w-px h-5 bg-white/10 mx-1" />

          {account.canEdit && (
          <button
            type="button"
            onClick={onOpenEdit}
            className="flex items-center gap-2 px-3.5 py-3 md:py-2 rounded-lg text-[14px] md:text-[13px] text-slate-400 hover:text-slate-100 hover:bg-white/5 transition"
          >
            <IconEdit className="w-4 h-4" />
            データ編集
          </button>
          )}

          <button
            type="button"
            onClick={toggle}
            title={`${THEME_LABEL[theme === 'dark' ? 'bright' : 'dark']}に切り替え`}
            className="flex items-center gap-2 px-3.5 py-3 md:py-2 rounded-lg text-[14px] md:text-[13px] text-slate-400 hover:text-slate-100 hover:bg-white/5 transition"
          >
            <span className="text-[15px] leading-none">{theme === 'dark' ? '☀️' : '🌙'}</span>
            {THEME_LABEL[theme === 'dark' ? 'bright' : 'dark']}
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-3.5 py-3 md:py-2 rounded-lg text-[14px] md:text-[13px] text-slate-400 hover:text-slate-100 hover:bg-white/5 transition"
          >
            <IconSettings className="w-4 h-4" />
            設定
          </button>

          {/* スマホの折りたたみメニュー内にも文字サイズを置きます */}
          <span className="sm:hidden py-1">
            <ScalePicker />
          </span>

          <button
            type="button"
            onClick={onOpenNotices}
            className="relative flex items-center gap-2 px-3.5 py-3 md:py-2 rounded-lg text-[14px] md:text-[13px] text-slate-400 hover:text-slate-100 hover:bg-white/5 transition"
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
        <div className="flex items-center gap-3 shrink-0 ml-auto md:ml-0">
          <span className="hidden sm:block">
            <ScalePicker />
          </span>

          <div className="text-right leading-tight hidden xl:block">
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
            aria-label="ログアウト"
            className="text-[11px] px-2.5 py-1.5 rounded-lg text-slate-400 ring-1 ring-white/10 hover:text-red-300 hover:ring-red-400/40 transition"
          >
            <span className="hidden sm:inline">ログアウト</span>
            <span className="sm:hidden">↩</span>
          </button>
        </div>
      </div>
    </header>
  )
}
