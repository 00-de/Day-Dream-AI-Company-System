import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { isFirebaseConfigured } from '../lib/firebase'
import { DEFAULT_DATA } from '../data/defaults'

/* ============================================================
   ログイン画面（明るい配色・大きな文字）
   ============================================================ */

export function Login() {
  const { signIn, enterDemo, error, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (busy || !email || !password) return
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
    <div className="bright-bg app-min-h min-h-screen grid place-items-center px-4 py-8">
      <div className="relative z-10 w-full max-w-[440px]">
        {/* ロゴ */}
        <div className="text-center mb-6 animate-floatUp">
          <div className="mx-auto w-20 h-20 rounded-3xl grid place-content-center bg-white/25 ring-2 ring-white/50 shadow-2xl backdrop-blur">
            <span className="font-display font-black text-white text-2xl drop-shadow">DD</span>
          </div>
          <h1 className="mt-4 font-display text-[22px] sm:text-[26px] font-bold text-white drop-shadow-lg leading-tight">
            {DEFAULT_DATA.company.system}
          </h1>
          <p className="text-[14px] text-cyan-100 mt-1 font-bold">{DEFAULT_DATA.company.subtitle}</p>
        </div>

        <div className="bright-card rounded-3xl p-6 sm:p-7 animate-floatUp">
          <h2 className="text-[20px] font-bold text-white mb-5 text-center">ログイン</h2>

          {/* メールアドレス */}
          <label className="block text-[15px] font-bold text-white mb-2" htmlFor="email">
            メールアドレス
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              clearError()
            }}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
            className="bright-input w-full mb-5 rounded-xl px-4 py-3.5 text-[17px] transition"
            placeholder="president@daydream-ai.jp"
          />

          {/* パスワード */}
          <label className="block text-[15px] font-bold text-white mb-2" htmlFor="password">
            パスワード
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                clearError()
              }}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              className="bright-input w-full rounded-xl pl-4 pr-24 py-3.5 text-[17px] transition"
              placeholder="パスワード"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'パスワードを隠す' : 'パスワードを表示する'}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg text-[13px] font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition"
            >
              {showPassword ? '隠す' : '表示'}
            </button>
          </div>

          {error && (
            <p className="mt-4 text-[14px] font-bold text-white bg-red-500/70 ring-1 ring-white/30 rounded-xl px-4 py-3 leading-relaxed">
              {error}
            </p>
          )}

          {/* ログイン */}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !email || !password}
            className="rainbow-btn mt-6 w-full py-4 rounded-xl text-[18px] font-bold shadow-lg disabled:cursor-not-allowed"
          >
            {busy ? 'ログインしています…' : 'ログイン'}
          </button>

          <div className="my-5 flex items-center gap-3 text-[13px] text-white/70">
            <span className="flex-1 h-px bg-white/30" />
            または
            <span className="flex-1 h-px bg-white/30" />
          </div>

          <button
            type="button"
            onClick={enterDemo}
            className="w-full py-3.5 rounded-xl text-[15px] font-bold text-white bg-white/20 ring-1 ring-white/40 hover:bg-white/30 transition"
          >
            見るだけモードで開く
          </button>
          <p className="mt-2 text-center text-[12px] text-white/80 leading-relaxed">
            お試し用です。入力したデータは<b>この端末の中だけ</b>に保存され、
            <br />
            パソコンや他のスマホとは共有されません
          </p>

          {!isFirebaseConfigured && (
            <p className="mt-4 text-[13px] text-yellow-900 bg-yellow-300/90 rounded-xl px-4 py-3 leading-relaxed font-bold">
              Firebaseの設定がまだです。「見るだけモード」で全画面を確認できます。
            </p>
          )}
        </div>

        <p className="mt-5 text-center text-[12px] text-white/70">
          © 2026 {DEFAULT_DATA.company.name}
        </p>
      </div>
    </div>
  )
}
