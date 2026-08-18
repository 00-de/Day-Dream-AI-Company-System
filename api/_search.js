/* ============================================================
   Web検索の共通処理
   ファイル名が _ で始まるので、URLとしては公開されません。

   Tavily → Brave の順に試します。
   ・Tavily … ページの中身まで読んで返してくれるのでAI向き
   ・Brave  … 見出しと要約のみ。無料枠が大きい

   片方だけの登録でも動きます。
   交互に使いたい場合は SEARCH_ROTATE=1 を設定してください
   （呼び出しごとに先頭を入れ替えて、両方の無料枠を使い切ります）
   ============================================================ */

/** 交互利用のための呼び出し回数（サーバーが起きている間だけ保持されます） */
let callCount = 0

/** 使える検索サービスを返す */
export function availableSearch() {
  const list = []
  if (process.env.TAVILY_API_KEY) list.push('Tavily')
  if (process.env.BRAVE_API_KEY) list.push('Brave')
  return list
}

/** Tavily で検索する */
async function searchTavily(key, query, count) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      query,
      max_results: count,
      search_depth: 'basic',
      include_answer: true,
      country: 'japan',
    }),
  })
  if (!res.ok) throw new Error(`Tavily ${res.status}: ${(await res.text()).slice(0, 160)}`)
  const data = await res.json()

  return {
    engine: 'Tavily',
    answer: data.answer ?? '',
    results: (data.results ?? []).map((r) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      // Tavilyはページ本文の抜粋を返します
      content: (r.content ?? '').slice(0, 700),
      score: r.score ?? 0,
    })),
  }
}

/** Brave Search で検索する */
async function searchBrave(key, query, count) {
  const url = new URL('https://api.search.brave.com/res/v1/web/search')
  url.searchParams.set('q', query)
  url.searchParams.set('count', String(Math.min(20, count)))
  url.searchParams.set('country', 'JP')
  url.searchParams.set('search_lang', 'jp')

  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': key,
    },
  })
  if (!res.ok) throw new Error(`Brave ${res.status}: ${(await res.text()).slice(0, 160)}`)
  const data = await res.json()

  return {
    engine: 'Brave',
    answer: '',
    results: (data.web?.results ?? []).map((r) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      // Braveは要約のみ返します
      content: (r.description ?? '').replace(/<[^>]*>/g, '').slice(0, 600),
      score: 0,
    })),
  }
}

/**
 * 検索する（使えるものを順に試します）
 * 戻り値： { engine, answer, results }
 * 失敗時： { error, detail }
 */
export async function webSearch(query, count = 6) {
  const tavily = process.env.TAVILY_API_KEY
  const brave = process.env.BRAVE_API_KEY

  if (!tavily && !brave) {
    return {
      error: 'NO_KEY',
      detail:
        'Vercelの Settings → Environment Variables に TAVILY_API_KEY または BRAVE_API_KEY を登録し、再デプロイしてください。',
    }
  }

  // 通常はTavily優先。SEARCH_ROTATE=1 なら呼び出しごとに交互に使います
  const rotate = process.env.SEARCH_ROTATE === '1'
  const tavilyFirst = rotate ? callCount++ % 2 === 0 : true

  const order = tavilyFirst
    ? [
        { key: tavily, fn: searchTavily, label: 'Tavily' },
        { key: brave, fn: searchBrave, label: 'Brave' },
      ]
    : [
        { key: brave, fn: searchBrave, label: 'Brave' },
        { key: tavily, fn: searchTavily, label: 'Tavily' },
      ]

  const errors = []
  for (const o of order) {
    if (!o.key) continue
    try {
      const r = await o.fn(o.key, query, count)
      if (r.results.length > 0) return r
      errors.push(`${o.label}: 結果が0件でした`)
    } catch (e) {
      errors.push(e.message)
    }
  }

  return { error: 'ALL_FAILED', detail: errors.join(' / ') }
}

/** 複数のキーワードでまとめて検索する */
export async function multiSearch(queries, perQuery = 5) {
  const all = []
  const engines = new Set()
  const errors = []

  for (const q of queries.slice(0, 6)) {
    const r = await webSearch(q, perQuery)
    if (r.error) {
      errors.push(`${q}: ${r.detail}`)
      continue
    }
    engines.add(r.engine)
    all.push({ query: q, engine: r.engine, answer: r.answer, results: r.results })
    // 連続で叩きすぎないよう少し待ちます
    await new Promise((res) => setTimeout(res, 250))
  }

  return { groups: all, engines: [...engines], errors }
}

/** 検索結果を、AIが読める文章にまとめる */
export function formatForAi(groups) {
  const lines = []
  let n = 1
  for (const g of groups) {
    lines.push(`■ 検索キーワード：${g.query}（${g.engine}）`)
    if (g.answer) lines.push(`要約：${g.answer}`)
    for (const r of g.results) {
      lines.push(`[${n}] ${r.title}`)
      lines.push(`    URL: ${r.url}`)
      if (r.content) lines.push(`    内容: ${r.content}`)
      n++
    }
    lines.push('')
  }
  return lines.join('\n')
}
