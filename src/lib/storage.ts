import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import { initializeApp, getApps } from 'firebase/app'
import { isFirebaseConfigured } from './firebase'
import type { MediaKind } from '../types'

/* ============================================================
   Firebase Storage へのアップロード
   ============================================================ */

/** ファイル名から種類を判定する */
export function detectKind(file: File): MediaKind {
  const t = file.type
  if (t.startsWith('image/')) return 'image'
  if (t.startsWith('audio/')) return 'audio'
  if (t.startsWith('video/')) return 'video'
  return 'document'
}

/** バイト数を読みやすくする */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/** 1ファイルあたりの上限（50MB） */
export const MAX_FILE_SIZE = 50 * 1024 * 1024

/** ファイル名を安全な形にする */
function safeName(name: string): string {
  return name.replace(/[^\w.\-ぁ-んァ-ヶ一-龠]/g, '_').slice(-80)
}

export interface UploadResult {
  url: string
  path: string
}

/**
 * ファイルをアップロードする
 * Firebase未設定のときは、この画面の中だけで見られる一時URLを返します
 * （ページを再読み込みすると消えます）
 */
export async function uploadFile(
  file: File,
  kind: MediaKind,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  if (!isFirebaseConfigured || getApps().length === 0) {
    // 見るだけモード：ブラウザ内の一時URL
    onProgress?.(100)
    return { url: URL.createObjectURL(file), path: '' }
  }

  const app = getApps()[0] ?? initializeApp({})
  const storage = getStorage(app)
  const path = `uploads/${kind}/${Date.now()}_${safeName(file.name)}`
  const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type })

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snap) => onProgress?.(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      (err) => reject(new Error(toJapanese(err))),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        resolve({ url, path })
      },
    )
  })
}

/** アップロード済みファイルを削除する */
export async function removeFile(path: string): Promise<void> {
  if (!path || !isFirebaseConfigured || getApps().length === 0) return
  const storage = getStorage(getApps()[0])
  try {
    await deleteObject(ref(storage, path))
  } catch {
    // すでに削除済みの場合は無視します
  }
}

/** Storage のエラーを日本語にする */
function toJapanese(err: unknown): string {
  const code = (err as { code?: string })?.code ?? ''
  switch (code) {
    case 'storage/unauthorized':
      return 'アップロードの権限がありません。Firebaseコンソールで storage.rules を公開してください。'
    case 'storage/canceled':
      return 'アップロードを中止しました。'
    case 'storage/quota-exceeded':
      return '保存容量がいっぱいです。不要なファイルを削除してください。'
    case 'storage/unauthenticated':
      return 'ログインの有効期限が切れました。もう一度ログインしてください。'
    case 'storage/retry-limit-exceeded':
      return '通信が不安定なため中断しました。もう一度お試しください。'
    default:
      return 'アップロードに失敗しました。通信状態とFirebaseの設定をご確認ください。'
  }
}
