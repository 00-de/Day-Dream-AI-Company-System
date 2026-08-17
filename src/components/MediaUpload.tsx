import { useRef, useState } from 'react'
import type { MediaItem, MediaKind } from '../types'
import { useLibrary } from '../lib/library'
import { useAuth } from '../lib/auth'
import { uploadFile, detectKind, formatSize, MAX_FILE_SIZE } from '../lib/storage'
import { isFirebaseConfigured } from '../lib/firebase'
import { ProgressBar } from './Ui'

/* ============================================================
   ファイルのアップロードと一覧
   ドラッグ＆ドロップにも対応しています
   ============================================================ */

const KIND_LABEL: Record<MediaKind, string> = {
  image: '画像',
  audio: '楽曲',
  video: '動画',
  document: '書類',
}

const KIND_ICON: Record<MediaKind, string> = {
  image: '🖼️',
  audio: '🎵',
  video: '🎬',
  document: '📄',
}

export function MediaUpload({
  accept,
  kinds,
  columns = 5,
  emptyText = 'まだファイルがありません',
}: {
  /** 選択できるファイルの種類（例: 'image/*'） */
  accept?: string
  /** 表示するファイルの種類で絞り込む */
  kinds?: MediaKind[]
  columns?: number
  emptyText?: string
}) {
  const { media, addMedia, deleteMedia } = useLibrary()
  const { account } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [preview, setPreview] = useState<MediaItem | null>(null)

  const list = kinds ? media.filter((m) => kinds.includes(m.kind)) : media

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError('')

    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`「${file.name}」は大きすぎます（上限 ${formatSize(MAX_FILE_SIZE)}）`)
        continue
      }
      const kind = detectKind(file)
      try {
        setProgress(0)
        const { url, path } = await uploadFile(file, kind, setProgress)
        await addMedia({ name: file.name, kind, url, path, size: file.size })
      } catch (e) {
        setError(e instanceof Error ? e.message : 'アップロードに失敗しました')
      } finally {
        setProgress(null)
      }
    }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div>
      {/* アップロード枠 */}
      {account.canEdit && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            void handleFiles(e.dataTransfer.files)
          }}
          className={`rounded-xl border border-dashed px-3 py-4 text-center transition ${
            dragging ? 'border-cyan-400/60 bg-cyan-400/5' : 'border-white/15'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={accept}
            onChange={(e) => void handleFiles(e.target.files)}
            className="hidden"
            id={`upload-${kinds?.join('-') ?? 'all'}`}
          />
          <label
            htmlFor={`upload-${kinds?.join('-') ?? 'all'}`}
            className="cursor-pointer text-[11px] text-slate-300 hover:text-cyan-200 transition"
          >
            ここにドラッグ＆ドロップ、または<span className="text-cyan-300">クリックして選択</span>
          </label>
          <p className="text-[9px] text-slate-600 mt-1">1ファイル {formatSize(MAX_FILE_SIZE)} まで</p>

          {progress !== null && (
            <div className="mt-2">
              <ProgressBar value={progress} accent="cyan" />
              <p className="text-[10px] text-cyan-300 mt-1 font-num">アップロード中… {progress}%</p>
            </div>
          )}

          {error && (
            <p className="mt-2 text-[10px] text-red-300 bg-red-500/10 ring-1 ring-red-400/30 rounded-lg px-2 py-1.5">
              {error}
            </p>
          )}

          {!isFirebaseConfigured && (
            <p className="mt-2 text-[9px] text-amber-300/80">
              見るだけモードのため、ページを再読み込みするとファイルは消えます
            </p>
          )}
        </div>
      )}

      {/* 一覧 */}
      {list.length === 0 ? (
        <p className="text-[11px] text-slate-500 text-center py-4">{emptyText}</p>
      ) : (
        <div className="inner-grid mt-3 grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
          {list.map((m) => (
            <div key={m.id} className="relative group">
              <button
                type="button"
                onClick={() => setPreview(m)}
                className="w-full block"
                aria-label={`${m.name} を開く`}
              >
                {m.kind === 'image' ? (
                  <img
                    src={m.url}
                    alt={m.name}
                    loading="lazy"
                    className="w-full aspect-square object-cover rounded-lg ring-1 ring-white/10 group-hover:ring-cyan-400/50 transition"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-lg ring-1 ring-white/10 grid place-content-center bg-white/[0.03] group-hover:ring-cyan-400/50 transition">
                    <span className="text-[20px]">{KIND_ICON[m.kind]}</span>
                  </div>
                )}
              </button>
              <p className="text-[9px] text-slate-500 truncate mt-0.5" title={m.name}>
                {m.name}
              </p>
              {account.canEdit && (
                <button
                  type="button"
                  onClick={() => void deleteMedia(m)}
                  className="absolute top-1 right-1 w-5 h-5 rounded grid place-content-center bg-black/70 text-slate-300 hover:text-red-300 opacity-0 group-hover:opacity-100 transition text-[11px]"
                  aria-label={`${m.name} を削除`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* プレビュー */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm grid place-items-center p-6"
          onClick={() => setPreview(null)}
          role="dialog"
          aria-label={preview.name}
        >
          <div className="max-w-[900px] w-full" onClick={(e) => e.stopPropagation()}>
            <div className="panel p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[13px]">{KIND_ICON[preview.kind]}</span>
                <p className="text-[12px] text-slate-100 truncate flex-1">{preview.name}</p>
                <span className="text-[10px] text-slate-500 font-num">{formatSize(preview.size)}</span>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  className="text-slate-400 hover:text-slate-100 px-1"
                  aria-label="閉じる"
                >
                  ✕
                </button>
              </div>

              {preview.kind === 'image' && (
                <img src={preview.url} alt={preview.name} className="w-full rounded-lg" />
              )}
              {preview.kind === 'audio' && <audio src={preview.url} controls className="w-full" />}
              {preview.kind === 'video' && <video src={preview.url} controls className="w-full rounded-lg" />}
              {preview.kind === 'document' && (
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center py-6 text-[12px] text-cyan-300 hover:text-cyan-200"
                >
                  新しいタブで開く
                </a>
              )}

              <p className="text-[10px] text-slate-500 mt-2">
                {KIND_LABEL[preview.kind]}・
                {new Date(preview.uploadedAt).toLocaleString('ja-JP')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
