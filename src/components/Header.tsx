import { useEffect, useRef, useState } from 'react'
import { useData } from '../lib/data'
import { useAuth } from '../lib/auth'
import {
  IconChart,
  IconSparkle,
  IconYoutube,
  IconSettings,
  IconBell,
  IconUsers,
  IconEdit,
  IconMeeting,
  IconFolder,
} from './Icons'
import { StatusDot } from './Ui'
import { ScalePicker } from './ScalePicker'
import { useTheme, THEME_LABEL } from '../lib/theme'

/* ============================================================
   上部ヘッダー

   ・左：画面を切り替えるタブ
   ・右：道具のボタン（⚙ にまとめています）
   タブが増えても窮屈にならないよう、道具類は
   歯車ボタンの中に入れてあります。
   ============================================================ */

export type ScreenKey = 'management' | 'studio' | 'meeting' | 'staff' | 'progress' | 'history'
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
  { key: 'history', label: '依頼履歴', screen: 'history', icon: IconFolder },
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
  const [toolsOpen, setToolsOpen] = useState(false)
  const toolsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    setActiveKey((k) => (TABS.find((t) => t.key === k)?.screen === screen ? k : screen))
  }, [screen])

  // 道具メニューの外側を押したら閉じます
  useEffect(() => {
    if (!toolsOpen) return
    const onClick = (e: MouseEvent) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) setToolsOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setToolsOpen(false)
    window.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [toolsOpen])

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

  /** 道具のボタン（パソコンでは⚙の中、スマホでは☰の中に並びます） */
  const toolButtons = (
    <>
      {account.canEdit && (
        <button
          type="button"
          onClick={() => {
            setToolsOpen(false)
            setMenuOpen(false)
            onOpenEdit()
          }}
          className="w-full flex items-center gap-2 px-3.5 py-3 md:py-2.5 rounded-lg text-[14px] md:text-[13px] text-slate-400 hover:text-slate-100 hover:bg-white/5 transition text-left"
        >
          <IconEdit className="w-4 h-4 shrink-0" />
          データ編集
        </button>
      )}

      <button
        type="button"
        onClick={() => {
          toggle()
          setToolsOpen(false)
        }}
        title={`${THEME_LABEL[theme === 'dark' ? 'bright' : 'dark']}に切り替え`}
        className="w-full flex items-center gap-2 px-3.5 py-3 md:py-2.5 rounded-lg text-[14px] md:text-[13px] text-slate-400 hover:text-slate-100 hover:bg-white/5 transition text-left"
      >
        <span className="text-[15px] leading-none shrink-0">{theme === 'dark' ? '☀️' : '🌙'}</span>
        {THEME_LABEL[theme === 'dark' ? 'bright' : 'dark']}
      </button>

      <button
        type="button"
        onClick={() => {
          setToolsOpen(false)
          setMenuOpen(false)
          onOpenSettings()
        }}
        className="w-full flex items-center gap-2 px-3.5 py-3 md:py-2.5 rounded-lg text-[14px] md:text-[13px] text-slate-400 hover:text-slate-100 hover:bg-white/5 transition text-left"
      >
        <IconSettings className="w-4 h-4 shrink-0" />
        設定
      </button>

      <button
        type="button"
        onClick={() => {
          setToolsOpen(false)
          setMenuOpen(false)
          onOpenNotices()
        }}
        className="w-full relative flex items-center gap-2 px-3.5 py-3 md:py-2.5 rounded-lg text-[14px] md:text-[13px] text-slate-400 hover:text-slate-100 hover:bg-white/5 transition text-left"
      >
        <IconBell className="w-4 h-4 shrink-0" />
        通知
        {noticeCount > 0 && (
          <span className="ml-auto min-w-[20px] h-[20px] px-1 grid place-content-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {noticeCount}
          </span>
        )}
      </button>

      <div className="px-3.5 py-2 border-t border-white/10 mt-1">
        <p className="text-[10px] text-slate-500 mb-1.5">文字の大きさ</p>
        <ScalePicker />
      </div>
    </>
  )

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

      <div className="header-bar mx-auto max-w-[1800px] px-4 py-2.5 flex items-center gap-3">
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
              {/* 画面が狭いときは短い表示にします */}
              <span className="xl:hidden">DayDream AI</span>
              <span className="hidden xl:inline">{COMPANY.system}</span>
            </h1>
            <p className="hidden xl:block text-[10px] text-cyan-400/70">{COMPANY.subtitle}</p>
          </div>
        </div>

        {/* 画面切替タブ */}
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
                className={`flex items-center gap-1.5 px-3 py-3 md:py-2 rounded-lg text-[14px] md:text-[12.5px] whitespace-nowrap transition ${
                  on
                    ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40 shadow-glow'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {t.label}
              </button>
            )
          })}

          {/* スマホのメニューの中には、道具もそのまま並べます */}
          <div className="md:hidden mt-2 pt-2 border-t border-white/10 flex flex-col gap-1">
            {toolButtons}
          </div>
        </nav>

        {/* 右側 */}
        <div className="flex items-center gap-2.5 shrink-0 ml-auto md:ml-0">
          {/* 道具のボタン（パソコンのみ。押すとメニューが開きます） */}
          <div className="hidden md:block relative" ref={toolsRef}>
            <button
              type="button"
              onClick={() => setToolsOpen((v) => !v)}
              aria-label="道具メニューを開く"
              aria-expanded={toolsOpen}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12.5px] transition ${
                toolsOpen
                  ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
              }`}
            >
              <IconSettings className="w-4 h-4" />
              メニュー
              {noticeCount > 0 && !toolsOpen && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 grid place-content-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {noticeCount}
                </span>
              )}
            </button>

            {toolsOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-56 rounded-xl p-1.5 shadow-2xl border border-cyan-400/20 flex flex-col gap-0.5 z-40"
                style={{ backgroundColor: theme === 'bright' ? '#ffffff' : '#080c1a' }}
              >
                {toolButtons}
              </div>
            )}
          </div>

          <div className="text-right leading-tight hidden 2xl:block">
            <p className="font-num text-[13px] text-slate-200">{time}</p>
            <p className="text-[10px] text-slate-500">{date}</p>
          </div>

          <div className="w-9 h-9 rounded-full grid place-content-center bg-gradient-to-br from-blue-500/30 to-cyan-400/20 ring-1 ring-cyan-400/40 text-[13px] font-bold text-cyan-200 shrink-0">
            {account.name.charAt(0)}
          </div>

          <div className="leading-tight hidden lg:block">
            <p className="text-[12px] text-slate-200 whitespace-nowrap">
              {account.title}：{account.name}
              {demo && (
                <span className="ml-1.5 text-[9px] px-1.5 py-[1px] rounded bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/30">
                  見るだけ
                </span>
              )}
            </p>
            <p className="text-[10px] text-slate-500 flex items-center gap-1 whitespace-nowrap">
              <StatusDot /> {COMPANY.name}
              {!account.canEdit && <span className="text-slate-600">・閲覧のみ</span>}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="ログアウト"
            className="text-[11px] px-2.5 py-1.5 rounded-lg text-slate-400 ring-1 ring-white/10 hover:text-red-300 hover:ring-red-400/40 transition shrink-0"
          >
            <span className="hidden sm:inline">ログアウト</span>
            <span className="sm:hidden">↩</span>
          </button>
        </div>
      </div>
    </header>
  )
}
