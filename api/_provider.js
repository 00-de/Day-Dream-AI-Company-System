/* ============================================================
   AIプロバイダの共通処理
   ファイル名が _ で始まるので、URLとしては公開されません。
   /api/chat.js と /api/meeting.js の両方から使います。

   優先順： Groq → Gemini → OpenAI
   ============================================================ */

/** 交互利用のための呼び出し回数（サーバーが起きている間だけ保持されます） */
let rotateCount = 0

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
    model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  },
  {
    name: 'openai',
    label: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  {
    name: 'anthropic',
    label: 'Claude',
    envKey: 'ANTHROPIC_API_KEY',
    model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
  },
]

/**
 * エラー文から「代わりに使うモデル名」を読み取ります
 * Googleは提供終了時に「Please update your code to use models/xxx」と教えてくれます
 */
export function findSuggestedModel(message) {
  const m = String(message || '')
  // models/gemini-3.6-flash のような書き方を探します
  const byPath = m.match(/models\/([a-zA-Z0-9._-]+)/g)
  if (byPath) {
    for (const hit of byPath) {
      const name = hit.replace('models/', '')
      // エラーの原因になったモデル自身は除きます
      if (!m.includes(`This model models/${name} is no longer`)) return name
    }
  }
  return null
}

/** 使える状態のプロバイダ名を返す */
export function availableProviders() {
  return PROVIDERS.filter((p) => Boolean(process.env[p.envKey])).map((p) => p.label)
}

/**
 * 使う順番を決めます
 *
 * AI_ORDER で優先順を指定できます（例： openai,groq,gemini）
 * AI_ROTATE=1 にすると、呼び出しごとに先頭をずらして交互に使います
 * heavy=true（会議・調査など重い処理）のときは AI_HEAVY で指定したものを先頭にします
 */
function orderedProviders(heavy = false) {
  const usable = PROVIDERS.filter((p) => Boolean(process.env[p.envKey]))
  if (usable.length <= 1) return usable

  // 重い処理は、指定があればそれを最優先にします
  if (heavy && process.env.AI_HEAVY) {
    const want = process.env.AI_HEAVY.trim().toLowerCase()
    const first = usable.find((p) => p.name === want)
    if (first) return [first, ...usable.filter((p) => p !== first)]
  }

  // 優先順の指定があれば、その並びにします
  let list = usable
  if (process.env.AI_ORDER) {
    const names = process.env.AI_ORDER.split(',').map((x) => x.trim().toLowerCase())
    const sorted = []
    for (const n of names) {
      const hit = usable.find((p) => p.name === n)
      if (hit && !sorted.includes(hit)) sorted.push(hit)
    }
    // 指定に漏れたものは後ろに付けます
    list = [...sorted, ...usable.filter((p) => !sorted.includes(p))]
  }

  // 交互利用：呼び出しごとに先頭をずらします
  if (process.env.AI_ROTATE === '1') {
    const shift = rotateCount++ % list.length
    list = [...list.slice(shift), ...list.slice(0, shift)]
  }

  return list
}

/** いまの設定を確認用に返します */
export function providerSettings() {
  return {
    order: process.env.AI_ORDER || '（既定：Groq→Gemini→OpenAI→Claude）',
    rotate: process.env.AI_ROTATE === '1',
    heavy: process.env.AI_HEAVY || '',
    next: orderedProviders().map((p) => p.label),
  }
}

/** 使えるプロバイダを、モデル名付きで返します */
export function availableProviderDetails() {
  return PROVIDERS.filter((p) => Boolean(process.env[p.envKey])).map((p) => ({
    label: p.label,
    model: p.model,
    envKey: p.envKey,
  }))
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

async function callAnthropic(key, model, system, messages, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.75,
      system,
      messages: messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    }),
  })
  if (!res.ok) throw new Error(`Claude ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const data = await res.json()
  const text = data?.content?.filter((c) => c.type === 'text').map((c) => c.text).join('').trim()
  if (!text) throw new Error('Claudeの応答が空でした')
  return text
}

/**
 * AIに問い合わせる（使えるものを上から順に試します）
 * 戻り値： { text, provider, model }
 * 失敗時： { error: 'NO_KEY' | 'ALL_FAILED', detail }
 */
export async function askProviders(system, messages, { maxTokens = 900, json = false, heavy = false } = {}) {
  const errors = []
  const list = orderedProviders(heavy)

  /** 1つのプロバイダを、指定のモデルで呼ぶ */
  const call = async (p, key, useJson, model) => {
    const m = model || p.model
    if (p.name === 'groq') return callGroq(key, m, system, messages, maxTokens, useJson)
    if (p.name === 'gemini') return callGemini(key, m, system, messages, maxTokens, useJson)
    if (p.name === 'openai') return callOpenAI(key, m, system, messages, maxTokens, useJson)
    return callAnthropic(key, m, system, messages, maxTokens)
  }

  for (const p of list) {
    const key = process.env[p.envKey]
    if (!key) continue

    try {
      const text = await call(p, key, json)
      return { text, provider: p.label, model: p.model }
    } catch (e) {
      errors.push(`${p.label}: ${e.message}`)

      // ① モデルが提供終了していたら、案内された後継モデルで試します
      const suggested = findSuggestedModel(e.message)
      if (suggested && suggested !== p.model) {
        try {
          const text = await call(p, key, json, suggested)
          return { text, provider: p.label, model: suggested, switched: true }
        } catch (e2) {
          errors.push(`${p.label}(${suggested}): ${e2.message}`)

          // 後継モデルでもJSON指定が通らない場合
          if (json) {
            try {
              const text = await call(p, key, false, suggested)
              return { text, provider: p.label, model: suggested, switched: true }
            } catch (e3) {
              errors.push(`${p.label}(${suggested}/JSON指定なし): ${e3.message}`)
            }
          }
        }
      }

      // ② JSON形式の指定に対応していないモデルがあるため、外して試します
      if (json) {
        try {
          const text = await call(p, key, false)
          return { text, provider: p.label, model: p.model }
        } catch (e4) {
          errors.push(`${p.label}(JSON指定なし): ${e4.message}`)
        }
      }
    }
  }

  if (errors.length === 0) {
    return {
      error: 'NO_KEY',
      detail:
        'Vercelの Settings → Environment Variables に GROQ_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY / ANTHROPIC_API_KEY のいずれかを登録し、再デプロイしてください。',
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
