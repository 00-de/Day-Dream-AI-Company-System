import type { AppData } from '../types'
import { buildContext } from './ai'

/* ============================================================
   AI社員の実務（葵AI・澪AI）
   ============================================================ */

/* ── 葵AI：SNS投稿文 ────────────────────── */

export type Channel = 'x' | 'instagram' | 'youtube'
export type Tone = 'friendly' | 'excited' | 'polite' | 'casual'

export const CHANNEL_INFO: Record<Channel, { label: string; icon: string; limit: number }> = {
  x: { label: 'X（旧Twitter）', icon: '𝕏', limit: 140 },
  instagram: { label: 'Instagram', icon: '📷', limit: 400 },
  youtube: { label: 'YouTube 概要欄', icon: '▶', limit: 800 },
}

export const TONE_LABEL: Record<Tone, string> = {
  friendly: '親しみやすく',
  excited: 'テンション高め',
  polite: '丁寧・お知らせ',
  casual: '砕けた感じ',
}

export interface SnsPost {
  approach: string
  text: string
  chars: number
  aim: string
  bestTime: string
}

export interface SnsResult {
  channel: Channel
  label: string
  posts: SnsPost[]
  hashtagPool: string[]
  tips: string[]
  provider: string
  error?: string
}

export async function makeSnsPosts(
  channel: Channel,
  topic: string,
  tone: Tone,
  count: number,
  data: AppData,
): Promise<SnsResult> {
  const empty: SnsResult = { channel, label: '', posts: [], hashtagPool: [], tips: [], provider: '' }
  try {
    const res = await fetch('/api/sns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, topic, tone, count, context: buildContext(data) }),
    })
    if (res.ok) return (await res.json()) as SnsResult
    const err = (await res.json().catch(() => null)) as { error?: string } | null
    return { ...empty, error: err?.error ?? '投稿文を作れませんでした' }
  } catch {
    return { ...empty, error: '通信に失敗しました' }
  }
}

/* ── 澪AI：公開前チェック ───────────────── */

export type CheckKind = 'post' | 'lyrics' | 'news' | 'mail'

export const CHECK_KIND_LABEL: Record<CheckKind, string> = {
  post: 'SNS投稿文',
  lyrics: '歌詞',
  news: 'お知らせ・告知',
  mail: 'メール・依頼文',
}

export interface CheckIssue {
  level: 'high' | 'medium' | 'low'
  category: string
  quote: string
  reason: string
  fix: string
}

export interface CheckResult {
  verdict: 'ok' | 'caution' | 'stop'
  summary: string
  issues: CheckIssue[]
  corrected: string
  good: string[]
  counts: { high: number; medium: number; low: number }
  provider: string
  error?: string
}

export async function checkText(text: string, kind: CheckKind, data: AppData): Promise<CheckResult> {
  const empty: CheckResult = {
    verdict: 'caution',
    summary: '',
    issues: [],
    corrected: '',
    good: [],
    counts: { high: 0, medium: 0, low: 0 },
    provider: '',
  }
  try {
    const res = await fetch('/api/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, kind, context: buildContext(data) }),
    })
    if (res.ok) return (await res.json()) as CheckResult
    const err = (await res.json().catch(() => null)) as { error?: string } | null
    return { ...empty, error: err?.error ?? 'チェックできませんでした' }
  } catch {
    return { ...empty, error: '通信に失敗しました' }
  }
}
