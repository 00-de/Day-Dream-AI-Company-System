/* ============================================================
   アイコン（外部ライブラリ不要のインラインSVG）
   ============================================================ */
type P = { className?: string }
const base = 'w-4 h-4'

const S = ({ children, className }: P & { children: React.ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className ?? base}
    aria-hidden="true"
  >
    {children}
  </svg>
)

export const IconChart = (p: P) => (
  <S {...p}>
    <path d="M3 3v18h18" />
    <path d="M7 15l4-5 3 3 5-7" />
  </S>
)
export const IconSparkle = (p: P) => (
  <S {...p}>
    <path d="M12 3l1.8 4.9L19 9.7l-4.4 2.4L12 17l-2.6-4.9L5 9.7l5.2-1.8z" />
  </S>
)
export const IconCode = (p: P) => (
  <S {...p}>
    <path d="M8 6l-5 6 5 6" />
    <path d="M16 6l5 6-5 6" />
  </S>
)
export const IconPlay = (p: P) => (
  <S {...p}>
    <path d="M7 4l12 8-12 8z" fill="currentColor" stroke="none" />
  </S>
)
export const IconPause = (p: P) => (
  <S {...p}>
    <rect x="7" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
    <rect x="13.5" y="5" width="3.5" height="14" rx="1" fill="currentColor" stroke="none" />
  </S>
)
export const IconPrev = (p: P) => (
  <S {...p}>
    <path d="M18 5v14L8 12z" fill="currentColor" stroke="none" />
    <rect x="5" y="5" width="2" height="14" rx="1" fill="currentColor" stroke="none" />
  </S>
)
export const IconNext = (p: P) => (
  <S {...p}>
    <path d="M6 5v14l10-7z" fill="currentColor" stroke="none" />
    <rect x="17" y="5" width="2" height="14" rx="1" fill="currentColor" stroke="none" />
  </S>
)
export const IconYoutube = (p: P) => (
  <S {...p}>
    <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
    <path d="M10.5 9.5l5 2.5-5 2.5z" fill="currentColor" stroke="none" />
  </S>
)
export const IconSettings = (p: P) => (
  <S {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
  </S>
)
export const IconBell = (p: P) => (
  <S {...p}>
    <path d="M18 8a6 6 0 10-12 0c0 6-2 7-2 7h16s-2-1-2-7" />
    <path d="M10.3 20a2 2 0 003.4 0" />
  </S>
)
export const IconImage = (p: P) => (
  <S {...p}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="8.5" cy="9.5" r="1.6" />
    <path d="M4 17l5-5 4.5 4.5L16 14l4 4" />
  </S>
)
export const IconMusic = (p: P) => (
  <S {...p}>
    <path d="M9 18V6l10-2v12" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="16.5" cy="16" r="2.5" />
  </S>
)
export const IconFilm = (p: P) => (
  <S {...p}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="M7 5v14M17 5v14M2.5 12h19" />
  </S>
)
export const IconMic = (p: P) => (
  <S {...p}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3" />
  </S>
)
export const IconFolder = (p: P) => (
  <S {...p}>
    <path d="M3 7a2 2 0 012-2h4l2 2.5h8a2 2 0 012 2V17a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  </S>
)
export const IconCalendar = (p: P) => (
  <S {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </S>
)
export const IconSend = (p: P) => (
  <S {...p}>
    <path d="M4 12l16-8-6 16-2.5-6z" />
  </S>
)
export const IconCloud = (p: P) => (
  <S {...p}>
    <path d="M7 18a4 4 0 010-8 5.5 5.5 0 0110.5 1.5A3.5 3.5 0 0117 18z" />
    <path d="M12 15v-4M10 13l2-2 2 2" />
  </S>
)
export const IconCheck = (p: P) => (
  <S {...p}>
    <path d="M4 12.5l5 5L20 6.5" />
  </S>
)
export const IconUsers = (p: P) => (
  <S {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0113 0" />
    <path d="M16 5.2a3.5 3.5 0 010 6.6M17.5 20a6.4 6.4 0 00-2-4.6" />
  </S>
)
export const IconArrow = (p: P) => (
  <S {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </S>
)
