import { useEffect, useState } from 'react'
import {
  NOW_PLAYING,
  SONGS,
  GALLERY,
  YOUTUBE,
  YOUTUBE_TREND,
  VIDEOS,
  NEXT_LIVE,
  LIVES,
  FILES,
  STORAGE,
} from '../data/mock'
import { Panel, MoreLink, ProgressBar, ACCENT } from '../components/Ui'
import { Donut, Sparkline, Waveform } from '../components/Charts'
import {
  IconPlay,
  IconPause,
  IconPrev,
  IconNext,
  IconMusic,
  IconImage,
  IconFilm,
  IconMic,
  IconYoutube,
  IconFolder,
  IconCheck,
  IconSparkle,
} from '../components/Icons'

/* ============================================================
   画面② クリエイティブスタジオ
   ============================================================ */

const SECTIONS = [
  { id: 'music', label: '音楽制作', icon: IconMusic, accent: 'purple' as const },
  { id: 'image', label: '画像生成', icon: IconImage, accent: 'cyan' as const },
  { id: 'mv', label: 'MV制作', icon: IconFilm, accent: 'pink' as const },
  { id: 'live', label: 'ライブ管理', icon: IconMic, accent: 'amber' as const },
  { id: 'youtube', label: 'YouTube管理', icon: IconYoutube, accent: 'blue' as const },
  { id: 'files', label: 'ファイル管理', icon: IconFolder, accent: 'green' as const },
]

/** 画像が無いときのネオンプレースホルダー */
function Thumb({ src, label, ratio = 'aspect-video' }: { src?: string; label?: string; ratio?: string }) {
  const [failed, setFailed] = useState(false)
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={label ?? ''}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`w-full ${ratio} object-cover rounded-lg ring-1 ring-white/10`}
      />
    )
  }
  return (
    <div
      className={`w-full ${ratio} rounded-lg ring-1 ring-cyan-400/20 grid place-content-center text-[10px] text-slate-500 overflow-hidden relative`}
      style={{ background: 'linear-gradient(135deg, rgba(34,211,238,0.12), rgba(168,85,247,0.14))' }}
    >
      <span className="absolute inset-y-0 w-1/3 bg-white/5 blur-xl animate-sweep" aria-hidden="true" />
      <IconSparkle className="w-5 h-5 text-cyan-300/60 mx-auto" />
    </div>
  )
}

