import { useEffect, useRef, useState } from 'react'
import JSZip from 'jszip'
import { useData } from '../lib/data'
import { useLibrary } from '../lib/library'
import { useAuth } from '../lib/auth'
import {
  buildStoryboard,
  generateImage,
  checkStability,
  base64ToFile,
  estimateCost,
  MODEL_INFO,
  type ModelKey,
  type Storyboard,
  type Shot,
} from '../lib/stability'
import { uploadFile } from '../lib/storage'
import { Panel, ProgressBar, StateBadge, MoreLink } from './Ui'
import { IconSparkle, IconFilm, IconCheck } from './Icons'

/* ============================================================
   MV一括生成
   絵コンテを作り → 全カットの画像をまとめて生成 →
   ZIPで保存、またはアプリのライブラリに登録します
   ============================================================ */

type Phase = 'setup' | 'board' | 'running' | 'done'

interface Made {
  no: number
  image: string
  scene: string
}

export function MvGenerator() {
  const { data } = useData()
  const { addMedia } = useLibrary()
  const { account } = useAuth()

  const [phase, setPhase] = useState<Phase>('setup')
  const [title, setTitle] = useState('')
  const [mood, setMood] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [shotCount, setShotCount] = useState(48)
  const [seconds, setSeconds] = useState(5)
  const [style, setStyle] = useState('anime')
  const [model, setModel] = useState<ModelKey>('core')

  const [board, setBoard] = useState<Storyboard | null>(null)
  const [made, setMade] = useState<Made[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [failed, setFailed] = useState<number[]>([])
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [credits, setCredits] = useState<number | null>(null)
  const stopRef = useRef(false)

  useEffect(() => {
    void checkStability().then((r) => {
      setConfigured(r.configured)
      setCredits(r.credits)
    })
  }, [])

  const cost = estimateCost(shotCount, model)
  const minutes = Math.round((shotCount * seconds) / 60 * 10) / 10

  /* ── 絵コンテを作る ────────────────────── */
  const makeBoard = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    setMessage('AIが絵コンテを作っています…（20〜40秒かかります）')
    const r = await buildStoryboard(
      { title, lyrics, mood, shotCount, secondsPerShot: seconds, style },
      data,
    )
    if (r.error || !r.board) setError(r.error ?? '絵コンテを作れませんでした')
    else {
      setBoard(r.board)
      setPhase('board')
    }
    setMessage('')
    setBusy(false)
  }

  /* ── 全カットを生成する ────────────────── */
  const runAll = async () => {
    if (!board || busy) return
    setBusy(true)
    setPhase('running')
    setError('')
    setFailed([])
    setMade([])
    stopRef.current = false

    const results: Made[] = []
    const errs: number[] = []

    for (let i = 0; i < board.shots.length; i++) {
      if (stopRef.current) {
        setMessage('中止しました')
        break
      }
      const shot = board.shots[i]
      setMessage(`${i + 1} / ${board.shots.length} 枚目を生成中… （${shot.scene}）`)
      setProgress(Math.round((i / board.shots.length) * 100))

      const r = await generateImage(shot.prompt, board.negative, board.aspect, model)
      if (r.image) {
        results.push({ no: shot.no, image: r.image, scene: shot.scene })
        setMade([...results])
      } else {
        errs.push(shot.no)
        setFailed([...errs])
        // クレジット不足など致命的なエラーは止めます
        if (r.error?.includes('クレジット') || r.error?.includes('APIキー')) {
          setError(r.error)
          break
        }
      }
      // 短時間に送りすぎないよう少し待ちます
      await new Promise((res) => setTimeout(res, 350))
    }

    setProgress(100)
    setMessage(`${results.length}枚できました${errs.length ? `（${errs.length}枚は失敗）` : ''}`)
    setPhase('done')
    setBusy(false)
  }

  /* ── 失敗したカットだけ作り直す ─────────── */
  const retryFailed = async () => {
    if (!board || busy || failed.length === 0) return
    setBusy(true)
    const targets = board.shots.filter((s) => failed.includes(s.no))
    const results = [...made]
    const stillFailed: number[] = []

    for (let i = 0; i < targets.length; i++) {
      setMessage(`作り直し ${i + 1} / ${targets.length} 枚目…`)
      const r = await generateImage(targets[i].prompt, board.negative, board.aspect, model)
      if (r.image) results.push({ no: targets[i].no, image: r.image, scene: targets[i].scene })
      else stillFailed.push(targets[i].no)
      await new Promise((res) => setTimeout(res, 350))
    }

    results.sort((a, b) => a.no - b.no)
    setMade(results)
    setFailed(stillFailed)
    setMessage(`作り直し完了（残り失敗 ${stillFailed.length}枚）`)
    setBusy(false)
  }

  /* ── ZIPで保存する ─────────────────────── */
  const saveZip = async () => {
    if (made.length === 0) return
    setMessage('ZIPを作っています…')
    const zip = new JSZip()
    const folder = zip.folder('mv-images')

    made.forEach((m) => {
      const name = `${String(m.no).padStart(3, '0')}.png`
      folder?.file(name, m.image, { base64: true })
    })

    // 絵コンテ表も一緒に入れます
    if (board) {
      const text = [
        `【MV絵コンテ】${board.title}`,
        `コンセプト：${board.concept}`,
        `1カット ${board.secondsPerShot} 秒 × ${board.shots.length} カット（約${minutes}分）`,
        '',
        '■ CapCutでの使い方',
        `1. mv-images フォルダの画像を、番号順にまとめて読み込みます`,
        `2. すべて選択して、表示時間を ${board.secondsPerShot} 秒にそろえます`,
        `3. 曲を下のトラックに置いて、頭を合わせます`,
        '',
        '■ カット一覧',
        ...board.shots.map(
          (s) => `${String(s.no).padStart(3, '0')}.png  ${s.start}-${s.end}  [${s.section}] ${s.scene}`,
        ),
      ].join('\n')
      zip.file('絵コンテ.txt', text)
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${board?.title || 'mv'}-images.zip`
    a.click()
    URL.revokeObjectURL(url)
    setMessage(`${made.length}枚をZIPで保存しました`)
  }

  /* ── ライブラリに登録する ──────────────── */
  const saveToLibrary = async () => {
    if (made.length === 0 || busy) return
    setBusy(true)
    for (let i = 0; i < made.length; i++) {
      setMessage(`ライブラリに登録中… ${i + 1} / ${made.length}`)
      const m = made[i]
      const file = base64ToFile(m.image, `${board?.title || 'mv'}-${String(m.no).padStart(3, '0')}.png`)
      try {
        const { url, path } = await uploadFile(file, 'image')
        await addMedia({ name: file.name, kind: 'image', url, path, size: file.size, note: m.scene })
      } catch {
        // 1枚失敗しても続けます
      }
    }
    setMessage(`${made.length}枚をライブラリに登録しました`)
    setBusy(false)
  }

  const editShot = (no: number, prompt: string) =>
    setBoard((b) => (b ? { ...b, shots: b.shots.map((s) => (s.no === no ? { ...s, prompt } : s)) } : b))

  return (
    <Panel
      title="MV画像 一括生成（Stability AI）"
      className="scroll-mt-20"
      action={
        configured === null ? (
          <span className="text-[9px] text-slate-500">確認中…</span>
        ) : configured ? (
          <span className="flex items-center gap-1.5">
            {credits !== null && (
              <span className="text-[9px] text-slate-500 font-num">残 {credits.toFixed(0)} クレジット</span>
            )}
            <StateBadge text="接続済み" />
          </span>
        ) : (
          <StateBadge text="APIキー未設定" tone="warn" />
        )
      }
    >
      <div id="mvgen" />

      {configured === false && (
        <p className="mb-3 text-[10px] text-amber-300/90 bg-amber-400/10 ring-1 ring-amber-400/25 rounded-lg px-3 py-2 leading-relaxed">
          Vercelの Settings → Environment Variables に <b>STABILITY_API_KEY</b> を登録して再デプロイすると使えます。
          キー名に VITE_ は付けないでください。絵コンテだけなら、この状態でも作れます。
        </p>
      )}

      {/* ── 設定 ──────────────────────────── */}
      {phase === 'setup' && (
        <div className="space-y-2.5">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="曲名（例：みんな笑顔になれ）"
            aria-label="曲名"
            className="w-full bg-night-950/70 rounded-lg px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
          />
          <input
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            placeholder="雰囲気（例：夏の海、青春、爽やかで前向き）"
            aria-label="雰囲気"
            className="w-full bg-night-950/70 rounded-lg px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
          />
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            rows={3}
            placeholder="歌詞（任意・入れると場面がぐっと具体的になります）"
            aria-label="歌詞"
            className="w-full bg-night-950/70 rounded-lg px-3 py-2 text-[11px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none resize-none"
          />

          <div className="inner-grid grid grid-cols-3 gap-2">
            <label className="block">
              <span className="block text-[10px] text-slate-400 mb-1">1枚の表示秒数</span>
              <select
                value={seconds}
                onChange={(e) => setSeconds(Number(e.target.value))}
                className="w-full bg-night-950/70 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 ring-1 ring-white/10 outline-none"
              >
                {[3, 4, 5, 6, 8].map((s) => (
                  <option key={s} value={s}>
                    {s}秒
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[10px] text-slate-400 mb-1">枚数</span>
              <select
                value={shotCount}
                onChange={(e) => setShotCount(Number(e.target.value))}
                className="w-full bg-night-950/70 rounded-lg px-2 py-1.5 text-[11px] font-num text-slate-200 ring-1 ring-white/10 outline-none"
              >
                {[24, 36, 48, 54, 60, 72].map((c) => (
                  <option key={c} value={c}>
                    {c}枚
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-[10px] text-slate-400 mb-1">絵柄</span>
              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full bg-night-950/70 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 ring-1 ring-white/10 outline-none"
              >
                <option value="anime">アニメ調</option>
                <option value="illust">イラスト調</option>
                <option value="photo">実写風</option>
              </select>
            </label>
          </div>

          <div>
            <p className="text-[10px] text-slate-400 mb-1.5">画質（費用が変わります）</p>
            <div className="inner-grid grid grid-cols-3 gap-2">
              {(Object.keys(MODEL_INFO) as ModelKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setModel(k)}
                  className={`px-2 py-2 rounded-lg ring-1 text-left transition ${
                    model === k ? 'ring-cyan-400/45 bg-cyan-400/10' : 'ring-white/10 hover:ring-white/25'
                  }`}
                >
                  <span className="block text-[11px] font-bold text-slate-100">{MODEL_INFO[k].label}</span>
                  <span className="block text-[9px] text-cyan-300 font-num">
                    ${MODEL_INFO[k].usd.toFixed(3)} / 枚
                  </span>
                  <span className="block text-[9px] text-slate-500 leading-tight mt-0.5">
                    {MODEL_INFO[k].note}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 見積もり */}
          <div className="panel p-2.5 flex items-center gap-3">
            <IconFilm className="w-5 h-5 text-cyan-300 shrink-0" />
            <div className="text-[11px] flex-1">
              <p className="text-slate-200">
                {shotCount}枚 × {seconds}秒 ＝ 約 <b className="font-num text-cyan-300">{minutes}分</b> のMV
              </p>
              <p className="text-slate-400 mt-0.5">
                費用の目安：
                <b className="font-num text-slate-100">
                  ${cost.usd.toFixed(2)}（約{cost.jpy.toLocaleString('ja-JP')}円）
                </b>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void makeBoard()}
            disabled={busy || (!title.trim() && !mood.trim() && !lyrics.trim())}
            className="w-full py-2.5 rounded-lg text-[12px] font-bold text-cyan-50 bg-cyan-500/30 ring-1 ring-cyan-400/50 hover:bg-cyan-500/45 disabled:opacity-40 transition flex items-center justify-center gap-1.5"
          >
            <IconSparkle className="w-4 h-4" />
            {busy ? '作成中…' : 'まず絵コンテを作る'}
          </button>
        </div>
      )}

      {/* ── 絵コンテの確認 ────────────────── */}
      {board && phase !== 'setup' && (
        <div className="space-y-2.5">
          <div className="panel p-2.5">
            <p className="text-[12px] font-bold text-slate-100">{board.title}</p>
            <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{board.concept}</p>
            <p className="text-[9px] text-slate-600 mt-1.5 font-num">
              {board.shots.length}カット × {board.secondsPerShot}秒 ／ 比率 {board.aspect} ／ {board.provider} が作成
            </p>
          </div>

          <div className="scroll-box max-h-[300px] overflow-y-auto space-y-1.5 pr-1">
            {board.shots.map((s: Shot) => {
              const img = made.find((m) => m.no === s.no)
              const isFailed = failed.includes(s.no)
              return (
                <div key={s.no} className="panel p-2 flex gap-2 items-start">
                  <div className="w-20 shrink-0">
                    {img ? (
                      <img
                        src={`data:image/png;base64,${img.image}`}
                        alt={s.scene}
                        className="w-full aspect-video object-cover rounded ring-1 ring-cyan-400/30"
                      />
                    ) : (
                      <div
                        className={`w-full aspect-video rounded ring-1 grid place-content-center text-[9px] ${
                          isFailed ? 'ring-red-400/40 text-red-400' : 'ring-white/10 text-slate-600'
                        }`}
                      >
                        {isFailed ? '失敗' : s.no}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-slate-500 font-num">
                      {s.start}–{s.end}
                      <span className="ml-1.5 text-cyan-400/70">{s.section}</span>
                    </p>
                    <p className="text-[11px] text-slate-200 truncate">{s.scene}</p>
                    <textarea
                      value={s.prompt}
                      onChange={(e) => editShot(s.no, e.target.value)}
                      rows={2}
                      disabled={phase === 'running'}
                      aria-label={`カット${s.no}のプロンプト`}
                      className="mt-1 w-full bg-night-950/70 rounded px-2 py-1 text-[9px] text-slate-400 ring-1 ring-white/10 focus:ring-cyan-400/40 outline-none resize-none disabled:opacity-60"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* 進捗 */}
          {(phase === 'running' || message) && (
            <div className="panel p-2.5">
              {phase === 'running' && <ProgressBar value={progress} accent="gradient" />}
              <p className="text-[11px] text-cyan-300 mt-1.5">{message}</p>
              {phase === 'running' && (
                <button
                  type="button"
                  onClick={() => {
                    stopRef.current = true
                  }}
                  className="mt-2 text-[10px] px-2.5 py-1 rounded-md ring-1 ring-white/10 text-slate-400 hover:text-red-300 hover:ring-red-400/40 transition"
                >
                  中止する
                </button>
              )}
            </div>
          )}

          {error && (
            <p className="text-[11px] text-red-300 bg-red-500/10 ring-1 ring-red-400/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* 操作 */}
          <div className="flex flex-wrap gap-2">
            {phase === 'board' && account.canEdit && (
              <button
                type="button"
                onClick={() => void runAll()}
                disabled={busy || !configured}
                className="flex-1 py-2.5 rounded-lg text-[12px] font-bold text-slate-900 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 transition"
              >
                {board.shots.length}枚をまとめて生成（約{estimateCost(board.shots.length, model).jpy.toLocaleString('ja-JP')}円）
              </button>
            )}

            {made.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => void saveZip()}
                  className="flex-1 py-2.5 rounded-lg text-[12px] font-bold text-cyan-50 bg-cyan-500/30 ring-1 ring-cyan-400/50 hover:bg-cyan-500/45 transition"
                >
                  ZIPで保存（絵コンテ付き）
                </button>
                <button
                  type="button"
                  onClick={() => void saveToLibrary()}
                  disabled={busy}
                  className="px-3 py-2.5 rounded-lg text-[11px] text-slate-300 ring-1 ring-white/10 hover:ring-cyan-400/40 hover:text-cyan-200 disabled:opacity-40 transition"
                >
                  ライブラリに登録
                </button>
              </>
            )}

            {failed.length > 0 && !busy && (
              <button
                type="button"
                onClick={() => void retryFailed()}
                className="px-3 py-2.5 rounded-lg text-[11px] text-amber-200 ring-1 ring-amber-400/40 hover:bg-amber-400/10 transition"
              >
                失敗した{failed.length}枚を作り直す
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setPhase('setup')
                setBoard(null)
                setMade([])
                setFailed([])
                setMessage('')
                setError('')
              }}
              disabled={busy}
              className="px-3 py-2.5 rounded-lg text-[11px] text-slate-400 ring-1 ring-white/10 hover:text-slate-100 disabled:opacity-40 transition"
            >
              最初から
            </button>
          </div>

          {made.length > 0 && (
            <div className="panel p-2.5">
              <p className="text-[10px] text-slate-400 mb-1.5 flex items-center gap-1.5">
                <IconCheck className="w-3.5 h-3.5 text-emerald-400" />
                CapCutでの組み立て方
              </p>
              <ol className="text-[10px] text-slate-400 space-y-1 list-decimal list-inside leading-relaxed">
                <li>ZIPを解凍して、画像を番号順にまとめてCapCutに読み込みます</li>
                <li>すべて選択して、表示時間を {board.secondsPerShot} 秒にそろえます</li>
                <li>曲を下のトラックに置き、頭を合わせます</li>
                <li>切り替え部分に「ディゾルブ」を一括適用すると自然につながります</li>
              </ol>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}
