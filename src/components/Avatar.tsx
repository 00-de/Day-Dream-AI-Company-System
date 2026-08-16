import { useState } from 'react'
import { ACCENT } from './Ui'

/* ============================================================
   アバター
   画像があれば表示、無ければイニシャルのネオンアバターを生成
   ============================================================ */

export function Avatar({
  name,
  src,
  accent = 'cyan',
  size = 48,
  rounded = 'rounded-xl',
}: {
  name: string
  src?: string
  accent?: keyof typeof ACCENT
  size?: number
  rounded?: string
}) {
  // 0=指定された画像（png） 1=同じ名前のsvg 2=イニシャル表示
  const [step, setStep] = useState(0)
  const hex = ACCENT[accent].hex
  const initial = name.replace(/AI/g, '').trim().charAt(0) || 'A'

  // 用意したSVGアバターへの切り替え先
  const svgSrc = src ? src.replace(/\.(png|jpg|jpeg|webp)$/i, '.svg') : ''
  const current = step === 0 ? src : step === 1 && svgSrc !== src ? svgSrc : ''

  if (current) {
    return (
      <img
        key={current}
        src={current}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setStep((n) => n + 1)}
        className={`${rounded} object-cover shrink-0`}
        style={{ width: size, height: size, boxShadow: `0 0 0 1px ${hex}44, 0 0 12px -2px ${hex}55` }}
      />
    )
  }

  return (
    <div
      className={`${rounded} shrink-0 grid place-content-center font-display font-bold select-none`}
      style={{
        width: size,
        height: size,
        fontSize: size / 2.6,
        color: hex,
        background: `radial-gradient(120% 120% at 30% 10%, ${hex}33, rgba(8,12,26,0.9) 70%)`,
        boxShadow: `0 0 0 1px ${hex}44, inset 0 0 18px -8px ${hex}`,
      }}
      aria-hidden="true"
    >
      {initial}
    </div>
  )
}