export function Studio() {
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(NOW_PLAYING.progress)
  const [tab, setTab] = useState<'lyrics' | 'compose' | 'bgm' | 'manage'>('lyrics')
  const [imageTab, setImageTab] = useState<'gen' | 'edit' | 'gallery'>('gen')
  const [prompt, setPrompt] = useState('DayDream Plus 5人 ステージ ネオンライト')

  useEffect(() => {
    if (!playing) return
    const t = setInterval(() => setPos((p) => (p >= 100 ? 0 : p + 0.4)), 200)
    return () => clearInterval(t)
  }, [playing])

  const secToText = (p: number) => {
    const total = 259 // 04:19
    const cur = Math.floor((p / 100) * total)
    return `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`
  }

  return (
    <div className="space-y-3">
      {/* セクション切替 */}
      <nav className="panel px-3 py-2 flex flex-wrap gap-2" aria-label="制作メニュー">
        {SECTIONS.map((sc) => {
          const Icon = sc.icon
          const a = ACCENT[sc.accent]
          return (
            <a
              key={sc.id}
              href={`#${sc.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] text-slate-300 hover:text-slate-50 ring-1 ring-white/10 hover:ring-cyan-400/40 transition"
            >
              <Icon className={`w-4 h-4 ${a.text}`} />
              {sc.label}
            </a>
          )
        })}
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3">
        {/* ── 音楽制作 ───────────────────────────── */}
        <Panel
          title="音楽制作"
          className="scroll-mt-20 2xl:col-span-1"
          action={<MoreLink label="楽曲管理" />}
        >
          <div id="music" />
          <div className="flex gap-1.5 mb-3">
            {([
              ['lyrics', '作詞'],
              ['compose', '作曲'],
              ['bgm', 'BGM生成'],
              ['manage', '編曲'],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className={`text-[11px] px-2.5 py-1 rounded-md transition ${
                  tab === k
                    ? 'bg-purple-400/15 text-purple-200 ring-1 ring-purple-400/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <p className="text-[13px] font-bold text-slate-100">{NOW_PLAYING.title}</p>
          <p className="text-[10px] text-slate-500">{NOW_PLAYING.credit}</p>

          <div className="mt-2">
            <Waveform progress={pos} accent="purple" />
          </div>

          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPos((p) => Math.max(0, p - 10))}
              className="text-slate-400 hover:text-slate-100 transition"
              aria-label="前へ"
            >
              <IconPrev className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setPlaying((v) => !v)}
              className="w-10 h-10 rounded-full grid place-content-center bg-purple-500/25 ring-1 ring-purple-400/40 text-purple-100 hover:bg-purple-500/40 transition"
              aria-label={playing ? '一時停止' : '再生'}
            >
              {playing ? <IconPause className="w-5 h-5" /> : <IconPlay className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => setPos((p) => Math.min(100, p + 10))}
              className="text-slate-400 hover:text-slate-100 transition"
              aria-label="次へ"
            >
              <IconNext className="w-5 h-5" />
            </button>
            <span className="ml-auto font-num text-[11px] text-slate-400">
              {secToText(pos)} / {NOW_PLAYING.total}
            </span>
          </div>

          <p className="mt-4 mb-1.5 text-[11px] text-slate-400">最近の楽曲</p>
          <ul className="space-y-1.5">
            {SONGS.map((song) => (
              <li key={song.id} className="flex items-center gap-2 text-[11px] panel px-2.5 py-1.5">
                <IconMusic className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                <span className="text-slate-200 truncate flex-1">{song.title}</span>
                <span className="font-num text-slate-500">{song.length}</span>
                <span className="font-num text-slate-600 hidden sm:inline">{song.date}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* ── 画像生成 ───────────────────────────── */}
        <Panel title="画像生成（Genspark連携）" className="scroll-mt-20" action={<MoreLink />}>
          <div id="image" />
          <div className="flex gap-1.5 mb-3">
            {([
              ['gen', '画像生成'],
              ['edit', '画像編集'],
              ['gallery', 'ギャラリー'],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setImageTab(k)}
                className={`text-[11px] px-2.5 py-1 rounded-md transition ${
                  imageTab === k
                    ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <Thumb src={GALLERY[0]} label="最新の生成画像" />

          <div className="mt-3 flex gap-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              aria-label="画像生成プロンプト"
              className="flex-1 bg-night-950/70 rounded-lg px-3 py-2 text-[11px] text-slate-200 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none transition"
            />
            <button
              type="button"
              className="px-3 rounded-lg text-[11px] bg-cyan-500/25 ring-1 ring-cyan-400/40 text-cyan-100 hover:bg-cyan-500/40 transition"
            >
              生成する
            </button>
          </div>

          <p className="mt-3 mb-1.5 text-[11px] text-slate-400">最近の生成画像</p>
          <div className="grid grid-cols-5 gap-1.5">
            {GALLERY.map((g, i) => (
              <Thumb key={i} src={g} ratio="aspect-[3/4]" />
            ))}
          </div>
        </Panel>

        {/* ── MV制作 ─────────────────────────────── */}
        <Panel title="MV制作（CapCut連携）" className="scroll-mt-20" action={<MoreLink />}>
          <div id="mv" />
          <div className="relative">
            <Thumb src="/gallery/mv.png" label="MVプレビュー" />
            <button
              type="button"
              className="absolute inset-0 grid place-content-center"
              aria-label="MVを再生"
            >
              <span className="w-12 h-12 rounded-full grid place-content-center bg-black/50 ring-1 ring-white/30 text-white backdrop-blur-sm hover:bg-black/70 transition">
                <IconPlay className="w-5 h-5" />
              </span>
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
            <span className="font-num">01:20</span>
            <div className="flex-1">
              <ProgressBar value={31} accent="pink" height={4} />
            </div>
            <span className="font-num">04:19</span>
          </div>

          <p className="mt-3 mb-1.5 text-[11px] text-slate-400">最近のMV</p>
          <div className="grid grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <Thumb key={i} src={`/gallery/mv${i + 1}.png`} />
            ))}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
            {['字幕生成', 'エフェクト', '音声同期'].map((x) => (
              <button
                key={x}
                type="button"
                className="panel panel-hover py-1.5 text-slate-300 hover:text-pink-200"
              >
                {x}
              </button>
            ))}
          </div>
        </Panel>

        {/* ── ライブ管理 ─────────────────────────── */}
        <Panel title="ライブ管理" className="scroll-mt-20" action={<MoreLink label="詳細を見る" />}>
          <div id="live" />
          <p className="text-[10px] text-slate-400">次回ライブ：{NEXT_LIVE.date}</p>
          <p className="text-[14px] font-bold text-slate-100 mt-0.5">{NEXT_LIVE.title}</p>
          <p className="text-[10px] text-slate-400">会場：{NEXT_LIVE.venue}</p>

          <div className="mt-3 flex items-center gap-4">
            <ul className="flex-1 space-y-1.5">
              {NEXT_LIVE.checks.map((c) => (
                <li key={c.label} className="flex items-center gap-2 text-[11px]">
                  <span
                    className={`w-4 h-4 rounded grid place-content-center ring-1 ${
                      c.done
                        ? 'bg-emerald-400/20 ring-emerald-400/40 text-emerald-300'
                        : 'ring-white/15 text-transparent'
                    }`}
                  >
                    <IconCheck className="w-3 h-3" />
                  </span>
                  <span className={c.done ? 'text-slate-200' : 'text-slate-500'}>{c.label}</span>
                </li>
              ))}
            </ul>
            <div className="text-center">
              <Donut value={NEXT_LIVE.progress} size={78} accent="amber" />
              <p className="text-[9px] text-slate-400 mt-1">準備進捗</p>
            </div>
          </div>

          <p className="mt-3 mb-1.5 text-[11px] text-slate-400">今後のライブ</p>
          <ul className="space-y-1.5">
            {LIVES.map((l) => (
              <li key={l.date} className="panel px-2.5 py-1.5 flex items-center gap-2 text-[11px]">
                <span className="font-num text-amber-300">{l.date}</span>
                <span className="text-slate-200 truncate">{l.title}</span>
                <span className="ml-auto text-slate-500 truncate">{l.venue}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* ── YouTube管理 ────────────────────────── */}
        <Panel title="YouTube管理" className="scroll-mt-20" action={<MoreLink label="動画一覧" />}>
          <div id="youtube" />
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              ['チャンネル登録者数', YOUTUBE.subscribers, YOUTUBE.subscribersDiff],
              ['総再生回数（今月）', YOUTUBE.views, YOUTUBE.viewsDiff],
              ['総視聴時間（時間）', YOUTUBE.watchHours, YOUTUBE.watchHoursDiff],
            ].map(([label, value, diff]) => (
              <div key={label} className="panel py-2">
                <p className="text-[9px] text-slate-400">{label}</p>
                <p className="font-num text-[15px] font-bold text-slate-50">{value}</p>
                <p className="text-[9px] text-emerald-400">{diff}</p>
              </div>
            ))}
          </div>
          <div className="mt-2">
            <Sparkline data={YOUTUBE_TREND} accent="pink" height={56} />
          </div>

          <p className="mt-2 mb-1.5 text-[11px] text-slate-400">人気の動画</p>
          <ul className="space-y-1.5">
            {VIDEOS.map((v) => (
              <li key={v.id} className="flex items-center gap-2 panel px-2 py-1.5">
                <div className="w-14 shrink-0">
                  <Thumb src={`/gallery/${v.id}.png`} />
                </div>
                <span className="text-[11px] text-slate-200 truncate flex-1">{v.title}</span>
                <span className="text-[10px] font-num text-slate-500 shrink-0">{v.views}</span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* ── ファイル管理 ───────────────────────── */}
        <Panel title="ファイル管理" className="scroll-mt-20" action={<MoreLink label="バックアップ設定" />}>
          <div id="files" />
          <div className="grid grid-cols-5 gap-2">
            {FILES.map((f) => (
              <button key={f.label} type="button" className="panel panel-hover py-3 text-center">
                <div className="text-[18px]">{f.icon}</div>
                <p className="text-[10px] text-slate-300 mt-1 truncate">{f.label}</p>
                <p className="font-num text-[10px] text-slate-500">{f.count} ファイル</p>
              </button>
            ))}
          </div>

          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>ストレージ使用量</span>
              <span className="font-num">
                {STORAGE.used} {STORAGE.unit} / {STORAGE.total} {STORAGE.unit}（
                {Math.round((STORAGE.used / STORAGE.total) * 100)}%）
              </span>
            </div>
            <ProgressBar value={(STORAGE.used / STORAGE.total) * 100} accent="gradient" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            {['Firebase Storage', 'Google Drive', 'ローカル保存', '自動バックアップ'].map((x) => (
              <div key={x} className="panel px-2.5 py-1.5 flex items-center gap-1.5">
                <IconCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-slate-300 truncate">{x}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
