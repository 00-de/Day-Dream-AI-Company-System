import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChatMessage, AiStaff } from '../types'
import { CHAT_GREETING } from '../data/defaults'
import { useData } from '../lib/data'
import { askAi, checkAiStatus, chatPersonas, type AiMessage } from '../lib/ai'
import { Avatar } from './Avatar'
import { IconSend } from './Icons'

/* ============================================================
   AI秘書チャット
   /api/chat 経由で Groq / Gemini / OpenAI に接続します。
   APIキーが未設定でも、簡易応答でそのまま使えます。
   ============================================================ */

function nowTime() {
  return new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

export function SecretaryChat({ compact = false }: { compact?: boolean }) {
  const { data } = useData()
  const personas = useMemo(() => chatPersonas(data.staff), [data.staff])
  const [personaId, setPersonaId] = useState<string>(personas[0]?.id ?? 'secretary')
  const persona: AiStaff | undefined = personas.find((p) => p.id === personaId) ?? personas[0]

  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'greet', from: 'ai', text: CHAT_GREETING, time: nowTime() },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [provider, setProvider] = useState<string>('')
  const [available, setAvailable] = useState<string[] | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 起動時に、どのAIが使える状態かを確認
  useEffect(() => {
    void checkAiStatus().then(setAvailable)
  }, [])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  const send = async () => {
    const text = input.trim()
    if (!text || thinking) return

    const mine: ChatMessage = { id: `u${Date.now()}`, from: 'me', text, time: nowTime() }
    const nextMessages = [...messages, mine]
    setMessages(nextMessages)
    setInput('')
    setThinking(true)

    // これまでのやり取りをAIに渡す（最初のあいさつは除く）
    const history: AiMessage[] = nextMessages
      .filter((m) => m.id !== 'greet')
      .map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text }))

    const result = await askAi(
      history,
      data,
      persona ? { name: persona.name, role: persona.role } : undefined,
    )

    setProvider(result.provider)
    setMessages((m) => [...m, { id: `a${Date.now()}`, from: 'ai', text: result.reply, time: nowTime() }])
    setThinking(false)
  }

  const clear = () => {
    setMessages([{ id: 'greet', from: 'ai', text: CHAT_GREETING, time: nowTime() }])
    setProvider('')
  }

  // よく使う質問（ボタンで入力できます）
  const quickJa = ['今日の予定は？', '売上を教えて', 'AI社員の稼働状況', '新曲のアイデアが欲しい']

  const statusText =
    available === null
      ? '接続を確認しています…'
      : available.length > 0
        ? `${available.join(' / ')} に接続`
        : '簡易応答モード（APIキー未設定）'

  return (
    <div className="flex flex-col gap-2.5" style={{ minHeight: compact ? 190 : 260 }}>
      {/* 相手を選ぶ */}
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="persona">
          話す相手
        </label>
        <select
          id="persona"
          value={personaId}
          onChange={(e) => setPersonaId(e.target.value)}
          className="bg-night-950/70 rounded-lg px-2 py-1 text-[11px] text-slate-200 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none max-w-[150px]"
        >
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span
          className={`text-[9px] px-1.5 py-[2px] rounded ring-1 ${
            available && available.length > 0
              ? 'text-emerald-300 ring-emerald-400/30 bg-emerald-400/10'
              : 'text-amber-300 ring-amber-400/25 bg-amber-400/10'
          }`}
        >
          {provider || statusText}
        </span>
        <button
          type="button"
          onClick={clear}
          className="ml-auto text-[10px] text-slate-500 hover:text-slate-200 transition"
        >
          会話をリセット
        </button>
      </div>

      {/* 会話 */}
      <div
        ref={listRef}
        className="scroll-box flex-1 overflow-y-auto space-y-2 pr-1"
        style={{ maxHeight: compact ? 190 : 320 }}
      >
        {messages.map((m) => (
          <div key={m.id} className={`flex gap-2 ${m.from === 'me' ? 'justify-end' : ''}`}>
            {m.from === 'ai' &&
              (persona ? (
                <Avatar name={persona.name} src={persona.avatar} accent={persona.accent} size={28} rounded="rounded-lg" />
              ) : (
                <div className="w-7 h-7 shrink-0 rounded-lg grid place-content-center bg-cyan-400/15 ring-1 ring-cyan-400/30 text-[13px]">
                  🤖
                </div>
              ))}
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
            <div className="w-7 h-7 rounded-lg grid place-content-center bg-cyan-400/15 ring-1 ring-cyan-400/30">
              <span className="animate-pulseDot">●</span>
            </div>
            {persona?.name ?? 'AI秘書'}が考えています…
          </div>
        )}
      </div>

      {/* よく使う質問 */}
      <div className="flex flex-wrap gap-1.5">
        {quickJa.map((q) => (
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

      {/* 入力 */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void send()}
          disabled={thinking}
          placeholder={`${persona?.name ?? 'AI秘書'}にメッセージを入力…`}
          aria-label="AIへのメッセージ"
          className="flex-1 bg-night-950/70 rounded-lg px-3 py-2 text-[12px] text-slate-200 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none transition disabled:opacity-50"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={thinking || !input.trim()}
          aria-label="送信"
          className="w-10 rounded-lg grid place-content-center bg-cyan-500/25 ring-1 ring-cyan-400/40 text-cyan-200 hover:bg-cyan-500/40 disabled:opacity-40 transition"
        >
          <IconSend className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
