import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  type User,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from './firebase'

/* ============================================================
   ログイン状態の管理
   Firebase未設定のときは「見るだけモード」で動きます
   （デザイン確認やデモに使えます。保存はできません）
   ============================================================ */

type Mode = 'firebase' | 'demo'

interface AuthValue {
  user: User | null
  mode: Mode
  ready: boolean
  /** ログイン済み（デモモードを含む） */
  signedIn: boolean
  demo: boolean
  signIn: (email: string, password: string) => Promise<void>
  enterDemo: () => void
  signOut: () => Promise<void>
  error: string
  clearError: () => void
}

const Ctx = createContext<AuthValue | null>(null)

/** Firebase のエラーコードを日本語にする */
function toJapanese(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'メールアドレスの形式が正しくありません。'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'メールアドレスまたはパスワードが違います。'
    case 'auth/too-many-requests':
      return 'ログインの失敗が続いたため、一時的にロックされています。しばらく待ってからお試しください。'
    case 'auth/network-request-failed':
      return 'ネットワークに接続できません。通信状態をご確認ください。'
    case 'auth/operation-not-allowed':
      return 'Firebaseコンソールで「メール／パスワード」認証を有効にしてください。'
    default:
      return 'ログインできませんでした。設定をご確認ください。'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [demo, setDemo] = useState(false)
  const [ready, setReady] = useState(!isFirebaseConfigured)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth) return
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setReady(true)
    })
    return unsub
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!auth) {
      setError('Firebaseが設定されていません。環境変数を登録してください。')
      return
    }
    setError('')
    try {
      await setPersistence(auth, browserLocalPersistence)
      await signInWithEmailAndPassword(auth, email.trim(), password)
    } catch (e) {
      const code = (e as { code?: string }).code ?? ''
      setError(toJapanese(code))
      throw e
    }
  }

  const enterDemo = () => {
    setError('')
    setDemo(true)
  }

  const signOut = async () => {
    setDemo(false)
    if (auth) await fbSignOut(auth)
  }

  const value: AuthValue = {
    user,
    mode: isFirebaseConfigured ? 'firebase' : 'demo',
    ready,
    signedIn: Boolean(user) || demo,
    demo: demo && !user,
    signIn,
    enterDemo,
    signOut,
    error,
    clearError: () => setError(''),
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('AuthProvider の中で useAuth を使ってください')
  return v
}
