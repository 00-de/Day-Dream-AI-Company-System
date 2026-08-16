/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ディープナイトシティ配色（モックアップ準拠）
        night: {
          950: '#05070f',
          900: '#080c1a',
          850: '#0a1024',
          800: '#0d1530',
          700: '#131d42',
        },
        neon: {
          cyan: '#22d3ee',
          blue: '#3b82f6',
          purple: '#a855f7',
          pink: '#ec4899',
          green: '#22c55e',
          amber: '#f59e0b',
          red: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', '"Hiragino Kaku Gothic ProN"', 'Meiryo', 'system-ui', 'sans-serif'],
        display: ['Orbitron', '"Noto Sans JP"', 'sans-serif'],
        num: ['"Roboto Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        panel: '0 0 0 1px rgba(56,189,248,0.12), 0 10px 30px -12px rgba(0,0,0,0.9)',
        glow: '0 0 18px rgba(34,211,238,0.35)',
        'glow-purple': '0 0 18px rgba(168,85,247,0.35)',
      },
      keyframes: {
        floatUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseDot: {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(0.82)' },
        },
        sweep: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
        drift: {
          '0%': { transform: 'translate3d(0,0,0)' },
          '100%': { transform: 'translate3d(0,-40px,0)' },
        },
      },
      animation: {
        floatUp: 'floatUp .45s ease-out both',
        pulseDot: 'pulseDot 1.8s ease-in-out infinite',
        sweep: 'sweep 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
