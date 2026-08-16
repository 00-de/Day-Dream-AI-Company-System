import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types'
import { CHAT_GREETING, SCHEDULE, FINANCE, yen } from '../data/mock'
import { countStaffStatus } from '../data/staff'
import { IconSend } from './Icons'

/* ============================================================
   AI秘書チャット
   まずはオフラインで動く応答エンジン。
   将来 Groq / OpenAI に切り替える場合は askSecretary() を
   fetch('/api/chat') に差し替えるだけで動きます。
   ============================================================ */

function nowTime() {
  return new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

/** キーワード応答エンジン */
function askSecretary(text: string): string {
  const t = text.toLowerCase()
  const staff = countStaffStatus()

  if (/予定|スケジュール|今日/.test(text)) {
    return '今日の予定です。\n' + SCHEDULE.map((s) => `・${s.time} ${s.title}`).join('\n')
  }
  if (/売上|利益|経営|数字/.test(text)) {
    return `今月の売上は ${yen(FINANCE.monthSales)}（前月比 ${FINANCE.monthSalesDiff}）、利益は ${yen(
      FINANCE.monthProfit,
    )} です。目標達成率は ${FINANCE.goalRate}%、残り ${FINANCE.daysLeft} 日です。`
  }
  if (/ai社員|社員|稼働|メンバー/.test(text)) {
    return `AI社員は全${staff.total}人。稼働中 ${staff.active}人 / 待機中 ${staff.standby}人 / メンテ中 ${staff.maintenance}人、稼働率は ${staff.rate}% です。`
  }
  if (/曲|楽曲|作詞|作曲|music/.test(t)) {
    return '楽曲制作ですね。制作画面の「音楽制作」から、作詞・作曲・編曲・BGM生成が進められます。蓮AIと結衣AIに作業を割り当てましょうか？'
  }
  if (/mv|動画|映像|capcut/.test(t)) {
    return 'MV制作はCapCut連携で進行できます。現在のMV制作プロジェクトは60%まで完了しています。'
  }
  if (/ライブ|会場|チケット/.test(text)) {
    return '次回ライブは 2026年8月15日、垂井町文化会館 大ホールです。準備進捗は75%、残タスクはチケット販売です。'
  }
  if (/youtube|再生|登録者/.test(t)) {
    return 'YouTubeは登録者18,250人（今月 +1,245人）、総再生回数2,456,789回です。「みんな笑顔になれ MV」が伸びています。'
  }
  if (/ありがとう|thanks/.test(t)) {
    return 'どういたしまして。いつでも呼んでください、トシさん。'
  }
  if (/こんにちは|おはよう|やあ|hello/.test(t)) {
    return `こんにちは、トシさん！本日AI社員${staff.active}人が稼働中です。今日はどこから始めましょうか？`
  }
  return `承知しました。「${text}」の件、担当のAI社員に共有してタスク登録しました。詳細が必要なら「売上」「予定」「AI社員」「ライブ」などと聞いてください。`
}

export function SecretaryChat({ compact = false }: { compact?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'greet', from: 'ai', text: CHAT_GREETING, time: nowTime() },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  const send = () => {
    const text = input.trim()
    if (!text || thinking) return
    setMessages((m) => [...m, { id: `u${Date.now()}`, from: 'me', text, time: nowTime() }])
    setInput('')
    setThinking(true)
    window.setTimeout(() => {
      setMessages((m) => [...m, { id: `a${Date.now()}`, from: 'ai', text: askSecretary(text), time: nowTime() }])
      setThinking(false)
    }, 550)
  }

  const quick = ['今日の予定は？', '売上を教えて', 'AI社員の稼働状況', '新しいタスクを追加']

  return (
    <div className="flex flex-col gap-2.5" style={{ minHeight: compact ? 190 : 260 }}>
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-2 pr-1"
        style={{ maxHeight: compact ? 190 : 260 }}
      >
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-2 ${m.from === 'me' ? 'justify-end' : ''}`}>
            {m.from === 'ai' && (
              <div className="w-7 h-7 shrink-0 rounded-lg grid place-content-center bg-cyan-400/15 ring-1 ring-cyan-400/30 text-[13px]">
                🤖
              </div>
            )}
            <div
              className={`max-w-[82%] rounded-xl px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap ${
                m.from === 'ai'
                  ? 'bg-white/[0.05] text-slate-200 ring-1 ring-white/10'
                  : 'bg-cyan-500/20 text-cyan-50 ring-1 ring-cyan-400/30'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex gap-2 items-center text-[11px] text-slate-400">
            <div className="w-7 h-7 rounded-lg grid place-content-center bg-cyan-400/15 ring-1 ring-cyan-400/30">🤖</div>
            AI秘書が入力しています…
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {quick.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => setInput(q)}
            className="text-[10px] px-2 py-1 rounded-md bg-white/[0.04] ring-1 ring-white/10 text-slate-300 hover:ring-cyan-400/40 hover:text-cyan-200 transition"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="メッセージを入力してください..."
          aria-label="AI秘書へのメッセージ"
          className="flex-1 bg-night-950/70 rounded-lg px-3 py-2 text-[12px] text-slate-200 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none transition"
        />
        <button
          type="button"
          onClick={send}
          aria-label="送信"
          className="w-10 rounded-lg grid place-content-center bg-cyan-500/25 ring-1 ring-cyan-400/40 text-cyan-200 hover:bg-cyan-500/40 transition"
        >
          <IconSend className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
