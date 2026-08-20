import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

/* ============================================================
   画面の明るさ（テーマ）
   dark   = 夜のネオン（これまでの見た目）
   bright = 明るいカラフル
   選んだテーマは、この端末に記憶されます
   ============================================================ */

export type Theme = 'dark' | 'bright'

export const THEME_LABEL: Record<Theme, string> = {
  dark: '夜モード',
  bright: '明るいモード',
}

const KEY = 'ddai:theme'

interface ThemeValue {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

const Ctx = createContext<ThemeValue | null>(null)

function readSaved(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'bright' ? 'bright' : 'dark'
  } catch {
    return 'dark'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readSaved)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // 保存できなくても表示は変わります
    }
  }, [theme])

  return (
    <Ctx.Provider
      value={{
        theme,
        setTheme: setThemeState,
        toggle: () => setThemeState((t) => (t === 'dark' ? 'bright' : 'dark')),
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useTheme() {
  const v = useContext(Ctx)
  if (!v) throw new Error('ThemeProvider の中で useTheme を使ってください')
  return v
}
