import { SCALES, SCALE_LABEL, useScale } from '../lib/uiScale'

/* ============================================================
   文字の大きさの切り替え
   ============================================================ */

/** ヘッダー用（横並びの小さなボタン） */
export function ScalePicker() {
  const { scale, setScale } = useScale()

  return (
    <div
      className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg ring-1 ring-white/10"
      role="group"
      aria-label="文字の大きさ"
    >
      <span className="text-[10px] text-slate-500 shrink-0">文字</span>
      {SCALES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setScale(s)}
          aria-pressed={scale === s}
          title={`${SCALE_LABEL[s]}（${s}%）`}
          className={`px-1.5 py-0.5 rounded transition ${
            scale === s
              ? 'bg-cyan-400/20 text-cyan-200 ring-1 ring-cyan-400/40'
              : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
          }`}
          style={{ fontSize: `${9 + SCALES.indexOf(s) * 1.6}px`, lineHeight: 1.4 }}
        >
          A
        </button>
      ))}
    </div>
  )
}

/** 設定画面用（説明付きの大きなボタン） */
export function ScaleSettings() {
  const { scale, setScale } = useScale()

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {SCALES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScale(s)}
            aria-pressed={scale === s}
            className={`py-2.5 rounded-lg ring-1 transition text-center ${
              scale === s
                ? 'bg-cyan-400/15 text-cyan-100 ring-cyan-400/45'
                : 'text-slate-300 ring-white/10 hover:ring-cyan-400/30'
            }`}
          >
            <span className="block font-bold" style={{ fontSize: `${11 + SCALES.indexOf(s) * 2}px` }}>
              {SCALE_LABEL[s]}
            </span>
            <span className="block text-[10px] text-slate-500 font-num mt-0.5">{s}%</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-slate-500 leading-relaxed">
        キーボードでも変えられます：Ctrl と Shift を押しながら ↑ で大きく、↓ で小さく。
        大きくすると、横に並んでいた項目が自動で縦並びになります。
      </p>
    </div>
  )
}
