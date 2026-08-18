import { useState } from 'react'
import { useData } from '../lib/data'
import { useLibrary } from '../lib/library'
import { useAuth } from '../lib/auth'
import {
  makeReport,
  reportToText,
  askDev,
  SPAN_LABEL,
  DEV_MODE_LABEL,
  type Span,
  type Report,
  type DevMode,
  type DevResult,
} from '../lib/leadWork'
import { copyText, downloadText } from '../lib/integrations'
import { Panel, ProgressBar, ACCENT } from './Ui'
import { Avatar } from './Avatar'
import { IconSparkle, IconCheck, IconCode } from './Icons'

/* ============================================================
   悠真AI（統括レポート）と 拓斗AI（開発支援）
   ============================================================ */

const MOOD = {
  good: ['順調です', 'text-emerald-300 ring-emerald-400/40 bg-emerald-400/10', '🌤'],
  normal: ['ふつうに進行中', 'text-cyan-300 ring-cyan-400/40 bg-cyan-400/10', '📋'],
  warn: ['気をつけたい点があります', 'text-amber-300 ring-amber-400/40 bg-amber-400/10', '⚠️'],
} as const

/* ── 悠真AI：統括レポート ───────────────── */
export function ReportPanel() {
  const { data } = useData()
  const { tasks, meetings, media, addTask } = useLibrary()
  const { account } = useAuth()
  const yuma = data.staff.find((s) => s.id === 'yuma')

  const [span, setSpan] = useState<Span>('day')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  const [added, setAdded] = useState<string[]>([])

  const run = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    setReport(null)
    setAdded([])
    const r = await makeReport(span, note, data, tasks, meetings, media)
    if (r.error) setError(r.error)
    else setReport(r)
    setBusy(false)
  }

  /** 提案された仕事をタスクにする */
  const assign = async (staffName: string, task: string) => {
    const st = data.staff.find((s) => s.name === staffName || staffName.includes(s.name))
    await addTask({ title: task, assignee: st?.id ?? '', status: 'todo', due: '', priority: 'normal' })
    setAdded((l) => [...l, task])
  }

  return (
    <Panel
      title="統括レポート（日報・週報）"
      action={yuma && <span className={`text-[10px] ${ACCENT[yuma.accent].text}`}>{yuma.name}</span>}
    >
      <div className="flex items-start gap-2.5 mb-2.5">
        {yuma && <Avatar name={yuma.name} src={yuma.avatar} accent={yuma.accent} size={40} />}
        <p className="text-[10px] text-slate-500 leading-relaxed flex-1">
          タスク・会議・制作物の状況を集めて、社長向けの報告書にまとめます。
          遅れや手空きの社員も正直に報告します。
        </p>
      </div>

      <div className="flex gap-1.5 mb-2">
        {(Object.keys(SPAN_LABEL) as Span[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpan(s)}
            className={`flex-1 text-[11px] py-1.5 rounded-md transition ${
              span === s
                ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40'
                : 'text-slate-400 ring-1 ring-white/10 hover:text-slate-100'
            }`}
          >
            {SPAN_LABEL[s]}
          </button>
        ))}
      </div>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="補足があれば（任意）例：今週はライブ準備を優先"
        aria-label="補足"
        className="w-full bg-night-950/70 rounded-lg px-3 py-2 text-[11px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
      />

      <button
        type="button"
        onClick={() => void run()}
        disabled={busy || !account.canEdit}
        className="mt-2 w-full py-2.5 rounded-lg text-[12px] font-bold text-cyan-50 bg-cyan-500/30 ring-1 ring-cyan-400/50 hover:bg-cyan-500/45 disabled:opacity-40 transition flex items-center justify-center gap-1.5"
      >
        <IconSparkle className="w-4 h-4" />
        {busy ? '悠真AIがまとめています…' : `${SPAN_LABEL[span]}を作ってもらう`}
      </button>

      {busy && <ProgressBar value={100} accent="gradient" height={3} />}

      {error && (
        <p className="mt-2 text-[11px] text-red-300 bg-red-500/10 ring-1 ring-red-400/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {report && (
        <div className="mt-3 space-y-2">
          <div className={`rounded-lg px-3 py-2.5 ring-1 ${MOOD[report.mood][1]}`}>
            <p className="text-[13px] font-bold flex items-center gap-2">
              <span>{MOOD[report.mood][2]}</span>
              {report.headline}
            </p>
            <p className="text-[11px] mt-1 opacity-90 leading-relaxed">{report.summary}</p>
          </div>

          {[
            ['進んだこと', report.progress, 'text-emerald-400'],
            ['気になること', report.concerns, 'text-amber-400'],
            ['社長に判断してほしいこと', report.decisions, 'text-cyan-400'],
            ['次にやること', report.tomorrow, 'text-slate-400'],
          ].map(([title, list, color]) =>
            (list as string[]).length > 0 ? (
              <div key={title as string} className="panel p-2.5">
                <p className="text-[10px] text-slate-400 mb-1.5">{title as string}</p>
                <ul className="space-y-1">
                  {(list as string[]).map((x, i) => (
                    <li key={i} className="flex gap-1.5 text-[11px] text-slate-200 leading-relaxed">
                      <IconCheck className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${color as string}`} />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}

          {report.assignments.length > 0 && (
            <div className="panel p-2.5">
              <p className="text-[10px] text-slate-400 mb-1.5">次に任せたい仕事</p>
              <ul className="space-y-1.5">
                {report.assignments.map((a, i) => {
                  const done = added.includes(a.task)
                  return (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-[11px] text-cyan-300 shrink-0">{a.staff}</span>
                      <span className="text-[11px] text-slate-200 truncate flex-1">{a.task}</span>
                      {account.canEdit && (
                        <button
                          type="button"
                          onClick={() => void assign(a.staff, a.task)}
                          disabled={done}
                          className={`text-[10px] px-2 py-0.5 rounded ring-1 shrink-0 transition ${
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
              onClick={() => void copyText(reportToText(report, data))}
              className="flex-1 py-2 rounded-lg text-[11px] text-cyan-100 bg-cyan-500/25 ring-1 ring-cyan-400/40 hover:bg-cyan-500/40 transition"
            >
              全文をコピー
            </button>
            <button
              type="button"
              onClick={() =>
                downloadText(
                  `${report.spanLabel}-${new Date().toISOString().slice(0, 10)}.txt`,
                  reportToText(report, data),
                )
              }
              className="px-3 py-2 rounded-lg text-[11px] text-slate-300 ring-1 ring-white/10 hover:ring-cyan-400/40 hover:text-cyan-200 transition"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </Panel>
  )
}

/* ── 拓斗AI：開発支援 ───────────────────── */
export function DevPanel() {
  const { data } = useData()
  const { account } = useAuth()
  const takuto = data.staff.find((s) => s.id === 'programmer')

  const [mode, setMode] = useState<DevMode>('write')
  const [request, setRequest] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<DevResult | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const run = async () => {
    if (!request.trim() || busy) return
    setBusy(true)
    setError('')
    setResult(null)
    const r = await askDev(mode, request.trim(), code)
    if (r.error) setError(r.error)
    else setResult(r)
    setBusy(false)
  }

  const hint =
    mode === 'write'
      ? '例：会議の記録をCSVで書き出すボタンを作りたい'
      : mode === 'debug'
        ? '例：Vercelにデプロイすると画面が真っ白になる'
        : '例：Firestoreのセキュリティルールって何をしているの？'

  return (
    <Panel
      title="開発の相談"
      action={takuto && <span className={`text-[10px] ${ACCENT[takuto.accent].text}`}>{takuto.name}</span>}
    >
      <div className="flex items-start gap-2.5 mb-2.5">
        {takuto && <Avatar name={takuto.name} src={takuto.avatar} accent={takuto.accent} size={40} />}
        <p className="text-[10px] text-slate-500 leading-relaxed flex-1">
          コードの下書き、不具合の原因調べ、仕組みの説明をします。
          このアプリの構成（React + TypeScript + Firebase）を前提に答えます。
        </p>
      </div>

      <div className="flex gap-1.5 mb-2">
        {(Object.keys(DEV_MODE_LABEL) as DevMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              setResult(null)
            }}
            className={`flex-1 text-[11px] py-1.5 rounded-md transition ${
              mode === m
                ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40'
                : 'text-slate-400 ring-1 ring-white/10 hover:text-slate-100'
            }`}
          >
            {DEV_MODE_LABEL[m]}
          </button>
        ))}
      </div>

      <textarea
        value={request}
        onChange={(e) => setRequest(e.target.value)}
        rows={2}
        placeholder={hint}
        aria-label="依頼内容"
        className="w-full bg-night-950/70 rounded-lg px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none resize-none"
      />

      {mode !== 'explain' && (
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={3}
          placeholder={mode === 'debug' ? 'エラーメッセージを貼り付けてください（任意）' : '既存のコードがあれば貼り付け（任意）'}
          aria-label="コード・エラー内容"
          className="mt-2 w-full bg-night-950/70 rounded-lg px-3 py-2 text-[10px] font-num text-slate-300 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none resize-none"
        />
      )}

      <button
        type="button"
        onClick={() => void run()}
        disabled={busy || !request.trim() || !account.canEdit}
        className="mt-2 w-full py-2.5 rounded-lg text-[12px] font-bold text-cyan-50 bg-cyan-500/30 ring-1 ring-cyan-400/50 hover:bg-cyan-500/45 disabled:opacity-40 transition flex items-center justify-center gap-1.5"
      >
        <IconCode className="w-4 h-4" />
        {busy ? '拓斗AIが考えています…' : '拓斗AIに相談する'}
      </button>

      {busy && <ProgressBar value={100} accent="gradient" height={3} />}

      {error && (
        <p className="mt-2 text-[11px] text-red-300 bg-red-500/10 ring-1 ring-red-400/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3 space-y-2">
          {result.answer && (
            <div className="panel p-2.5">
              <pre className="text-[11px] text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                {result.answer}
              </pre>
            </div>
          )}

          {result.warnings.length > 0 && (
            <div className="rounded-lg px-3 py-2 ring-1 ring-amber-400/30 bg-amber-400/10">
              <p className="text-[10px] text-amber-300 mb-1">注意点</p>
              <ul className="space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-[11px] text-amber-200 leading-relaxed">
                    ・{w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.code && (
            <div className="panel p-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[10px] text-slate-400 flex-1 font-num">{result.filename || 'コード'}</p>
                <button
                  type="button"
                  onClick={async () => {
                    if (await copyText(result.code)) {
                      setCopied(true)
                      window.setTimeout(() => setCopied(false), 1800)
                    }
                  }}
                  className={`text-[10px] px-2 py-0.5 rounded ring-1 transition ${
                    copied
                      ? 'text-emerald-300 ring-emerald-400/40 bg-emerald-400/10'
                      : 'text-cyan-200 ring-cyan-400/40 hover:bg-cyan-400/15'
                  }`}
                >
                  {copied ? 'コピーしました' : 'コピー'}
                </button>
                {result.filename && (
                  <button
                    type="button"
                    onClick={() => downloadText(result.filename, result.code)}
                    className="text-[10px] px-2 py-0.5 rounded ring-1 ring-white/10 text-slate-300 hover:ring-cyan-400/40 hover:text-cyan-200 transition"
                  >
                    保存
                  </button>
                )}
              </div>
              <pre className="scroll-box text-[10px] text-cyan-100/90 whitespace-pre-wrap font-num leading-relaxed max-h-[320px] overflow-y-auto">
                {result.code}
              </pre>
            </div>
          )}

          {result.steps.length > 0 && (
            <div className="panel p-2.5">
              <p className="text-[10px] text-slate-400 mb-1.5">作業の手順</p>
              <ol className="space-y-1 list-decimal list-inside">
                {result.steps.map((s, i) => (
                  <li key={i} className="text-[11px] text-slate-200 leading-relaxed">
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}
