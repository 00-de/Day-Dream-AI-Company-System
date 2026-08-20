import { useEffect, useState } from 'react'
import { Header } from './components/Header'
import type { ScreenKey } from './components/Header'
import { Dashboard } from './screens/Dashboard'
import { Studio } from './screens/Studio'
import { MeetingRoom } from './screens/MeetingRoom'
import { StaffBoard } from './screens/StaffBoard'
import { ProgressBoard } from './screens/ProgressBoard'
import { Drawer } from './components/Drawer'
import { EditDrawer } from './components/EditDrawer'
import { Login } from './components/Login'
import { StateBadge } from './components/Ui'
import { AuthProvider, useAuth } from './lib/auth'
import { DataProvider, useData } from './lib/data'
import { LibraryProvider } from './lib/library'
import { isFirebaseConfigured } from './lib/firebase'
import { ScaleProvider } from './lib/uiScale'
import { ThemeProvider } from './lib/theme'
import { ScaleSettings } from './components/ScalePicker'
import { checkAiStatus, getAiSettings, type AiSettings } from './lib/ai'

/* ============================================================
   DayDream AI Company System v1.1.0
   フェーズ2：Firebase Auth（社長ログイン）＋ Firestore 連携
   ============================================================ */

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="app-bg min-h-screen grid place-items-center">
      <div className="relative z-10 text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl grid place-content-center bg-gradient-to-br from-cyan-500/25 to-purple-600/25 ring-1 ring-cyan-400/40 animate-pulseDot">
          <span className="font-display font-black text-cyan-300">DD</span>
        </div>
        <p className="mt-3 text-[12px] text-slate-400">{message}</p>
      </div>
    </div>
  )
}

