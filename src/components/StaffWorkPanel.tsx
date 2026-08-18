import { useEffect, useState } from 'react'
import { useData } from '../lib/data'
import { useAuth } from '../lib/auth'
import {
  makeSnsPosts,
  checkText,
  CHANNEL_INFO,
  TONE_LABEL,
  CHECK_KIND_LABEL,
  type Channel,
  type Tone,
  type CheckKind,
  type SnsResult,
  type CheckResult,
} from '../lib/staffWork'
import { copyText } from '../lib/integrations'
import { Panel, ProgressBar, ACCENT, StateBadge } from './Ui'
import { Avatar } from './Avatar'
import { IconSparkle, IconCheck, IconSend } from './Icons'

/* ============================================================
   葵AI（SNS投稿文）と 澪AI（公開前チェック）のパネル
   ============================================================ */

/** コピーできる文章の枠 */
function CopyBox({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="panel p-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        {label && <p className="text-[10px] text-slate-400 flex-1">{label}</p>}
        <button
          type="button"
          onClick={async () => {
            if (await copyText(text)) {
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1800)
            }
          }}
          className={`ml-auto text-[10px] px-2 py-0.5 rounded ring-1 transition ${
            copied
              ? 'text-emerald-300 ring-emerald-400/40 bg-emerald-400/10'
              : 'text-cyan-200 ring-cyan-400/40 hover:bg-cyan-400/15'
          }`}
        >
          {copied ? 'コピーしました' : 'コピー'}
        </button>
      </div>
      <pre className="text-[11px] text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">{text}</pre>
    </div>
  )
}

/* ============================================================
   葵AI：SNS投稿文
   ============================================================ */
