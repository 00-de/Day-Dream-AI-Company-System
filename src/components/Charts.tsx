import { useEffect, useState } from 'react'
import { ACCENT } from './Ui'

/* ============================================================
   グラフ（外部ライブラリ不要の自前SVG）
   ============================================================ */

/** ドーナツゲージ */
export function Donut({
  value,
  size = 96,
  stroke = 9,
  accent = 'cyan',
  center,
  sub,
}: {
  value: number
  size?: number
  stroke?: number
  accent?: keyof typeof ACCENT
  center?: string
  sub?: string
}) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setShown(value), 120)
    return () => clearTimeout(t)
  }, [value])

  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const hex = ACCENT[accent].hex
  const id = `g-${accent}-${size}`

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={hex} stopOpacity="0.55" />
            <stop offset="100%" stopColor={hex} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={`url(#${id})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c - (c * shown) / 100}
          style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)', filter: `drop-shadow(0 0 6px ${hex}66)` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center leading-tight">
        <span className="font-num font-bold text-slate-100" style={{ fontSize: size / 4.4 }}>
          {center ?? `${value}%`}
        </span>
        {sub && <span className="text-[9px] text-slate-400">{sub}</span>}
      </div>
    </div>
  )
}

/** エリア付きスパークライン */
export function Sparkline({
  data,
  accent = 'cyan',
  height = 44,
  showDot = true,
}: {
  data: number[]
  accent?: keyof typeof ACCENT
  height?: number
  showDot?: boolean
}) {
  const w = 240
  const h = height
  const max = Math.max(...data)
  const min = Math.min(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - 4 - ((v - min) / span) * (h - 10)
    return [x, y] as const
  })
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${w},${h} L0,${h} Z`
  const hex = ACCENT[accent].hex
  const gid = `spark-${accent}-${data.length}-${Math.round(max)}`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height: h }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hex} stopOpacity="0.38" />
          <stop offset="100%" stopColor={hex} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path
        d={line}
        fill="none"
        stroke={hex}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 5px ${hex}88)` }}
      />
      {showDot && <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="3" fill={hex} />}
    </svg>
  )
}

/** 音声波形（再生バー用） */
export function Waveform({ progress = 60, accent = 'cyan' }: { progress?: number; accent?: keyof typeof ACCENT }) {
  const bars = 68
  const hex = ACCENT[accent].hex
  return (
    <div className="flex items-end gap-[2px] h-10 w-full" aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => {
        const seed = Math.sin(i * 12.9898) * 43758.5453
        const rand = seed - Math.floor(seed)
        const hgt = 18 + rand * 82
        const played = (i / bars) * 100 <= progress
        return (
          <span
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: `${hgt}%`,
              background: played ? hex : 'rgba(148,163,184,0.25)',
              boxShadow: played ? `0 0 5px ${hex}66` : 'none',
            }}
          />
        )
      })}
    </div>
  )
}