/** ログイン後の本体 */
function Main() {
  const { data, loading, source } = useData()
  const { user, demo, account, signOut } = useAuth()
  const [screen, setScreen] = useState<ScreenKey>('management')
  const [notices, setNotices] = useState(false)
  const [settings, setSettings] = useState(false)
  const [edit, setEdit] = useState(false)
  const [aiProviders, setAiProviders] = useState<string[] | null>(null)
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null)

  // 設定を開いたときに、AIの接続状態を確認する
  useEffect(() => {
    if (settings) {
      void checkAiStatus().then(setAiProviders)
      void getAiSettings().then(setAiSettings)
    }
  }, [settings])

  if (loading) return <LoadingScreen message="データを読み込んでいます…" />

  const sourceText =
    source === 'firestore'
      ? 'Firestore に接続中'
      : source === 'local'
        ? 'この端末に保存中'
        : '初期データを表示中'

  return (
    <div className="app-bg min-h-screen">
      <div className="relative z-10">
        {/* 見るだけモードのときの注意帯 */}
        {demo && (
          <div className="bg-amber-500/90 text-amber-950 px-4 py-2 text-center">
            <p className="text-[12px] font-bold">
              見るだけモードです。このデータは他の端末と共有されません
            </p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-1 text-[11px] font-bold underline hover:no-underline"
            >
              ログインして全員のデータを見る
            </button>
          </div>
        )}

        <Header
          screen={screen}
          onChangeScreen={setScreen}
          onOpenNotices={() => setNotices(true)}
          onOpenSettings={() => setSettings(true)}
          onOpenEdit={() => setEdit(true)}
          noticeCount={data.notices.length}
        />

        <main className="mx-auto max-w-[1800px] px-4 py-3">
          {screen === 'management' && <Dashboard onGoStudio={() => setScreen('studio')} />}
          {screen === 'studio' && <Studio />}
          {screen === 'staff' && <StaffBoard />}
          {screen === 'progress' && <ProgressBoard />}
          {screen === 'meeting' && <MeetingRoom />}
        </main>

        <footer className="mx-auto max-w-[1800px] px-4 py-5 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-600">
          <span>
            {data.company.system} {data.company.version}
          </span>
          <span>{sourceText}</span>
          <span>© 2026 {data.company.name}. All rights reserved.</span>
        </footer>
      </div>

      {/* 通知 */}
      <Drawer open={notices} title="お知らせ・アラート" onClose={() => setNotices(false)}>
        <ul className="space-y-2">
          {data.notices.map((n) => (
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

      {/* データ編集 */}
      <EditDrawer open={edit} onClose={() => setEdit(false)} />

      {/* 設定 */}
      <Drawer open={settings} title="設定" onClose={() => setSettings(false)}>
        <div className="space-y-4">
          <section className="panel p-3">
            <h3 className="text-[12px] font-bold text-slate-100 mb-2">アカウント</h3>
            <dl className="space-y-1 text-[11px]">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">ログイン中</dt>
                <dd className="text-slate-200 text-right">
                  {account.title}：{account.name}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">状態</dt>
                <dd className="text-slate-200 text-right">
                  {user ? 'ログイン中' : demo ? '見るだけモード' : '未ログイン'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">権限</dt>
                <dd>
                  <StateBadge
                    text={account.canEdit ? 'データ編集できます' : '閲覧のみ'}
                    tone={account.canEdit ? 'good' : 'warn'}
                  />
                </dd>
              </div>
              {user?.email && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-400">メールアドレス</dt>
                  <dd className="text-slate-200 text-right break-all">{user.email}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">保存先</dt>
                <dd className="text-slate-200">{sourceText}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">Firebase設定</dt>
                <dd>
                  <StateBadge
                    text={isFirebaseConfigured ? '設定済み' : '未設定'}
                    tone={isFirebaseConfigured ? 'good' : 'warn'}
                  />
                </dd>
              </div>
            </dl>
          </section>

          <section className="panel p-3">
            <h3 className="text-[12px] font-bold text-slate-100 mb-2">文字の大きさ</h3>
            <ScaleSettings />
          </section>

          <section className="panel p-3">
            <h3 className="text-[12px] font-bold text-slate-100 mb-2">AI接続</h3>
            <dl className="space-y-1 text-[11px]">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">状態</dt>
                <dd>
                  {aiProviders === null ? (
                    <span className="text-slate-500">確認中…</span>
                  ) : (
                    <StateBadge
                      text={aiProviders.length > 0 ? '接続できます' : '簡易応答モード'}
                      tone={aiProviders.length > 0 ? 'good' : 'warn'}
                    />
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-400">使えるAI</dt>
                <dd className="text-slate-200 text-right">
                  {aiProviders === null ? '—' : aiProviders.length > 0 ? aiProviders.join(' / ') : 'なし'}
                </dd>
              </div>
            </dl>
            {aiSettings && aiProviders && aiProviders.length > 1 && (
              <dl className="mt-2 pt-2 border-t border-white/10 space-y-1 text-[11px]">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-400">使い分け</dt>
                  <dd className="text-slate-200 text-right">
                    {aiSettings.rotate ? '交互に使用' : '上から順に使用'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-400">次に使う順</dt>
                  <dd className="text-slate-200 text-right text-[10px]">{aiSettings.next.join(' → ')}</dd>
                </div>
                {aiSettings.heavy && (
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-400">重い処理</dt>
                    <dd className="text-slate-200 text-right">{aiSettings.heavy} を優先</dd>
                  </div>
                )}
              </dl>
            )}

            {aiProviders !== null && aiProviders.length === 0 && (
              <p className="mt-2 text-[10px] text-amber-300/90 leading-relaxed">
                Vercelの Settings → Environment Variables に GROQ_API_KEY（または GEMINI_API_KEY /
                OPENAI_API_KEY）を登録し、再デプロイするとAIに接続されます。
                キー名に VITE_ は付けないでください。
              </p>
            )}
          </section>

          <section className="panel p-3">
            <h3 className="text-[12px] font-bold text-slate-100 mb-2">会社情報</h3>
            <dl className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <dt className="text-slate-400">会社名</dt>
                <dd className="text-slate-200">{data.company.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">社長</dt>
                <dd className="text-slate-200">{data.company.presidentName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-400">バージョン</dt>
                <dd className="font-num text-slate-200">{data.company.version}</dd>
              </div>
              {data.updatedAt && (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-400">最終更新</dt>
                  <dd className="font-num text-slate-200 text-right">
                    {new Date(data.updatedAt).toLocaleString('ja-JP')}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="panel p-3">
            <h3 className="text-[12px] font-bold text-slate-100 mb-2">サービス状態</h3>
            <ul className="space-y-1.5 text-[11px]">
              {data.systemStatus.map((s) => (
                <li key={s.name} className="flex items-center justify-between">
                  <span className="text-slate-300">{s.name}</span>
                  <StateBadge text={s.state} tone={s.state === '正常' ? 'good' : 'warn'} />
                </li>
              ))}
            </ul>
          </section>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            APIキーはVercelのサーバー側（/api/chat）だけが読み込みます。ブラウザには出ません。
          </p>
        </div>
      </Drawer>
    </div>
  )
}

/** ログイン判定 */
function Gate() {
  const { ready, signedIn } = useAuth()
  if (!ready) return <LoadingScreen message="ログイン状態を確認しています…" />
  if (!signedIn) return <Login />
  return (
    <DataProvider>
      <LibraryProvider>
        <Main />
      </LibraryProvider>
    </DataProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ScaleProvider>
        <div className="scale-root">
          <AuthProvider>
            <Gate />
          </AuthProvider>
        </div>
      </ScaleProvider>
    </ThemeProvider>
  )
}
