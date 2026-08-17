import { useEffect, useState } from 'react'
import { useData } from '../lib/data'
import { useLibrary } from '../lib/library'
import {
  SERVICES,
  copyText,
  openService,
  craftPrompt,
  buildAssetList,
  downloadText,
  type CraftKind,
} from '../lib/integrations'
import { Panel, ACCENT, StateBadge, ProgressBar } from './Ui'
import { IconSparkle, IconArrow, IconCheck } from './Icons'

/* ============================================================
   外部サービス連携パネル

   AIが各サービス専用の指示文を作り、
   コピーしてサービスを開くところまで一気に進めます。
   ============================================================ */

const KINDS: { kind: CraftKind; label: string; service: string; hint: string }[] = [
  { kind: 'music', label: '楽曲を作る', service: 'suno', hint: '例：夏の海で全力疾走するような明るいロック' },
  { kind: 'image', label: '画像を作る', service: 'genspark', hint: '例：夜のステージで5人が演奏している縦長の画像' },
  { kind: 'video', label: 'MVを編集する', service: 'capcut', hint: '例：「みんな笑顔になれ」のMV構成を考えたい' },
  { kind: 'lyrics', label: '歌詞を作る', service: 'suno', hint: '例：母への感謝を伝えるバラード' },
]

/** 結果の1項目を表示する（コピーボタン付き） */
function ResultField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    if (await copyText(value)) {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }
  }
  return (
    <div className="panel p-2.5">
      <div className="flex items-center gap-2 mb-1.5">
        <p className="text-[10px] text-slate-400 flex-1">{label}</p>
        <button
          type="button"
          onClick={() => void copy()}
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
        {value}
      </pre>
    </div>
  )
}

