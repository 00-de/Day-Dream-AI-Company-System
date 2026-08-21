import { useEffect, useState } from 'react'
import type { AiStaff } from '../types'
import { useData } from '../lib/data'
import { useLibrary } from '../lib/library'
import { useAuth } from '../lib/auth'
import { askStaff, hintsFor, askResultToText, SPECIAL_PANELS, type AskResult } from '../lib/ask'
import { copyText, downloadText } from '../lib/integrations'
import { ProgressBar, ACCENT } from './Ui'
import { Avatar } from './Avatar'
import { IconSparkle, IconCheck, IconSend } from './Icons'

/* ============================================================
   AI社員に仕事を依頼する画面（全23人共通）
   カードの「依頼する」ボタンから開きます
   ============================================================ */

export function AskStaffModal({ staff, onClose }: { staff: AiStaff | null; onClose: () => void }) {
  const { data } = useData()
  const { addTask } = useLibrary()
  const { account } = useAuth()

  const [request, setRequest] = useState('')
  const [extra, setExtra] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<AskResult | null>(null)
  const [error, setError] = useState('')
  const [added, setAdded] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  // 相手が変わったら中身をリセットします
  useEffect(() => {
    setRequest('')
    setExtra('')
    setResult(null)
    setError('')
    setAdded([])
  }, [staff?.id])

  // Escキーで閉じます
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (staff) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [staff, onClose])

  if (!staff) return null

  const a = ACCENT[staff.accent]
  const hints = hintsFor(staff)
  const special = SPECIAL_PANELS[staff.id]

  const run = async () => {
    if (!request.trim() || busy) return
    setBusy(true)
    setError('')
    setResult(null)
    const r = await askStaff(staff, request.trim(), extra, data)
    if (r.error) setError(r.error)
    else setResult(r)
    setBusy(false)
  }

  const saveTask = async (title: string) => {
    await addTask({ title, assignee: staff.id, status: 'todo', due: '', priority: 'normal' })
    setAdded((l) => [...l, title])
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-label={`${staff.name} に依頼する`}
    >
      <div className="min-h-full flex items-start justify-center p-3 sm:p-6">
        <div
          className="panel w-full max-w-[720px] p-4 sm:p-5 my-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 見出し */}
          <div className="flex items-start gap-3 pb-3 border-b border-white/10">
            <Avatar name={staff.name} src={staff.avatar} accent={staff.accent} size={52} />
            <div className="min-w-0 flex-1">
              <p className={`text-[16px] font-bold ${a.text}`}>{staff.name}</p>
              <p className="text-[12px] text-slate-400">{staff.role}</p>
              {staff.nameEn && <p className="text-[10px] text-slate-600">{staff.nameEn}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="閉じる"
              className="w-9 h-9 grid place-content-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition text-[16px]"
            >
              ✕
            </button>
          </div>

          {/* 専用画面がある場合の案内 */}
          {special && (
            <p className="mt-3 text-[11px] text-cyan-200 bg-cyan-400/10 ring-1 ring-cyan-400/30 rounded-lg px-3 py-2 leading-relaxed">
              {staff.name}には <b>{special.label}</b> の専用画面があります。
              本格的に使うときは {special.where} をご利用ください。
              ここでは、相談や簡単な依頼ができます。
            </p>
          )}

          {/* 依頼内容 */}
          <label className="block mt-3 text-[12px] text-slate-300 mb-1.5" htmlFor="ask-request">
            どんな仕事を頼みますか
          </label>
          <textarea
            id="ask-request"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={3}
            placeholder={hints[0]}
            className="w-full bg-night-950/70 rounded-lg px-3 py-2.5 text-[13px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none resize-none"
          />

          {/* 依頼の例 */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hints.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setRequest(h)}
                className="text-[11px] px-2.5 py-1.5 rounded-md bg-white/[0.04] ring-1 ring-white/10 text-slate-300 hover:ring-cyan-400/40 hover:text-cyan-200 transition text-left"
              >
                {h}
              </button>
            ))}
          </div>

          <input
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder="条件があれば（任意）例：予算5万円以内、9月中に"
            aria-label="補足の条件"
            className="mt-2 w-full bg-night-950/70 rounded-lg px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
          />

          <button
            type="button"
            onClick={() => void run()}
            disabled={busy || !request.trim() || !account.canEdit}
            className="mt-3 w-full py-3 rounded-lg text-[13px] font-bold text-cyan-50 bg-cyan-500/30 ring-1 ring-cyan-400/50 hover:bg-cyan-500/45 disabled:opacity-40 transition flex items-center justify-center gap-1.5"
          >
            <IconSparkle className="w-4 h-4" />
            {busy ? `${staff.name}が取りかかっています…` : `${staff.name}に依頼する`}
          </button>

          {busy && <ProgressBar value={100} accent="gradient" height={3} />}

          {!account.canEdit && (
            <p className="mt-2 text-[11px] text-slate-500 text-center">
              閲覧のみの権限のため、依頼はできません
            </p>
          )}

          {error && (
            <p className="mt-2 text-[12px] text-red-300 bg-red-500/10 ring-1 ring-red-400/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* 結果 */}
          {result && (
            <div className="mt-4 space-y-2.5">
              <div className="panel p-3">
                <p className="text-[10px] text-slate-500 mb-1.5">{staff.name} からの回答</p>
                <p className="text-[13px] text-slate-100 leading-relaxed whitespace-pre-wrap">
                  {result.answer}
                </p>
              </div>

              {result.deliverable && (
                <div className="panel p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <p className="text-[10px] text-slate-500 flex-1">成果物</p>
                    <button
                      type="button"
                      onClick={async () => {
                        if (await copyText(result.deliverable)) {
                          setCopied(true)
                          window.setTimeout(() => setCopied(false), 1800)
                        }
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded ring-1 transition ${
                        copied
                          ? 'text-emerald-300 ring-emerald-400/40 bg-emerald-400/10'
                          : 'text-cyan-200 ring-cyan-400/40 hover:bg-cyan-400/15'
                      }`}
                    >
                      {copied ? 'コピーしました' : 'コピー'}
                    </button>
                  </div>
                  <pre className="text-[12px] text-slate-100 whitespace-pre-wrap font-sans leading-relaxed max-h-[300px] overflow-y-auto">
                    {result.deliverable}
                  </pre>
                </div>
              )}

              {result.points.length > 0 && (
                <div className="panel p-3">
                  <p className="text-[10px] text-slate-500 mb-1.5">押さえておきたい点</p>
                  <ul className="space-y-1">
                    {result.points.map((x, i) => (
                      <li key={i} className="flex gap-1.5 text-[12px] text-slate-200 leading-relaxed">
                        <IconCheck className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.needMore.length > 0 && (
                <div className="rounded-lg px-3 py-2.5 ring-1 ring-amber-400/30 bg-amber-400/10">
                  <p className="text-[10px] text-amber-300 mb-1.5">
                    もっと良い答えのために、教えてほしいこと
                  </p>
                  <ul className="space-y-1">
                    {result.needMore.map((x, i) => (
                      <li key={i} className="text-[12px] text-amber-200 leading-relaxed">
                        ・{x}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setExtra(result.needMore.join(' / '))}
                    className="mt-2 text-[11px] px-2.5 py-1 rounded ring-1 ring-amber-400/40 text-amber-200 hover:bg-amber-400/15 transition"
                  >
                    条件欄に入れて聞き直す
                  </button>
                </div>
              )}

              {result.nextTasks.length > 0 && (
                <div className="panel p-3">
                  <p className="text-[10px] text-slate-500 mb-1.5">次にやるとよいこと</p>
                  <ul className="space-y-1.5">
                    {result.nextTasks.map((t, i) => {
                      const done = added.includes(t)
                      return (
                        <li key={i} className="flex items-center gap-2">
                          <span className="text-[12px] text-slate-200 flex-1">{t}</span>
                          {account.canEdit && (
                            <button
                              type="button"
                              onClick={() => void saveTask(t)}
                              disabled={done}
                              className={`text-[11px] px-2.5 py-1 rounded ring-1 shrink-0 transition ${
                                done
                                  ? 'text-emerald-300 ring-emerald-400/40 bg-emerald-400/10'
                                  : 'text-cyan-200 ring-cyan-400/40 hover:bg-cyan-400/15'
                              }`}
                            >
                              {done ? '登録済み' : 'タスクに'}
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void copyText(askResultToText(result, request))}
                  className="flex-1 py-2.5 rounded-lg text-[12px] text-cyan-100 bg-cyan-500/25 ring-1 ring-cyan-400/40 hover:bg-cyan-500/40 transition"
                >
                  全文をコピー
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadText(
                      `${staff.name}-${new Date().toISOString().slice(0, 10)}.txt`,
                      askResultToText(result, request),
                    )
                  }
                  className="px-3 py-2.5 rounded-lg text-[12px] text-slate-300 ring-1 ring-white/10 hover:ring-cyan-400/40 hover:text-cyan-200 transition"
                >
                  保存
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null)
                    setRequest('')
                  }}
                  className="px-3 py-2.5 rounded-lg text-[12px] text-slate-400 ring-1 ring-white/10 hover:text-slate-100 transition"
                >
                  <IconSend className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-slate-600 text-center">
                {result.provider} が作成しました
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
