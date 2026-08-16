import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, DOC_PATH, isFirebaseConfigured } from './firebase'
import { DEFAULT_DATA } from '../data/defaults'
import type { AppData } from '../types'
import { useAuth } from './auth'

/* ============================================================
   ダッシュボードのデータ管理
   Firestore: system/dashboard に AppData をまるごと保存します。
   ・ログイン中 → Firestore を読み書き（リアルタイム反映）
   ・未設定/デモ → 端末内（localStorage）に保存
   ============================================================ */

const LOCAL_KEY = 'ddai:dashboard'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface DataValue {
  data: AppData
  loading: boolean
  /** 保存できる状態か（デモモードでは端末内保存） */
  canSave: boolean
  saveState: SaveState
  /** 一部だけ書き換えて保存する */
  save: (patch: Partial<AppData>) => Promise<void>
  /** 初期データに戻す */
  reset: () => Promise<void>
  source: 'firestore' | 'local' | 'default'
}

const Ctx = createContext<DataValue | null>(null)

/** 初期データに足りないキーを補う（項目を追加したときの互換用） */
function merge(base: AppData, incoming: Partial<AppData> | null | undefined): AppData {
  if (!incoming) return base
  return { ...base, ...incoming }
}

function readLocal(): Partial<AppData> | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as Partial<AppData>) : null
  } catch {
    return null
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { user, demo } = useAuth()
  const [data, setData] = useState<AppData>(DEFAULT_DATA)
  const [loading, setLoading] = useState(true)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [source, setSource] = useState<'firestore' | 'local' | 'default'>('default')

  // ── 読み込み ─────────────────────────────
  useEffect(() => {
    // Firestore（ログイン中のみ）
    if (isFirebaseConfigured && db && user) {
      const ref = doc(db, DOC_PATH.collection, DOC_PATH.doc)
      const unsub = onSnapshot(
        ref,
        (snap) => {
          if (snap.exists()) {
            setData(merge(DEFAULT_DATA, snap.data() as Partial<AppData>))
            setSource('firestore')
          } else {
            // 初回は初期データを書き込んでおく
            void setDoc(ref, { ...DEFAULT_DATA, updatedAt: new Date().toISOString() })
            setData(DEFAULT_DATA)
            setSource('firestore')
          }
          setLoading(false)
        },
        () => {
          // 読み取り失敗時は初期データで表示を続ける
          setData(DEFAULT_DATA)
          setSource('default')
          setLoading(false)
        },
      )
      return unsub
    }

    // デモ／未ログイン：端末内のデータ
    const local = readLocal()
    setData(merge(DEFAULT_DATA, local))
    setSource(local ? 'local' : 'default')
    setLoading(false)
    return
  }, [user, demo])

  // ── 保存 ─────────────────────────────────
  const save = async (patch: Partial<AppData>) => {
    const next: AppData = { ...data, ...patch, updatedAt: new Date().toISOString() }
    setData(next)
    setSaveState('saving')
    try {
      if (isFirebaseConfigured && db && user) {
        await setDoc(doc(db, DOC_PATH.collection, DOC_PATH.doc), next, { merge: true })
      } else {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(next))
        setSource('local')
      }
      setSaveState('saved')
      window.setTimeout(() => setSaveState('idle'), 2000)
    } catch {
      setSaveState('error')
      window.setTimeout(() => setSaveState('idle'), 3000)
    }
  }

  const reset = async () => {
    localStorage.removeItem(LOCAL_KEY)
    await save(DEFAULT_DATA)
  }

  const value: DataValue = {
    data,
    loading,
    canSave: true,
    saveState,
    save,
    reset,
    source,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useData() {
  const v = useContext(Ctx)
  if (!v) throw new Error('DataProvider の中で useData を使ってください')
  return v
}
