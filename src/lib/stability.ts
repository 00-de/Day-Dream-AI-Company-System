import type { AppData } from '../types'
import { buildContext } from './ai'

/* ============================================================
   Stability AI 画像生成（ブラウザ側）
   APIキーはここには一切ありません。/api/image が持っています。
   ============================================================ */

export type ModelKey = 'core' | 'sd35' | 'ultra'

export const MODEL_INFO: Record<ModelKey, { label: string; usd: number; note: string }> = {
  core: { label: 'Core', usd: 0.03, note: '5秒で切り替わるMVならこれで充分。いちばん安い' },
  sd35: { label: 'SD3.5 Large', usd: 0.065, note: '細部がきれい。サムネイル向き' },
  ultra: { label: 'Ultra', usd: 0.08, note: '最高画質。ジャケット写真など見せ場に' },
}

/** 1ドルを円に換算する（表示用のおおよその値） */
export const USD_JPY = 155

export interface Shot {
  no: number
  section: string
  scene: string
  prompt: string
  start: string
  end: string
}

export interface Storyboard {
  title: string
  concept: string
  negative: string
  aspect: string
  secondsPerShot: number
  shots: Shot[]
  provider: string
}

/** 設定状況を確認する */
export async function checkStability(): Promise<{ configured: boolean; credits: number | null }> {
  try {
    const res = await fetch('/api?fn=image', { method: 'GET' })
    if (!res.ok) return { configured: false, credits: null }
    const j = (await res.json()) as { configured?: boolean; credits?: number | null }
    return { configured: Boolean(j.configured), credits: j.credits ?? null }
  } catch {
    return { configured: false, credits: null }
  }
}

/** 絵コンテを作る */
export async function buildStoryboard(
  input: { title: string; lyrics: string; mood: string; shotCount: number; secondsPerShot: number; style: string },
  data: AppData,
): Promise<{ board?: Storyboard; error?: string }> {
  try {
    const res = await fetch('/api?fn=shots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, context: buildContext(data) }),
    })
    if (res.ok) return { board: (await res.json()) as Storyboard }
    const err = (await res.json().catch(() => null)) as { error?: string } | null
    return { error: err?.error ?? '絵コンテを作れませんでした' }
  } catch {
    return { error: '通信に失敗しました' }
  }
}

export interface GeneratedImage {
  no: number
  /** base64（png） */
  image: string
  seed: number
}

/** 1枚生成する */
export async function generateImage(
  prompt: string,
  negative: string,
  aspect: string,
  model: ModelKey,
): Promise<{ image?: string; seed?: number; error?: string }> {
  try {
    const res = await fetch('/api?fn=image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, negative, aspect, model }),
    })
    if (res.ok) {
      const j = (await res.json()) as { image: string; seed: number }
      return { image: j.image, seed: j.seed }
    }
    const err = (await res.json().catch(() => null)) as { error?: string } | null
    return { error: err?.error ?? '生成に失敗しました' }
  } catch {
    return { error: '通信に失敗しました' }
  }
}

/** base64 を File に変換する（アップロード用） */
export function base64ToFile(base64: string, filename: string): File {
  const bin = atob(base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new File([bytes], filename, { type: 'image/png' })
}

/** 費用の見積もり */
export function estimateCost(count: number, model: ModelKey) {
  const usd = count * MODEL_INFO[model].usd
  return { usd, jpy: Math.round(usd * USD_JPY) }
}
