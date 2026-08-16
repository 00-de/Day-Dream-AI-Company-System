import { useEffect } from 'react'
import type { ReactNode } from 'react'

/* ============================================================
   右からスライドするドロワー（通知・設定）
   ============================================================ */

export function Drawer({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-label={title}
        aria-hidden={!open}
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[380px] bg-night-900/95 backdrop-blur-xl border-l border-cyan-400/20 transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <header className="flex items-center justify-between px-4 h-14 border-b border-white/10">
          <h2 className="font-display text-[14px] text-slate-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 grid place-content-center rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition"
            aria-label="閉じる"
          >
            ✕
          </button>
        </header>
        <div className="p-4 overflow-y-auto" style={{ height: 'calc(100% - 3.5rem)' }}>
          {children}
        </div>
      </aside>
    </>
  )
}
