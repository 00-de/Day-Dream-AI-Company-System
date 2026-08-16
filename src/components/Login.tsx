import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { isFirebaseConfigured } from '../lib/firebase'
import { DEFAULT_DATA } from '../data/defaults'

/* ============================================================
   ログイン画面
   ============================================================ */

export function Login() {
  const { signIn, enterDemo, error, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (busy) return
    if (!email || !password) {
      return
    }
    setBusy(true)
    try {
      await signIn(email, password)
    } catch {
      // エラー内容は useAuth 側で日本語化されます
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-bg min-h-screen grid place-items-center px-4">
      <div className="relative z-10 w-full max-w-[380px]">
        {/* ロゴ */}
        <div className="text-center mb-6 animate-floatUp">
          <div className="mx-auto w-16 h-16 rounded-2xl grid place-content-center bg-gradient-to-br from-cyan-500/25 to-purple-600/25 ring-1 ring-cyan-400/40 shadow-glow">
            <span className="font-display font-black text-cyan-300 text-xl">DD</span>
          </div>
          <h1 className="mt-3 font-display text-[17px] font-bold text-slate-100">
            {DEFAULT_DATA.company.system}
          </h1>
          <p className="text-[11px] text-cyan-400/70 mt-0.5">{DEFAULT_DATA.company.subtitle}</p>
        </div>

        <div className="panel p-5 animate-floatUp">
          <h2 className="text-[13px] font-bold text-slate-100 mb-4">社長ログイン</h2>

          <label className="block text-[11px] text-slate-400 mb-1" htmlFor="email">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              clearError()
            }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="w-full mb-3 bg-night-950/70 rounded-lg px-3 py-2.5 text-[13px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none transition"
            placeholder="toshi@example.com"
          />

          <label className="block text-[11px] text-slate-400 mb-1" htmlFor="password">
            パスワード
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              clearError()
            }}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="w-full bg-night-950/70 rounded-lg px-3 py-2.5 text-[13px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none transition"
            placeholder="••••••••"
          />

          {error && (
            <p className="mt-3 text-[11px] text-red-300 bg-red-500/10 ring-1 ring-red-400/30 rounded-lg px-3 py-2 leading-relaxed">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={busy || !email || !password}
            className="mt-4 w-full py-2.5 rounded-lg text-[13px] font-bold text-cyan-50 bg-cyan-500/30 ring-1 ring-cyan-400/50 hover:bg-cyan-500/45 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {busy ? 'ログインしています…' : 'ログイン'}
          </button>

          <div className="my-4 flex items-center gap-3 text-[10px] text-slate-600">
            <span className="flex-1 h-px bg-white/10" />
            または
            <span className="flex-1 h-px bg-white/10" />
          </div>

          <button
            type="button"
            onClick={enterDemo}
            className="w-full py-2.5 rounded-lg text-[12px] text-slate-300 ring-1 ring-white/10 hover:ring-cyan-400/40 hover:text-cyan-200 transition"
          >
            見るだけモードで開く（保存はこの端末のみ）
          </button>

          {!isFirebaseConfigured && (
            <p className="mt-3 text-[10px] text-amber-300/90 bg-amber-400/10 ring-1 ring-amber-400/25 rounded-lg px-3 py-2 leading-relaxed">
              Firebaseの環境変数がまだ設定されていません。
              「見るだけモード」で全機能を確認できます（データは、この端末の中だけに保存されます）。
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-[10px] text-slate-600">
          © 2026 {DEFAULT_DATA.company.name}
        </p>
      </div>
    </div>
  )
}
