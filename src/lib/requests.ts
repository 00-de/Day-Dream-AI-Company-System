import { collection, doc, setDoc, deleteDoc, onSnapshot, orderBy, query, limit } from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import type { AiStaff } from '../types'

/* ============================================================
   依頼の記録
   AI社員に頼んだ内容と、その結果を保存します。
   ============================================================ */

export interface RequestRecord {
  id: string
  staffId: string
  staffName: string
  staffRole: string
  request: string
  extra?: string
  answer: string
  deliverable?: string
  points?: string[]
  nextTasks?: string[]
  source: string
  provider: string
  createdAt: string
}

const LOCAL_KEY = 'ddai:requests'

function readLocal(): RequestRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? (JSON.parse(raw) as RequestRecord[]) : []
  } catch {
    return []
  }
}

function writeLocal(list: RequestRecord[]) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(list.slice(0, 200)))
  } catch {
    // 保存できなくても動作は続けます
  }
}

/** 依頼を記録します */
export async function saveRequest(
  staff: AiStaff,
  input: { request: string; extra?: string; source: string },
  result: {
    answer: string
    deliverable?: string
    points?: string[]
    nextTasks?: string[]
    provider: string
  },
  signedIn: boolean,
): Promise<void> {
  const id = `r${Date.now()}`
  const record: RequestRecord = {
    id,
    staffId: staff.id,
    staffName: staff.name,
    staffRole: staff.role,
    request: input.request,
    extra: input.extra ?? '',
    answer: result.answer,
    deliverable: result.deliverable ?? '',
    points: result.points ?? [],
    nextTasks: result.nextTasks ?? [],
    source: input.source,
    provider: result.provider,
    createdAt: new Date().toISOString(),
  }

  if (isFirebaseConfigured && db && signedIn) {
    try {
      await setDoc(doc(db, 'requests', id), record)
      return
    } catch {
      // 保存に失敗しても、依頼そのものは成功しているので続けます
    }
  }
  writeLocal([record, ...readLocal()])
}

/** 依頼の記録を購読します */
export function watchRequests(
  signedIn: boolean,
  onChange: (list: RequestRecord[]) => void,
): () => void {
  if (isFirebaseConfigured && db && signedIn) {
    const q = query(collection(db, 'requests'), orderBy('createdAt', 'desc'), limit(300))
    return onSnapshot(
      q,
      (snap) => onChange(snap.docs.map((d) => ({ ...(d.data() as RequestRecord), id: d.id }))),
      () => onChange([]),
    )
  }
  onChange(readLocal())
  return () => undefined
}

/** 記録を1件削除します */
export async function deleteRequest(id: string, signedIn: boolean): Promise<void> {
  if (isFirebaseConfigured && db && signedIn) {
    try {
      await deleteDoc(doc(db, 'requests', id))
      return
    } catch {
      // 続けます
    }
  }
  writeLocal(readLocal().filter((r) => r.id !== id))
}

/** 記録を読みやすい文章にします */
export function recordToText(r: RequestRecord): string {
  const lines = [
    `【${r.staffName} への依頼】${r.staffRole}`,
    `日時：${new Date(r.createdAt).toLocaleString('ja-JP')}`,
    `依頼：${r.request}`,
    r.extra ? `条件：${r.extra}` : '',
    '',
    '■ 回答',
    r.answer,
    '',
  ].filter(Boolean)

  if (r.deliverable) lines.push('■ 成果物', r.deliverable, '')
  if (r.points?.length) lines.push('■ 押さえておきたい点', ...r.points.map((x) => `・${x}`), '')
  if (r.nextTasks?.length) lines.push('■ 次にやるとよいこと', ...r.nextTasks.map((x) => `・${x}`))
  return lines.join('\n')
}