export function SnsPanel({ onSendToCheck }: { onSendToCheck?: (text: string) => void }) {
  const { data } = useData()
  const { account } = useAuth()
  const aoi = data.staff.find((s) => s.id === 'aoi')

  const [channel, setChannel] = useState<Channel>('x')
  const [tone, setTone] = useState<Tone>('friendly')
  const [topic, setTopic] = useState('')
  const [count, setCount] = useState(3)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SnsResult | null>(null)
  const [error, setError] = useState('')

  const run = async () => {
    if (!topic.trim() || busy) return
    setBusy(true)
    setError('')
    setResult(null)
    const r = await makeSnsPosts(channel, topic.trim(), tone, count, data)
    if (r.error) setError(r.error)
    else setResult(r)
    setBusy(false)
  }

  const limit = CHANNEL_INFO[channel].limit

  return (
    <Panel
      title="SNS投稿文を作る"
      action={aoi && <span className={`text-[10px] ${ACCENT[aoi.accent].text}`}>{aoi.name}</span>}
    >
      <div className="flex items-start gap-2.5 mb-2.5">
        {aoi && <Avatar name={aoi.name} src={aoi.avatar} accent={aoi.accent} size={40} />}
        <p className="text-[10px] text-slate-500 leading-relaxed flex-1">
          媒体ごとの文字数・ハッシュタグの作法に合わせて、切り口の違う案を作ります。
        </p>
      </div>

      {/* 媒体 */}
      <div className="inner-grid grid grid-cols-3 gap-2 mb-2">
        {(Object.keys(CHANNEL_INFO) as Channel[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setChannel(c)}
            className={`panel panel-hover py-2 text-center ${channel === c ? 'ring-1 ring-cyan-400/50' : ''}`}
          >
            <div className="text-[14px]">{CHANNEL_INFO[c].icon}</div>
            <p className="text-[9px] text-slate-300 mt-0.5 leading-tight">{CHANNEL_INFO[c].label}</p>
            <p className="text-[8px] text-slate-600 font-num">〜{CHANNEL_INFO[c].limit}字</p>
          </button>
        ))}
      </div>

      <textarea
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        rows={2}
        placeholder="例：新曲「みんな笑顔になれ」のMVを今夜20時に公開します"
        aria-label="投稿したい内容"
        className="w-full bg-night-950/70 rounded-lg px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none resize-none"
      />

      <div className="flex gap-2 mt-2">
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value as Tone)}
          aria-label="文章のトーン"
          className="flex-1 bg-night-950/70 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 ring-1 ring-white/10 outline-none"
        >
          {(Object.keys(TONE_LABEL) as Tone[]).map((t) => (
            <option key={t} value={t}>
              {TONE_LABEL[t]}
            </option>
          ))}
        </select>
        <select
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          aria-label="作る案の数"
          className="w-24 bg-night-950/70 rounded-lg px-2 py-1.5 text-[11px] font-num text-slate-200 ring-1 ring-white/10 outline-none"
        >
          {[2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}案
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={() => void run()}
        disabled={busy || !topic.trim() || !account.canEdit}
        className="mt-2 w-full py-2.5 rounded-lg text-[12px] font-bold text-cyan-50 bg-cyan-500/30 ring-1 ring-cyan-400/50 hover:bg-cyan-500/45 disabled:opacity-40 transition flex items-center justify-center gap-1.5"
      >
        <IconSparkle className="w-4 h-4" />
        {busy ? '葵AIが書いています…' : '投稿文を作ってもらう'}
      </button>

      {busy && <ProgressBar value={100} accent="gradient" height={3} />}

      {error && (
        <p className="mt-2 text-[11px] text-red-300 bg-red-500/10 ring-1 ring-red-400/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3 space-y-2">
          {result.posts.map((p, i) => {
            const over = p.chars > limit
            return (
              <div key={i} className="panel p-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] px-1.5 py-[2px] rounded bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-400/30">
                    {p.approach}
                  </span>
                  <span className={`text-[9px] font-num ${over ? 'text-red-400' : 'text-slate-500'}`}>
                    {p.chars}字{over && `（${limit}字超過）`}
                  </span>
                  {p.bestTime && <span className="text-[9px] text-slate-600">{p.bestTime}</span>}
                  <button
                    type="button"
                    onClick={async () => {
                      await copyText(p.text)
                    }}
                    className="ml-auto text-[10px] px-2 py-0.5 rounded ring-1 ring-cyan-400/40 text-cyan-200 hover:bg-cyan-400/15 transition"
                  >
                    コピー
                  </button>
                  {onSendToCheck && (
                    <button
                      type="button"
                      onClick={() => onSendToCheck(p.text)}
                      className="text-[10px] px-2 py-0.5 rounded ring-1 ring-white/10 text-slate-300 hover:ring-cyan-400/40 hover:text-cyan-200 transition flex items-center gap-1"
                      title="澪AIにチェックしてもらう"
                    >
                      <IconSend className="w-3 h-3" />
                      澪AIへ
                    </button>
                  )}
                </div>
                <pre className="text-[11px] text-slate-100 whitespace-pre-wrap font-sans leading-relaxed">
                  {p.text}
                </pre>
                {p.aim && <p className="text-[9px] text-slate-600 mt-1.5">狙い：{p.aim}</p>}
              </div>
            )
          })}

          {result.hashtagPool.length > 0 && (
            <div className="panel p-2.5">
              <p className="text-[10px] text-slate-400 mb-1.5">予備のハッシュタグ</p>
              <div className="flex flex-wrap gap-1.5">
                {result.hashtagPool.map((h, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => void copyText(h)}
                    className="text-[10px] px-2 py-1 rounded-md bg-white/[0.04] ring-1 ring-white/10 text-slate-300 hover:ring-cyan-400/40 hover:text-cyan-200 transition"
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          {result.tips.length > 0 && (
            <div className="panel p-2.5">
              <p className="text-[10px] text-slate-400 mb-1.5">投稿のコツ</p>
              <ul className="space-y-1">
                {result.tips.map((t, i) => (
                  <li key={i} className="flex gap-1.5 text-[11px] text-slate-300">
                    <IconCheck className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}

/* ============================================================
   澪AI：公開前チェック
   ============================================================ */
const VERDICT = {
  ok: ['公開して大丈夫です', 'text-emerald-300 ring-emerald-400/40 bg-emerald-400/10', '✅'],
  caution: ['直したほうがよい点があります', 'text-amber-300 ring-amber-400/40 bg-amber-400/10', '⚠️'],
  stop: ['公開前に直してください', 'text-red-300 ring-red-400/40 bg-red-400/10', '🛑'],
} as const

const LEVEL = {
  high: ['必ず直す', 'text-red-300 ring-red-400/30 bg-red-400/10'],
  medium: ['直したい', 'text-amber-300 ring-amber-400/30 bg-amber-400/10'],
  low: ['好みの問題', 'text-slate-400 ring-white/10 bg-white/5'],
} as const

export function CheckPanel({ initialText = '' }: { initialText?: string }) {
  const { data } = useData()
  const { account } = useAuth()
  const mio = data.staff.find((s) => s.id === 'qa')

  const [text, setText] = useState(initialText)
  const [kind, setKind] = useState<CheckKind>('post')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [error, setError] = useState('')

  // 葵AIから送られてきた文章を受け取ります
  useEffect(() => {
    if (initialText) {
      setText(initialText)
      setResult(null)
      setError('')
    }
  }, [initialText])

  const run = async () => {
    if (!text.trim() || busy) return
    setBusy(true)
    setError('')
    setResult(null)
    const r = await checkText(text.trim(), kind, data)
    if (r.error) setError(r.error)
    else setResult(r)
    setBusy(false)
  }

  return (
    <Panel
      title="公開前チェック"
      action={mio && <span className={`text-[10px] ${ACCENT[mio.accent].text}`}>{mio.name}</span>}
    >
      <div className="flex items-start gap-2.5 mb-2.5">
        {mio && <Avatar name={mio.name} src={mio.avatar} accent={mio.accent} size={40} />}
        <p className="text-[10px] text-slate-500 leading-relaxed flex-1">
          誤字・言葉づかい・配慮が必要な表現・事実確認が要る箇所を洗い出します。
          会社のデータと食い違う日付や数字も指摘します。
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-2">
        {(Object.keys(CHECK_KIND_LABEL) as CheckKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`text-[11px] px-2.5 py-1.5 rounded-md transition ${
              kind === k
                ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40'
                : 'text-slate-400 ring-1 ring-white/10 hover:text-slate-100'
            }`}
          >
            {CHECK_KIND_LABEL[k]}
          </button>
        ))}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="チェックしたい文章を貼り付けてください"
        aria-label="チェックする文章"
        className="w-full bg-night-950/70 rounded-lg px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none resize-none"
      />
      <p className="text-right text-[9px] text-slate-600 font-num mt-0.5">{[...text].length}字</p>

      <button
        type="button"
        onClick={() => void run()}
        disabled={busy || !text.trim() || !account.canEdit}
        className="mt-1 w-full py-2.5 rounded-lg text-[12px] font-bold text-cyan-50 bg-cyan-500/30 ring-1 ring-cyan-400/50 hover:bg-cyan-500/45 disabled:opacity-40 transition flex items-center justify-center gap-1.5"
      >
        <IconCheck className="w-4 h-4" />
        {busy ? '澪AIが確認しています…' : 'チェックしてもらう'}
      </button>

      {busy && <ProgressBar value={100} accent="gradient" height={3} />}

      {error && (
        <p className="mt-2 text-[11px] text-red-300 bg-red-500/10 ring-1 ring-red-400/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-3 space-y-2">
          {/* 判定 */}
          <div className={`rounded-lg px-3 py-2.5 ring-1 ${VERDICT[result.verdict][1]}`}>
            <p className="text-[13px] font-bold flex items-center gap-2">
              <span>{VERDICT[result.verdict][2]}</span>
              {VERDICT[result.verdict][0]}
            </p>
            <p className="text-[11px] mt-1 opacity-90 leading-relaxed">{result.summary}</p>
          </div>

          {/* 件数 */}
          <div className="inner-grid grid grid-cols-3 gap-2">
            {(['high', 'medium', 'low'] as const).map((l) => (
              <div key={l} className="panel py-2 text-center">
                <p className={`font-num text-[16px] font-bold ${LEVEL[l][1].split(' ')[0]}`}>
                  {result.counts[l]}
                </p>
                <p className="text-[9px] text-slate-500">{LEVEL[l][0]}</p>
              </div>
            ))}
          </div>

          {/* 指摘 */}
          {result.issues.map((iss, i) => (
            <div key={i} className="panel p-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[9px] px-1.5 py-[2px] rounded ring-1 ${LEVEL[iss.level][1]}`}>
                  {LEVEL[iss.level][0]}
                </span>
                <span className="text-[9px] text-slate-500">{iss.category}</span>
              </div>
              {iss.quote && (
                <p className="text-[11px] text-slate-400 border-l-2 border-red-400/40 pl-2 mb-1.5">
                  {iss.quote}
                </p>
              )}
              <p className="text-[11px] text-slate-300 leading-relaxed">{iss.reason}</p>
              {iss.fix && (
                <p className="text-[11px] text-emerald-300 mt-1 leading-relaxed">→ {iss.fix}</p>
              )}
            </div>
          ))}

          {result.issues.length === 0 && (
            <p className="text-[11px] text-emerald-300 text-center py-3">
              直したほうがよい点は見つかりませんでした
            </p>
          )}

          {/* 良かった点 */}
          {result.good.length > 0 && (
            <div className="panel p-2.5">
              <p className="text-[10px] text-slate-400 mb-1.5">良かった点</p>
              <ul className="space-y-1">
                {result.good.map((g, i) => (
                  <li key={i} className="flex gap-1.5 text-[11px] text-slate-300">
                    <IconCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 修正版 */}
          {result.corrected && <CopyBox label="修正版（そのまま使えます）" text={result.corrected} />}
        </div>
      )}
    </Panel>
  )
}
