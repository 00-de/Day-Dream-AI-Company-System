import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import { useAuth } from './auth'
import { removeFile } from './storage'
import type { Task, MediaItem, Meeting } from '../types'

/* ============================================================
   タスクとファイルの管理
   Firestore: tasks コレクション / media コレクション
   見るだけモードでは、この端末の中に保存します
   ============================================================ */

const LOCAL_TASKS = 'ddai:tasks'
const LOCAL_MEDIA = 'ddai:media'
const LOCAL_MEETINGS = 'ddai:meetings'

interface LibraryValue {
  tasks: Task[]
  media: MediaItem[]
  meetings: Meeting[]
  loading: boolean
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<void>
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  addMedia: (item: Omit<MediaItem, 'id' | 'uploadedAt'>) => Promise<void>
  deleteMedia: (item: MediaItem) => Promise<void>
  addMeeting: (meeting: Omit<Meeting, 'id' | 'createdAt'>) => Promise<Meeting>
  updateMeeting: (id: string, patch: Partial<Meeting>) => Promise<void>
  deleteMeeting: (id: string) => Promise<void>
}

const Ctx = createContext<LibraryValue | null>(null)

/** 初期タスク（何も無いときの見本） */
const SAMPLE_TASKS: Task[] = [
  { id: 't1', title: '新曲の歌詞チェック', assignee: 'yui', status: 'doing', due: '2026-08-20', priority: 'high', createdAt: '2026-08-10T09:00:00.000Z' },
  { id: 't2', title: 'MVの最終確認', assignee: 'shun', status: 'doing', due: '2026-08-22', priority: 'high', createdAt: '2026-08-11T09:00:00.000Z' },
  { id: 't3', title: 'YouTubeサムネイル作成', assignee: 'designer', status: 'todo', due: '2026-08-18', priority: 'normal', createdAt: '2026-08-12T09:00:00.000Z' },
  { id: 't4', title: 'ファンミーティング準備', assignee: 'mikoto', status: 'todo', due: '2026-09-01', priority: 'normal', createdAt: '2026-08-13T09:00:00.000Z' },
  { id: 't5', title: '8月の売上レポート作成', assignee: 'analyst', status: 'done', due: '2026-08-14', priority: 'low', createdAt: '2026-08-05T09:00:00.000Z' },
]

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 保存できなくても動作は続けます
  }
}

export function LibraryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const online = Boolean(isFirebaseConfigured && db && user)

  const [tasks, setTasks] = useState<Task[]>([])
  const [media, setMedia] = useState<MediaItem[]>([])
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  // ── 読み込み ─────────────────────────────
  useEffect(() => {
    if (online && db) {
      const unsubTasks = onSnapshot(
        query(collection(db, 'tasks'), orderBy('createdAt', 'desc')),
        (snap) => {
          setTasks(snap.docs.map((d) => ({ ...(d.data() as Task), id: d.id })))
          setLoading(false)
        },
        () => setLoading(false),
      )
      const unsubMedia = onSnapshot(
        query(collection(db, 'media'), orderBy('uploadedAt', 'desc')),
        (snap) => setMedia(snap.docs.map((d) => ({ ...(d.data() as MediaItem), id: d.id }))),
        () => undefined,
      )
      const unsubMeetings = onSnapshot(
        query(collection(db, 'meetings'), orderBy('createdAt', 'desc')),
        (snap) => setMeetings(snap.docs.map((d) => ({ ...(d.data() as Meeting), id: d.id }))),
        () => undefined,
      )
      return () => {
        unsubTasks()
        unsubMedia()
        unsubMeetings()
      }
    }

    setTasks(readLocal(LOCAL_TASKS, SAMPLE_TASKS))
    setMedia(readLocal(LOCAL_MEDIA, [] as MediaItem[]))
    setMeetings(readLocal(LOCAL_MEETINGS, [] as Meeting[]))
    setLoading(false)
    return
  }, [online])

  // ── タスク ───────────────────────────────
  const addTask: LibraryValue['addTask'] = async (task) => {
    const id = `t${Date.now()}`
    const next: Task = { ...task, id, createdAt: new Date().toISOString() }
    if (online && db) {
      await setDoc(doc(db, 'tasks', id), next)
    } else {
      const list = [next, ...tasks]
      setTasks(list)
      writeLocal(LOCAL_TASKS, list)
    }
  }

  const updateTask: LibraryValue['updateTask'] = async (id, patch) => {
    if (online && db) {
      await setDoc(doc(db, 'tasks', id), patch, { merge: true })
    } else {
      const list = tasks.map((t) => (t.id === id ? { ...t, ...patch } : t))
      setTasks(list)
      writeLocal(LOCAL_TASKS, list)
    }
  }

  const deleteTask: LibraryValue['deleteTask'] = async (id) => {
    if (online && db) {
      await deleteDoc(doc(db, 'tasks', id))
    } else {
      const list = tasks.filter((t) => t.id !== id)
      setTasks(list)
      writeLocal(LOCAL_TASKS, list)
    }
  }

  // ── ファイル ─────────────────────────────
  const addMedia: LibraryValue['addMedia'] = async (item) => {
    const id = `m${Date.now()}`
    const next: MediaItem = { ...item, id, uploadedAt: new Date().toISOString() }
    if (online && db) {
      await setDoc(doc(db, 'media', id), next)
    } else {
      const list = [next, ...media]
      setMedia(list)
      writeLocal(LOCAL_MEDIA, list)
    }
  }

  const deleteMedia: LibraryValue['deleteMedia'] = async (item) => {
    await removeFile(item.path)
    if (online && db) {
      await deleteDoc(doc(db, 'media', item.id))
    } else {
      const list = media.filter((m) => m.id !== item.id)
      setMedia(list)
      writeLocal(LOCAL_MEDIA, list)
    }
  }

  // ── 会議 ─────────────────────────────────
  const addMeeting: LibraryValue['addMeeting'] = async (meeting) => {
    const id = `mt${Date.now()}`
    const next: Meeting = { ...meeting, id, createdAt: new Date().toISOString() }
    if (online && db) {
      await setDoc(doc(db, 'meetings', id), next)
    } else {
      const list = [next, ...meetings]
      setMeetings(list)
      writeLocal(LOCAL_MEETINGS, list)
    }
    return next
  }

  const updateMeeting: LibraryValue['updateMeeting'] = async (id, patch) => {
    if (online && db) {
      await setDoc(doc(db, 'meetings', id), patch, { merge: true })
    } else {
      const list = meetings.map((m) => (m.id === id ? { ...m, ...patch } : m))
      setMeetings(list)
      writeLocal(LOCAL_MEETINGS, list)
    }
  }

  const deleteMeeting: LibraryValue['deleteMeeting'] = async (id) => {
    if (online && db) {
      await deleteDoc(doc(db, 'meetings', id))
    } else {
      const list = meetings.filter((m) => m.id !== id)
      setMeetings(list)
      writeLocal(LOCAL_MEETINGS, list)
    }
  }

  const value: LibraryValue = {
    tasks,
    media,
    meetings,
    loading,
    addTask,
    updateTask,
    deleteTask,
    addMedia,
    deleteMedia,
    addMeeting,
    updateMeeting,
    deleteMeeting,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useLibrary() {
  const v = useContext(Ctx)
  if (!v) throw new Error('LibraryProvider の中で useLibrary を使ってください')
  return v
}

/** 期限切れかどうか */
export function isOverdue(task: Task): boolean {
  if (task.status === 'done' || !task.due) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(task.due) < today
}
