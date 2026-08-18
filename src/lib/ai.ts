import type { AppData, AiStaff } from '../types'
import { countStaffStatus } from '../data/defaults'

/* ============================================================
   AIチャットの呼び出し（ブラウザ側）
   APIキーはここには一切ありません。/api/chat（サーバー）が持っています。
   ============================================================ */

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AiPersona {
  name: string
  role: string
}

export interface AiResult {
  reply: string
  /** 答えたAI（Groq / Gemini / OpenAI / オフライン） */
  provider: string
  /** APIが使えずローカル応答になった場合 true */
  offline: boolean
}

/** AIに送る「会社の現在の状況」をまとめる */
export function buildContext(data: AppData) {
  return {
    company: data.company,
    finance: data.finance,
    schedule: data.schedule,
    projects: data.projects,
    notices: data.notices.map((n) => ({ title: n.title })),
    songs: data.songs.map((s) => ({ title: s.title })),
    youtube: data.youtube,
    nextLive: data.nextLive,
    staffSummary: countStaffStatus(data.staff),
    staffList: data.staff.map((s) => ({ name: s.name, role: s.role })),
    // 名前と役職の対応をAIが取り違えないように、そのまま渡します
  }
}

/** APIが使えるかどうかを確認する */
export interface AiSettings {
  order: string
  rotate: boolean
  heavy: string
  next: string[]
}

/** AIの使い分け設定を取得します */
export async function getAiSettings(): Promise<AiSettings | null> {
  try {
    const res = await fetch('/api/chat', { method: 'GET' })
    if (!res.ok) return null
    const json = (await res.json()) as { settings?: AiSettings }
    return json.settings ?? null
  } catch {
    return null
  }
}

export async function checkAiStatus(): Promise<string[]> {
  try {
    const res = await fetch('/api/chat', { method: 'GET' })
    if (!res.ok) return []
    const json = (await res.json()) as { available?: string[]; details?: { label: string; model: string }[] }
    // モデル名も分かる場合は「Gemini（gemini-3.6-flash）」の形で返します
    if (json.details && json.details.length > 0) {
      return json.details.map((d) => `${d.label}（${d.model}）`)
    }
    return json.available ?? []
  } catch {
    return []
  }
}

/** AIに質問する（失敗したらローカル応答に切り替わります） */
export async function askAi(
  messages: AiMessage[],
  data: AppData,
  persona?: AiPersona,
): Promise<AiResult> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, context: buildContext(data), persona }),
    })

    if (res.ok) {
      const json = (await res.json()) as { reply: string; provider: string }
      return { reply: json.reply, provider: json.provider, offline: false }
    }

    // APIキー未設定・接続失敗 → ローカル応答へ
    const last = messages[messages.length - 1]?.content ?? ''
    return { reply: localAnswer(last, data, persona), provider: 'オフライン応答', offline: true }
  } catch {
    const last = messages[messages.length - 1]?.content ?? ''
    return { reply: localAnswer(last, data, persona), provider: 'オフライン応答', offline: true }
  }
}

/* ============================================================
   オフライン応答（APIキーが無いときや通信できないとき）
   ============================================================ */

export function localAnswer(text: string, data: AppData, persona?: AiPersona): string {
  const t = text.toLowerCase()
  const staff = countStaffStatus(data.staff)
  const yen = (n: number) => '¥' + n.toLocaleString('ja-JP')

  if (/予定|スケジュール|今日/.test(text)) {
    return '今日の予定です。\n' + data.schedule.map((s) => `・${s.time} ${s.title}`).join('\n')
  }
  if (/売上|利益|経営|数字/.test(text)) {
    const f = data.finance
    return `今月の売上は ${yen(f.monthSales)}（前月比 ${f.monthSalesDiff}）、利益は ${yen(
      f.monthProfit,
    )} です。目標達成率は ${f.goalRate}%、残り ${f.daysLeft} 日です。`
  }
  if (/ai社員|社員|稼働|メンバー/.test(text)) {
    return `AI社員は全${staff.total}人。稼働中 ${staff.active}人 / 待機中 ${staff.standby}人 / メンテ中 ${staff.maintenance}人、稼働率は ${staff.rate}% です。`
  }
  if (/ライブ|会場|チケット/.test(text)) {
    const l = data.nextLive
    const rest = l.checks.filter((c) => !c.done).map((c) => c.label)
    return `次回ライブは ${l.date}、${l.venue} で「${l.title}」です。準備進捗は ${l.progress}%${
      rest.length ? `、残りは「${rest.join('・')}」です。` : '、準備は完了しています。'
    }`
  }
  if (/youtube|再生|登録者/.test(t)) {
    const y = data.youtube
    return `YouTubeは登録者 ${y.subscribers}人（今月 ${y.subscribersDiff}）、総再生回数 ${y.views}回、総視聴時間 ${y.watchHours}時間です。`
  }
  if (/プロジェクト|進捗/.test(text)) {
    return 'プロジェクトの進捗です。\n' + data.projects.map((p) => `・${p.name} ${p.progress}%`).join('\n')
  }
  if (/曲|楽曲|作詞|作曲/.test(text)) {
    return '最近の楽曲です。\n' + data.songs.map((s) => `・${s.title}（${s.length}）`).join('\n')
  }
  if (/こんにちは|おはよう|やあ|hello/.test(t)) {
    return `こんにちは、${data.company.presidentName}！本日AI社員${staff.active}人が稼働中です。今日はどこから始めましょうか？`
  }

  const who = persona?.name ?? 'AI秘書'
  return `${who}です。ただいまAIに接続できていないため、簡易応答でお答えしています。\n「売上」「予定」「AI社員」「ライブ」「YouTube」「プロジェクト」などとお聞きください。`
}

/** チャット相手にできるAI社員を選ぶ */
export function chatPersonas(staff: AiStaff[]): AiStaff[] {
  const ids = ['secretary', 'ceo', 'strategy', 'analyst', 'marketer', 'yuma', 'ren', 'yui', 'mikoto', 'takagi']
  return ids.map((id) => staff.find((s) => s.id === id)).filter((s): s is AiStaff => Boolean(s))
}
