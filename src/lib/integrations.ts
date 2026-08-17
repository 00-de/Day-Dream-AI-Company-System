import type { AppData } from '../types'
import { buildContext } from './ai'

/* ============================================================
   外部サービス連携

   【大事な前提】
   Genspark・CapCut・Suno には一般向けの公開APIがありません。
   そのため「アプリの中で生成する」ことはできません。
   （非公式APIは規約違反かつ突然使えなくなるため使いません）

   代わりに、次の流れで連携します。
     1. AIが、そのサービス専用の指示文（プロンプト）を作る
     2. 指示文をクリップボードにコピーして、サービスを開く
     3. できた素材を、アプリのアップロード枠に戻す

   ChatGPT（OpenAI）と Claude（Anthropic）は公式APIがあるため、
   /api/chat と /api/craft から直接使えます。
   ============================================================ */

export type CraftKind = 'music' | 'image' | 'video' | 'lyrics'

export interface Service {
  id: string
  name: string
  /** 何をするサービスか */
  purpose: string
  url: string
  /** APIで直接つながるか */
  api: 'official' | 'none'
  icon: string
  accent: 'cyan' | 'blue' | 'purple' | 'pink' | 'green' | 'amber'
  /** 連携時に使うプロンプトの種類 */
  kind?: CraftKind
  /** 戻してくるファイルの種類 */
  bringBack?: string
}

export const SERVICES: Service[] = [
  {
    id: 'suno',
    name: 'Suno',
    purpose: '楽曲の生成',
    url: 'https://suno.com/create',
    api: 'none',
    icon: '🎵',
    accent: 'purple',
    kind: 'music',
    bringBack: 'mp3ファイルを「音楽制作」にドラッグ＆ドロップ',
  },
  {
    id: 'genspark',
    name: 'Genspark',
    purpose: '画像の生成',
    url: 'https://www.genspark.ai/',
    api: 'none',
    icon: '🖼️',
    accent: 'cyan',
    kind: 'image',
    bringBack: 'png画像を「画像生成」にドラッグ＆ドロップ',
  },
  {
    id: 'capcut',
    name: 'CapCut',
    purpose: 'MVの編集',
    url: 'https://www.capcut.com/',
    api: 'none',
    icon: '🎬',
    accent: 'pink',
    kind: 'video',
    bringBack: '書き出したmp4を「MV制作」にドラッグ＆ドロップ',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    purpose: '文章・相談',
    url: 'https://chat.openai.com/',
    api: 'official',
    icon: '💬',
    accent: 'green',
  },
  {
    id: 'claude',
    name: 'Claude',
    purpose: '文章・開発',
    url: 'https://claude.ai/',
    api: 'official',
    icon: '🤖',
    accent: 'amber',
  },
]

/** クリップボードにコピーする */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // 古いブラウザ向けの方法
    try {
      const el = document.createElement('textarea')
      el.value = text
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(el)
      return ok
    } catch {
      return false
    }
  }
}

/** サービスを新しいタブで開く */
export function openService(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

export interface CraftResult {
  kind: CraftKind
  result: Record<string, unknown>
  provider: string
  error?: string
}

/** AIに、そのサービス専用の指示文を作らせる */
export async function craftPrompt(kind: CraftKind, idea: string, data: AppData): Promise<CraftResult> {
  try {
    const res = await fetch('/api/craft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, idea, context: buildContext(data) }),
    })
    if (res.ok) return (await res.json()) as CraftResult

    const err = (await res.json().catch(() => null)) as { error?: string } | null
    return {
      kind,
      result: {},
      provider: '',
      error: err?.error ?? 'AIに接続できませんでした。設定画面でAI接続を確認してください。',
    }
  } catch {
    return { kind, result: {}, provider: '', error: '通信に失敗しました。' }
  }
}

/** CapCutに持っていく素材リストをテキストにする */
export function buildAssetList(data: AppData, media: { name: string; kind: string; url: string }[]): string {
  const lines = [
    `【CapCut用 素材リスト】${data.company.name}`,
    `作成日：${new Date().toLocaleString('ja-JP')}`,
    '',
    '■ 使い方',
    '1. 下のURLをブラウザで開いてダウンロードします',
    '2. CapCutを開き、素材としてまとめて読み込みます',
    '',
  ]

  const groups: [string, string][] = [
    ['audio', '■ 楽曲'],
    ['image', '■ 画像'],
    ['video', '■ 動画'],
  ]

  for (const [kind, title] of groups) {
    const items = media.filter((m) => m.kind === kind)
    if (items.length === 0) continue
    lines.push(title)
    items.forEach((m, i) => lines.push(`${i + 1}. ${m.name}`, `   ${m.url}`))
    lines.push('')
  }

  return lines.join('\n')
}

/** テキストをファイルとしてダウンロードする */
export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
