import { useState } from 'react'
import { Header } from './components/Header'
import type { ScreenKey } from './components/Header'
import { Dashboard } from './screens/Dashboard'
import { Studio } from './screens/Studio'
import { Drawer } from './components/Drawer'
import { NOTICES, COMPANY, SYSTEM_STATUS } from './data/mock'
import { StateBadge } from './components/Ui'

/* ============================================================
   DayDream AI Company System
   画面① 経営・AI社員ダッシュボード / 画面② クリエイティブスタジオ
   ============================================================ */

export default function App() {
  const [screen, setScreen] = useState<ScreenKey>('management')
  const [notices, setNotices] = useState(false)
  const [settings, setSettings] = useState(false)

  return (
    <div className="app-bg min-h-screen">
      <div className="relative z-10">
        <Header
          screen={screen}
          onChangeScreen={setScreen}
          onOpenNotices={() => setNotices(true)}
          onOpenSettings={() => setSettings(true)}
          noticeCount={NOTICES.length}
        />

        <main className="mx-auto max-w-[1800px] px-4 py-3">
          {screen === 'management' ? (
            <Dashboard onGoStudio={() => setScreen('studio')} />
          ) : (
            <Studio />
          )}
        </main>

        <footer className="mx-auto max-w-[1800px] px-4 py-5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-600">
          <span>
            {COMPANY.system} {COMPANY.version}
          </span>
          <span>© 2026 {COMPANY.name}. All rights reserved.</span>
        </footer>
      </div>

      {/* 通知ドロワー */}
      <Drawer open={notices} title="お知らせ・アラート" onClose={() => setNotices(false)}>
        <ul className="space-y-2">
          {NOTICES.map((n) => (
            <li key={n.id} className="panel p-3 flex items-start gap-2.5">
              <span className="text-[16px] leading-none">{n.icon}</span>
              <div className="flex-1">
                <p className="text-[12px] text-slate-100 leading-snug">{n.title}</p>
                <p className="text-[10px] text-slate-500 mt-1">{n.ago}</p>
              </div>
            </li>
          ))}
        </ul>
      </Drawer>

      {/* 設定ドロワー */}
      <Drawer open={settings} title="設定" onClose={() => setSettings(false)}>
        <div className="space-y-4 text-[12px]">
          <section className="panel p-3">
            <h3 className="text-[12px] font-bold text-slate-100 mb-2">会社情報</h3>
            <dl className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <dt className="text-slate-400">会社名</dt>
                <dd className="text-slate-200">{COMPANY.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">社長</dt>
                <dd className="text-slate-200">{COMPANY.presidentName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">バージョン</dt>
                <dd className="font-num text-slate-200">{COMPANY.version}</dd>
              </div>
            </dl>
          </section>

          <section className="panel p-3">
            <h3 className="text-[12px] font-bold text-slate-100 mb-2">サービス状態</h3>
            <ul className="space-y-1.5 text-[11px]">
              {SYSTEM_STATUS.map((s) => (
                <li key={s.name} className="flex items-center justify-between">
                  <span className="text-slate-300">{s.name}</span>
                  <StateBadge text={s.state} tone={s.state === '正常' ? 'good' : 'warn'} />
                </li>
              ))}
            </ul>
          </section>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            AI連携キー（OpenAI / Groq / Gemini）やFirebase設定は、次のフェーズでこの画面に追加します。
            APIキーはサーバー側（Vercel関数）で管理し、ブラウザには出しません。
          </p>
        </div>
      </Drawer>
    </div>
  )
}
