import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

/* ============================================================
   文字の大きさ（画面全体の拡大率）
   100% / 140% / 180% / 280% の4段階
   選んだ大きさは、この端末に記憶されます
   ============================================================ */

export const SCALES = [100, 140, 180, 280] as const
export type Scale = (typeof SCALES)[number]

export const SCALE_LABEL: Record<Scale, string> = {
  100: '標準',
  140: '大',
  180: '特大',
  280: '最大',
}

const STORAGE_KEY = 'ddai:uiScale'

interface ScaleValue {
  scale: Scale
  setScale: (s: Scale) => void
  /** 1段階大きく */
  larger: () => void
  /** 1段階小さく */
  smaller: () => void
}

const Ctx = createContext<ScaleValue | null>(null)

function readSaved(): Scale {
  try {
    const raw = Number(localStorage.getItem(STORAGE_KEY))
    return (SCALES as readonly number[]).includes(raw) ? (raw as Scale) : 100
  } catch {
    return 100
  }
}

export function ScaleProvider({ children }: { children: ReactNode }) {
  const [scale, setScaleState] = useState<Scale>(readSaved)

  // 拡大率を画面全体に反映する
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--ui-scale', String(scale / 100))
    root.dataset.scale = String(scale)
    try {
      localStorage.setItem(STORAGE_KEY, String(scale))
    } catch {
      // 保存できなくても表示は変わります
    }
  }, [scale])

  const setScale = (s: Scale) => setScaleState(s)

  const step = (dir: 1 | -1) =>
    setScaleState((cur) => {
      const i = SCALES.indexOf(cur)
      const next = Math.min(SCALES.length - 1, Math.max(0, i + dir))
      return SCALES[next]
    })

  // キーボードでも変えられるようにする（Ctrl + Shift + ↑ / ↓）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || !e.shiftKey) return
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        step(1)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        step(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Ctx.Provider value={{ scale, setScale, larger: () => step(1), smaller: () => step(-1) }}>
      {children}
    </Ctx.Provider>
  )
}

export function useScale() {
  const v = useContext(Ctx)
  if (!v) throw new Error('ScaleProvider の中で useScale を使ってください')
  return v
}
