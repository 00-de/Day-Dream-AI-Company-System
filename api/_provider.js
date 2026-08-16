/* ============================================================
   AIプロバイダの共通処理
   ファイル名が _ で始まるので、URLとしては公開されません。
   /api/chat.js と /api/meeting.js の両方から使います。

   優先順： Groq → Gemini → OpenAI
   ============================================================ */

export const PROVIDERS = [
  {
    name: 'groq',
    label: 'Groq',
    envKey: 'GROQ_API_KEY',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  },
  {
    name: 'gemini',
    label: 'Gemini',
    envKey: 'GEMINI_API_KEY',
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  },
  {
    name: 'openai',
    label: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
]

/** 使える状態のプロバイダ名を返す */
export function availableProviders() {
  return PROVIDERS.filter((p) => Boolean(process.env[p.envKey])).map((p) => p.label)
}

async function callGroq(key, model, system, messages, maxTokens, json) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.75,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  })
  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Groqの応答が空でした')
  return text
}

async function callGemini(key, model, system, messages, maxTokens, json) {
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: maxTokens,
          ...(json ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('').trim()
  if (!text) throw new Error('Geminiの応答が空でした')
  return text
}

async function callOpenAI(key, model, system, messages, maxTokens, json) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.75,
      max_tokens: maxTokens,
      ...(json ? { response_format: { type: 'json_object' } } : {}),
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('OpenAIの応答が空でした')
  return text
}

/**
 * AIに問い合わせる（使えるものを上から順に試します）
 * 戻り値： { text, provider, model }
 * 失敗時： { error: 'NO_KEY' | 'ALL_FAILED', detail }
 */
export async function askProviders(system, messages, { maxTokens = 900, json = false } = {}) {
  const errors = []

  for (const p of PROVIDERS) {
    const key = process.env[p.envKey]
    if (!key) continue
    try {
      let text
      if (p.name === 'groq') text = await callGroq(key, p.model, system, messages, maxTokens, json)
      else if (p.name === 'gemini') text = await callGemini(key, p.model, system, messages, maxTokens, json)
      else text = await callOpenAI(key, p.model, system, messages, maxTokens, json)
      return { text, provider: p.label, model: p.model }
    } catch (e) {
      errors.push(`${p.label}: ${e.message}`)
    }
  }

  if (errors.length === 0) {
    return {
      error: 'NO_KEY',
      detail:
        'Vercelの Settings → Environment Variables に GROQ_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY のいずれかを登録し、再デプロイしてください。',
    }
  }
  return { error: 'ALL_FAILED', detail: errors.join(' / ') }
}

/** ```json ... ``` が付いていても中身を取り出す */
export function parseJson(text) {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    // 最初の { から最後の } までを取り出して再挑戦
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

/** 会社の現在の状況を、AIが読める短い文章にまとめる */
export function buildContext(ctx) {
  if (!ctx) return ''
  const lines = []

  if (ctx.company) lines.push(`会社名：${ctx.company.name} ／ 社長：${ctx.company.presidentName}`)
  if (ctx.finance) {
    const f = ctx.finance
    lines.push(
      `今月の売上：${f.monthSales?.toLocaleString('ja-JP')}円（前月比 ${f.monthSalesDiff}）` +
        ` ／ 利益：${f.monthProfit?.toLocaleString('ja-JP')}円（前月比 ${f.monthProfitDiff}）` +
        ` ／ 目標 ${f.goal?.toLocaleString('ja-JP')}円に対して達成率 ${f.goalRate}%、残り${f.daysLeft}日`,
    )
  }
  if (Array.isArray(ctx.schedule) && ctx.schedule.length)
    lines.push('今日の予定：' + ctx.schedule.map((s) => `${s.time} ${s.title}`).join(' / '))
  if (Array.isArray(ctx.projects) && ctx.projects.length)
    lines.push('プロジェクト進捗：' + ctx.projects.map((p) => `${p.name} ${p.progress}%`).join(' / '))
  if (ctx.staffSummary) {
    const s = ctx.staffSummary
    lines.push(
      `AI社員：全${s.total}人（稼働中${s.active}人 / 待機中${s.standby}人 / メンテ中${s.maintenance}人、稼働率${s.rate}%）`,
    )
  }
  if (Array.isArray(ctx.staffList) && ctx.staffList.length)
    lines.push('AI社員の担当：' + ctx.staffList.map((s) => `${s.name}(${s.role})`).join('、'))
  if (ctx.nextLive) {
    const l = ctx.nextLive
    const rest = (l.checks || []).filter((c) => !c.done).map((c) => c.label)
    lines.push(
      `次回ライブ：${l.date} ${l.title}（${l.venue}）準備進捗${l.progress}%` +
        (rest.length ? ` ／ 残タスク：${rest.join('・')}` : ' ／ 準備完了'),
    )
  }
  if (ctx.youtube) {
    const y = ctx.youtube
    lines.push(
      `YouTube：登録者${y.subscribers}人（${y.subscribersDiff}）／ 総再生${y.views}回 ／ 総視聴時間${y.watchHours}時間`,
    )
  }
  if (Array.isArray(ctx.songs) && ctx.songs.length)
    lines.push('最近の楽曲：' + ctx.songs.map((s) => s.title).join('、'))
  if (Array.isArray(ctx.notices) && ctx.notices.length)
    lines.push('お知らせ：' + ctx.notices.map((n) => n.title).join(' / '))

  return lines.join('\n')
}