export function IntegrationStudio() {
  const { data } = useData()
  const { media } = useLibrary()
  const [kind, setKind] = useState<CraftKind>('music')
  const [idea, setIdea] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [provider, setProvider] = useState('')
  const [copiedAll, setCopiedAll] = useState(false)

  const active = KINDS.find((k) => k.kind === kind)!
  const service = SERVICES.find((s) => s.id === active.service)!

  useEffect(() => {
    setResult(null)
    setError('')
  }, [kind])

  const run = async () => {
    if (!idea.trim() || busy) return
    setBusy(true)
    setError('')
    setResult(null)
    const r = await craftPrompt(kind, idea.trim(), data)
    if (r.error) setError(r.error)
    else {
      setResult(r.result)
      setProvider(r.provider)
    }
    setBusy(false)
  }

  /** 結果を1つの文章にまとめる */
  const allText = (): string => {
    if (!result) return ''
    return Object.entries(result)
      .map(([k, v]) => {
        const body = Array.isArray(v)
          ? v.map((x) => (typeof x === 'object' ? JSON.stringify(x, null, 1) : `・${x}`)).join('\n')
          : typeof v === 'object'
            ? JSON.stringify(v, null, 1)
            : String(v)
        return `【${k}】\n${body}`
      })
      .join('\n\n')
  }

  /** 主要な項目（コピーして貼るもの）を取り出す */
  const mainFields = (): [string, string][] => {
    if (!result) return []
    const pick: [string, string][] = []
    const g = (key: string) => (typeof result[key] === 'string' ? (result[key] as string) : '')

    if (kind === 'music') {
      if (g('title')) pick.push(['曲のタイトル', g('title')])
      if (g('style')) pick.push(['Sunoの Style 欄に貼る（英語）', g('style')])
      if (g('lyrics')) pick.push(['Sunoの Lyrics 欄に貼る', g('lyrics')])
      if (g('negative')) pick.push(['避けたい要素', g('negative')])
    } else if (kind === 'image') {
      if (g('title')) pick.push(['用途', g('title')])
      if (g('prompt')) pick.push(['Gensparkに貼る（英語）', g('prompt')])
      if (g('promptJa')) pick.push(['日本語訳（確認用）', g('promptJa')])
      if (g('negative')) pick.push(['避けたい要素', g('negative')])
      if (g('aspect')) pick.push(['画面の比率', g('aspect')])
    } else if (kind === 'lyrics') {
      if (g('title')) pick.push(['曲のタイトル', g('title')])
      if (g('theme')) pick.push(['テーマ', g('theme')])
      if (g('lyrics')) pick.push(['歌詞', g('lyrics')])
    } else if (kind === 'video') {
      if (g('title')) pick.push(['動画の内容', g('title')])
      if (g('textStyle')) pick.push(['テロップの指定', g('textStyle')])
    }
    return pick
  }

  /** 構成表（MV編集）とパート割り（歌詞） */
  const rows = (): { left: string; mid: string; right: string }[] => {
    if (!result) return []
    if (kind === 'video' && Array.isArray(result.structure)) {
      return (result.structure as Record<string, string>[]).map((r) => ({
        left: r.time ?? '',
        mid: r.scene ?? '',
        right: r.effect ?? '',
      }))
    }
    if (kind === 'lyrics' && Array.isArray(result.parts)) {
      return (result.parts as Record<string, string>[]).map((r) => ({
        left: r.section ?? '',
        mid: r.member ?? '',
        right: r.reason ?? '',
      }))
    }
    return []
  }

  const tips = Array.isArray(result?.tips) ? (result!.tips as string[]) : []
  const effects = Array.isArray(result?.effects) ? (result!.effects as string[]) : []

  /** 指示文をコピーしてサービスを開く */
  const copyAndOpen = async () => {
    const text = mainFields()[1]?.[1] || mainFields()[0]?.[1] || allText()
    await copyText(text)
    setCopiedAll(true)
    window.setTimeout(() => setCopiedAll(false), 2500)
    openService(service.url)
  }

  return (
    <Panel
      title="外部サービス連携"
      className="scroll-mt-20"
      action={provider ? <StateBadge text={`${provider} が作成`} /> : undefined}
    >
      <div id="integration" />

      {/* サービス一覧 */}
      <div className="inner-grid grid grid-cols-5 gap-2 mb-3">
        {SERVICES.map((s) => {
          const a = ACCENT[s.accent]
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => openService(s.url)}
              className="panel panel-hover py-2 px-1 text-center"
              title={`${s.name} を新しいタブで開く`}
            >
              <div className="text-[16px]">{s.icon}</div>
              <p className={`text-[10px] mt-0.5 truncate ${a.text}`}>{s.name}</p>
              <p className="text-[8px] text-slate-600 truncate">{s.purpose}</p>
              <p className="text-[8px] mt-0.5">
                {s.api === 'official' ? (
                  <span className="text-emerald-400">API連携済</span>
                ) : (
                  <span className="text-slate-600">手動連携</span>
                )}
              </p>
            </button>
          )
        })}
      </div>

      {/* 何を作るか */}
      <div className="flex flex-wrap gap-1.5 mb-2.5">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            onClick={() => setKind(k.kind)}
            className={`text-[11px] px-2.5 py-1.5 rounded-md transition ${
              kind === k.kind
                ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40'
                : 'text-slate-400 ring-1 ring-white/10 hover:text-slate-100'
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        rows={2}
        placeholder={active.hint}
        aria-label="作りたいもの"
        className="w-full bg-night-950/70 rounded-lg px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none transition resize-none"
      />

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => void run()}
          disabled={busy || !idea.trim()}
          className="flex-1 py-2.5 rounded-lg text-[12px] font-bold text-cyan-50 bg-cyan-500/30 ring-1 ring-cyan-400/50 hover:bg-cyan-500/45 disabled:opacity-40 transition flex items-center justify-center gap-1.5"
        >
          <IconSparkle className="w-4 h-4" />
          {busy ? 'AIが指示文を作っています…' : `${service.name}用の指示文をAIに作らせる`}
        </button>
      </div>

      {busy && (
        <div className="mt-2">
          <ProgressBar value={100} accent="gradient" height={3} />
        </div>
      )}

      {error && (
        <p className="mt-2 text-[11px] text-red-300 bg-red-500/10 ring-1 ring-red-400/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* 結果 */}
      {result && (
        <div className="mt-3 space-y-2">
          {mainFields().map(([label, value]) => (
            <ResultField key={label} label={label} value={value} />
          ))}

          {rows().length > 0 && (
            <div className="panel p-2.5">
              <p className="text-[10px] text-slate-400 mb-1.5">
                {kind === 'video' ? '構成表' : 'パート割り'}
              </p>
              <ul className="space-y-1">
                {rows().map((r, i) => (
                  <li key={i} className="flex gap-2 text-[11px] items-start">
                    <span className="font-num text-cyan-300 shrink-0 w-16">{r.left}</span>
                    <span className="text-slate-200 flex-1">{r.mid}</span>
                    <span className="text-slate-500 text-[10px] flex-1">{r.right}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {effects.length > 0 && (
            <div className="panel p-2.5">
              <p className="text-[10px] text-slate-400 mb-1.5">CapCutで使う機能</p>
              <div className="flex flex-wrap gap-1.5">
                {effects.map((e, i) => (
                  <span key={i} className="text-[10px] px-2 py-1 rounded-md bg-white/[0.04] ring-1 ring-white/10 text-slate-300">
                    {e}
                  </span>
                ))}
              </div>
            </div>
          )}

          {tips.length > 0 && (
            <div className="panel p-2.5">
              <p className="text-[10px] text-slate-400 mb-1.5">制作のコツ</p>
              <ul className="space-y-1">
                {tips.map((t, i) => (
                  <li key={i} className="flex gap-1.5 text-[11px] text-slate-300">
                    <IconCheck className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* サービスを開く */}
          <button
            type="button"
            onClick={() => void copyAndOpen()}
            className="w-full py-2.5 rounded-lg text-[12px] font-bold text-slate-900 bg-cyan-400 hover:bg-cyan-300 transition flex items-center justify-center gap-1.5"
          >
            {copiedAll ? 'コピーしました。貼り付けてください' : `指示文をコピーして ${service.name} を開く`}
            <IconArrow className="w-4 h-4" />
          </button>

          <p className="text-[10px] text-slate-500 leading-relaxed">
            {service.bringBack && `できあがったら、${service.bringBack}。`}
            アプリに戻せば、AI社員や会議ルームからも参照できるようになります。
          </p>
        </div>
      )}

      {/* CapCut用の素材リスト */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <p className="text-[11px] text-slate-400 flex-1">
            アップロード済みの素材（{media.length}件）をCapCutに持っていく
          </p>
          <button
            type="button"
            onClick={() =>
              downloadText(
                `capcut-assets-${new Date().toISOString().slice(0, 10)}.txt`,
                buildAssetList(data, media),
              )
            }
            disabled={media.length === 0}
            className="text-[10px] px-2.5 py-1.5 rounded-md ring-1 ring-white/10 text-slate-300 hover:ring-cyan-400/40 hover:text-cyan-200 disabled:opacity-40 transition shrink-0"
          >
            素材リストを保存
          </button>
        </div>
        <p className="mt-1 text-[9px] text-slate-600">
          楽曲・画像・動画のダウンロードURLをまとめたテキストを保存します。CapCutで読み込むときに使ってください。
        </p>
      </div>
    </Panel>
  )
}
