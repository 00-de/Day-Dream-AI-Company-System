import type { ReactNode } from 'react'

/* ============================================================
   共通UIパーツ
   ============================================================ */

export const ACCENT: Record<string, { text: string; ring: string; bg: string; hex: string }> = {
  cyan: { text: 'text-cyan-300', ring: 'ring-cyan-400/40', bg: 'bg-cyan-400', hex: '#22d3ee' },
  blue: { text: 'text-blue-300', ring: 'ring-blue-400/40', bg: 'bg-blue-400', hex: '#3b82f6' },
  purple: { text: 'text-purple-300', ring: 'ring-purple-400/40', bg: 'bg-purple-400', hex: '#a855f7' },
  pink: { text: 'text-pink-300', ring: 'ring-pink-400/40', bg: 'bg-pink-400', hex: '#ec4899' },
  green: { text: 'text-emerald-300', ring: 'ring-emerald-400/40', bg: 'bg-emerald-400', hex: '#22c55e' },
  amber: { text: 'text-amber-300', ring: 'ring-amber-400/40', bg: 'bg-amber-400', hex: '#f59e0b' },
}

/** パネル（カード）*/
export function Panel({
  title,
  action,
  children,
  className = '',
  bodyClass = '',
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClass?: string
}) {
  return (
    <section className={`panel panel-hover animate-floatUp ${className}`}>
      {title && (
        <header className="flex items-center justify-between px-4 pt-3 pb-2">
          <h2 className="panel-title">{title}</h2>
          {action}
        </header>
      )}
      <div className={`px-4 pb-4 ${title ? '' : 'pt-4'} ${bodyClass}`}>{children}</div>
    </section>
  )
}

/** 「すべて見る」リンク */
export function MoreLink({ onClick, label = 'すべて見る' }: { onClick?: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-[11px] text-cyan-400/80 hover:text-cyan-300 transition"
    >
      {label}
    </button>
  )
}

/** 稼働中ドット */
export function StatusDot({ tone = 'green' }: { tone?: 'green' | 'amber' | 'red' }) {
  const c = tone === 'green' ? 'bg-emerald-400' : tone === 'amber' ? 'bg-amber-400' : 'bg-red-400'
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${c} animate-pulseDot`} />
}

/** 進捗バー */
export function ProgressBar({
  value,
  accent = 'cyan',
  height = 6,
}: {
  value: number
  accent?: keyof typeof ACCENT | 'gradient'
  height?: number
}) {
  const bg =
    accent === 'gradient'
      ? 'linear-gradient(90deg,#22d3ee,#3b82f6,#a855f7)'
      : `linear-gradient(90deg, ${ACCENT[accent].hex}aa, ${ACCENT[accent].hex})`
  return (
    <div
      className="w-full rounded-full bg-white/[0.06] overflow-hidden"
      style={{ height }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: bg }}
      />
    </div>
  )
}

/** 状態バッジ */
export function StateBadge({ text, tone = 'good' }: { text: string; tone?: 'good' | 'warn' | 'bad' }) {
  const cls =
    tone === 'good'
      ? 'text-emerald-300 border-emerald-400/30 bg-emerald-400/10'
      : tone === 'warn'
        ? 'text-amber-300 border-amber-400/30 bg-amber-400/10'
        : 'text-red-300 border-red-400/30 bg-red-400/10'
  return <span className={`text-[10px] px-2 py-[2px] rounded border ${cls}`}>{text}</span>
}

/** 小見出し（数値ラベル） */
export function Metric({
  label,
  value,
  diff,
  diffTone = 'up',
}: {
  label: string
  value: string
  diff?: string
  diffTone?: 'up' | 'down'
}) {
  return (
    <div>
      <p className="text-[10px] text-slate-400">{label}</p>
      <p className="font-num text-lg font-bold text-slate-100 leading-tight">{value}</p>
      {diff && (
        <p className={`text-[10px] ${diffTone === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>{diff}</p>
      )}
    </div>
  )
}


/** パネルの担当AI社員を示すバッジ（既存機能との紐づけ表示） */
export function OwnerBadge({
  name,
  role,
  accent = 'cyan',
  avatar,
}: {
  name: string
  role?: string
  accent?: keyof typeof ACCENT
  avatar?: string
}) {
  const a = ACCENT[accent]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg"
      style={{ boxShadow: `0 0 0 1px ${a.hex}44`, background: `${a.hex}12` }}
      title={role ? `${name}（${role}）が担当します` : name}
    >
      {avatar ? (
        <img
          src={avatar}
          alt=""
          width={18}
          height={18}
          className="rounded object-cover"
          onError={(e) => {
            const el = e.currentTarget
            if (!el.dataset.fallback) {
              el.dataset.fallback = '1'
              el.src = avatar.replace(/\.(png|jpg|jpeg|webp)$/i, '.svg')
            } else {
              el.style.display = 'none'
            }
          }}
        />
      ) : null}
      <span className={`text-[10px] ${a.text}`}>{name}</span>
      <span className="text-[9px] text-slate-500">担当</span>
    </span>
  )
}
