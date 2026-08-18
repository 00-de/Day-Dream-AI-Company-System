import { useEffect, useState } from 'react'
import { useData } from '../lib/data'
import { useLibrary } from '../lib/library'
import { useAuth } from '../lib/auth'
import { runAgent, checkAgent, resultToText, JOB_INFO, type JobKey, type AgentResult } from '../lib/agent'
import { copyText, downloadText } from '../lib/integrations'
import { Panel, ProgressBar, StateBadge, ACCENT } from './Ui'
import { Avatar } from './Avatar'
import { IconSparkle, IconCheck, IconArrow } from './Icons'

/* ============================================================
   AI社員に実際の仕事をさせるパネル
   Web検索して、候補一覧と文面の下書きまで作ります
   ============================================================ */

const CONFIDENCE = {
  high: ['確度：高', 'text-emerald-300 ring-emerald-400/30 bg-emerald-400/10'],
  medium: ['確度：中', 'text-amber-300 ring-amber-400/30 bg-amber-400/10'],
  low: ['要確認', 'text-red-300 ring-red-400/30 bg-red-400/10'],
} as const

export function AgentPanel() {
  const { data } = useData()
  const { addTask } = useLibrary()
  const { account } = useAuth()

  const [job, setJob] = useState<JobKey>('venue')
  const [request, setRequest] = useState('')
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState('')
  const [result, setResult] = useState<AgentResult | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<{ ai: string[]; search: string[] } | null>(null)
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void checkAgent().then(setStatus)
  }, [])

  const info = JOB_INFO[job]
  const staff = data.staff.find((s) => s.id === info.staffId)

  const run = async () => {
    if (!request.trim() || busy) return
    setBusy(true)
    setError('')
    setResult(null)
    setSaved(false)

    setStep('検索キーワードを考えています…')
    window.setTimeout(() => setStep('Webを検索しています…'), 3000)
    window.setTimeout(() => setStep('集めた情報を読んでまとめています…'), 9000)

    const r = await runAgent(job, request.trim(), data)
    if (r.error) setError(r.error)
    else setResult(r)
    setStep('')
    setBusy(false)
  }

  /** 結果をタスクとして登録する */
  const saveAsTask = async () => {
    if (!result || !staff) return
    await addTask({
      title: `【${result.label}】${request.trim().slice(0, 40)}の結果を確認する`,
      assignee: staff.id,
      status: 'todo',
      due: '',
      priority: 'high',
    })
    setSaved(true)
  }

  const searchReady = status !== null && status.search.length > 0

  return (
    <Panel
      title="AI社員に仕事を頼む（Web検索）"
      action={
        status === null ? (
          <span className="text-[9px] text-slate-500">確認中…</span>
        ) : searchReady ? (
          <StateBadge text={`${status.search.join(' / ')} で検索`} />
        ) : (
          <StateBadge text="検索APIキー未設定" tone="warn" />
        )
      }
    >
      {!searchReady && status !== null && (
        <p className="mb-3 text-[10px] text-amber-300/90 bg-amber-400/10 ring-1 ring-amber-400/25 rounded-lg px-3 py-2 leading-relaxed">
          Vercelの環境変数に <b>TAVILY_API_KEY</b> または <b>BRAVE_API_KEY</b> を登録して再デプロイすると使えます。
          両方登録すると、片方が失敗したときに自動で切り替わります。
        </p>
      )}

      {/* 仕事の種類 */}
      <div className="inner-grid grid grid-cols-3 gap-2 mb-2.5">
        {(Object.keys(JOB_INFO) as JobKey[]).map((k) => {
          const j = JOB_INFO[k]
          const st = data.staff.find((s) => s.id === j.staffId)
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                setJob(k)
                setResult(null)
                setError('')
              }}
              className={`panel panel-hover p-2.5 text-center ${
                job === k ? 'ring-1 ring-cyan-400/50' : ''
              }`}
            >
              <div className="text-[16px]">{j.icon}</div>
              <p className="text-[10px] text-slate-200 mt-1 leading-tight">{j.label}</p>
              {st && <p className={`text-[9px] mt-0.5 ${ACCENT[st.accent].text}`}>{st.name}</p>}
            </button>
          )
        })}
      </div>

      {/* 依頼内容 */}
      <div className="flex items-start gap-2.5">
        {staff && <Avatar name={staff.name} src={staff.avatar} accent={staff.accent} size={40} />}
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          rows={2}
          placeholder={info.hint}
          aria-label="依頼内容"
          className="flex-1 bg-night-950/70 rounded-lg px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none resize-none"
        />
      </div>

      <button
        type="button"
        onClick={() => void run()}
        disabled={busy || !request.trim() || !account.canEdit}
        className="mt-2 w-full py-2.5 rounded-lg text-[12px] font-bold text-cyan-50 bg-cyan-500/30 ring-1 ring-cyan-400/50 hover:bg-cyan-500/45 disabled:opacity-40 transition flex items-center justify-center gap-1.5"
      >
        <IconSparkle className="w-4 h-4" />
        {busy ? '仕事中です…' : `${staff?.name ?? 'AI社員'}に依頼する`}
      </button>

      {busy && (
        <div className="mt-2">
          <ProgressBar value={100} accent="gradient" height={3} />
          <p className="text-[11px] text-cyan-300 mt-1.5">{step}</p>
          <p className="text-[9px] text-slate-600">30〜60秒かかります</p>
        </div>
      )}

      {error && (
        <p className="mt-2 text-[11px] text-red-300 bg-red-500/10 ring-1 ring-red-400/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* 結果 */}
      {result && (
        <div className="mt-3 space-y-2.5">
          <div className="panel p-2.5">
            <p className="text-[11px] text-slate-200 leading-relaxed">{result.summary}</p>
            <p className="text-[9px] text-slate-600 mt-1.5">
              検索キーワード：{result.queries.join(' / ')} ／ {result.sourceCount}件のページを確認（
              {result.engines.join('・')}）
            </p>
          </div>

          {/* 候補一覧 */}
          {result.items.length > 0 && (
            <ul className="scroll-box space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {result.items.map((it, i) => {
                const c = CONFIDENCE[it.confidence ?? 'medium']
                return (
                  <li key={i} className="panel p-2.5">
                    <div className="flex items-start gap-2">
                      <span className="font-num text-[11px] text-slate-600 shrink-0">{i + 1}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-bold text-slate-100">{it.name}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[10px] text-slate-400">
                          {it.place && <span>{it.place}</span>}
                          {it.capacity && <span className="font-num">{it.capacity}</span>}
                          {it.cost && <span className="text-cyan-300">{it.cost}</span>}
                        </div>
                        {it.note && (
                          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{it.note}</p>
                        )}
                        {it.source && (
                          <a
                            href={it.source}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 mt-1 text-[9px] text-cyan-400/80 hover:text-cyan-300 truncate max-w-full"
                          >
                            出典を開いて確認する
                            <IconArrow className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <span className={`text-[9px] px-1.5 py-[2px] rounded ring-1 shrink-0 ${c[1]}`}>
                        {c[0]}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {/* 下書き */}
          {result.draft && (
            <div className="panel p-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[10px] text-slate-400 flex-1">文面の下書き</p>
                <button
                  type="button"
                  onClick={async () => {
                    if (await copyText(result.draft)) {
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
              </div>
              <pre className="text-[11px] text-slate-200 whitespace-pre-wrap font-sans leading-relaxed max-h-[220px] overflow-y-auto">
                {result.draft}
              </pre>
            </div>
          )}

          {result.nextSteps.length > 0 && (
            <div className="panel p-2.5">
              <p className="text-[10px] text-slate-400 mb-1.5">次にやること</p>
              <ul className="space-y-1">
                {result.nextSteps.map((s, i) => (
                  <li key={i} className="flex gap-1.5 text-[11px] text-slate-300">
                    <IconCheck className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                downloadText(
                  `${result.label}-${new Date().toISOString().slice(0, 10)}.txt`,
                  resultToText(result, request),
                )
              }
              className="flex-1 py-2 rounded-lg text-[11px] text-cyan-100 bg-cyan-500/25 ring-1 ring-cyan-400/40 hover:bg-cyan-500/40 transition"
            >
              結果をテキストで保存
            </button>
            {account.canEdit && (
              <button
                type="button"
                onClick={() => void saveAsTask()}
                disabled={saved}
                className={`px-3 py-2 rounded-lg text-[11px] ring-1 transition ${
                  saved
                    ? 'text-emerald-300 ring-emerald-400/40 bg-emerald-400/10'
                    : 'text-slate-300 ring-white/10 hover:ring-cyan-400/40 hover:text-cyan-200'
                }`}
              >
                {saved ? 'タスクに登録しました' : 'タスクに登録'}
              </button>
            )}
          </div>

          <p className="text-[10px] text-amber-300/80 bg-amber-400/10 ring-1 ring-amber-400/25 rounded-lg px-3 py-2 leading-relaxed">
            料金や連絡先は変わりやすく、閉館している場合もあります。
            連絡する前に、必ず出典URLを開いて最新の情報をご確認ください。
          </p>
        </div>
      )}
    </Panel>
  )
}
