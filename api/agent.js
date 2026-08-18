/* ============================================================
   AI社員に実際の仕事をさせる API
   URL: /api/agent

   流れ：
     1. AIが検索キーワードを考える
     2. Tavily / Brave で検索する
     3. 検索結果を読んで、成果物（表・下書き）を作る

   ※ 検索結果には誤りや古い情報が含まれます。
     必ず出典URLを一緒に返し、人が確認できるようにします。
   ============================================================ */

import { askProviders, availableProviders, buildContext, parseJson } from './_provider.js'
import { multiSearch, formatForAi, availableSearch } from './_search.js'

/** 仕事の種類ごとの指示 */
const JOBS = {
  venue: {
    label: 'ライブ会場さがし',
    staff: '陽太AI（AI営業）',
    queryHint: '会場名・地域・収容人数・料金・貸出条件が分かるページを探すキーワード',
    format: `{
  "summary": "調査結果の要約（2〜3文）",
  "items": [
    {
      "name": "会場名",
      "place": "所在地",
      "capacity": "収容人数",
      "cost": "料金の目安（不明なら「要問い合わせ」）",
      "note": "特徴・注意点",
      "source": "出典URL",
      "confidence": "high|medium|low"
    }
  ],
  "draft": "問い合わせメールの下書き（宛名は【会場名】として空けておく）",
  "nextSteps": ["次にやること1", "次にやること2"]
}`,
  },
  sponsor: {
    label: 'スポンサー候補さがし',
    staff: '陽太AI（AI営業）',
    queryHint: '地域の企業・協賛実績・支援制度が分かるページを探すキーワード',
    format: `{
  "summary": "調査結果の要約（2〜3文）",
  "items": [
    {
      "name": "企業・団体名",
      "place": "所在地・業種",
      "capacity": "規模の目安",
      "cost": "協賛の想定金額（不明なら「要相談」）",
      "note": "協賛が見込める理由・過去の実績",
      "source": "出典URL",
      "confidence": "high|medium|low"
    }
  ],
  "draft": "協賛のお願いメールの下書き（宛名は【企業名】として空けておく）",
  "nextSteps": ["次にやること1", "次にやること2"]
}`,
  },
  research: {
    label: '調査メモ作成',
    staff: '知也AI（AIリサーチャー）',
    queryHint: '事実・数字・最新の動きが分かるページを探すキーワード',
    format: `{
  "summary": "調べて分かったことの要約（3〜5文）",
  "items": [
    {
      "name": "分かったこと（見出し）",
      "place": "",
      "capacity": "",
      "cost": "",
      "note": "詳しい内容。数字があれば必ず入れる",
      "source": "出典URL",
      "confidence": "high|medium|low"
    }
  ],
  "draft": "社内共有用のまとめ（そのまま貼れる文章）",
  "nextSteps": ["さらに調べるとよいこと1", "2"]
}`,
  },
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      ai: availableProviders(),
      search: availableSearch(),
      jobs: Object.entries(JOBS).map(([k, v]) => ({ key: k, label: v.label, staff: v.staff })),
    })
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POSTでリクエストしてください' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { job = 'research', request = '', context = null, maxResults = 8 } = body

    const recipe = JOBS[job]
    if (!recipe) return res.status(400).json({ error: '対応していない仕事の種類です' })
    if (!request.trim()) return res.status(400).json({ error: '依頼内容を入力してください' })

    if (availableSearch().length === 0) {
      return res.status(503).json({
        error: '検索APIのキーが設定されていません',
        detail:
          'Vercelの Settings → Environment Variables に TAVILY_API_KEY または BRAVE_API_KEY を登録し、再デプロイしてください。',
        code: 'NO_SEARCH_KEY',
      })
    }

    /* ── 手順1：検索キーワードを考えさせる ── */
    const planSystem = [
      `あなたは ${recipe.staff} です。これから「${recipe.label}」の仕事をします。`,
      '依頼内容から、Web検索に使うキーワードを3〜4個考えてください。',
      '',
      '【キーワードの作り方】',
      `・${recipe.queryHint}`,
      '・日本語で、検索エンジンに入れる形（4〜10語）にします。',
      '・4個それぞれ違う角度にします（地域を変える、言い換える、条件を足すなど）。',
      '・「とは」「方法」のような曖昧な語は避け、具体的な固有名詞や数字を入れます。',
      '',
      '【出力形式】次のJSONだけを返してください。',
      '{ "queries": ["キーワード1", "キーワード2", "キーワード3"] }',
    ].join('\n')

    const plan = await askProviders(planSystem, [{ role: 'user', content: `依頼：${request.trim()}` }], {
      maxTokens: 400,
      json: true,
    })

    if (plan.error === 'NO_KEY') {
      return res.status(503).json({ error: 'AIのAPIキーが設定されていません', detail: plan.detail, code: 'NO_KEY' })
    }
    if (plan.error) {
      return res.status(502).json({ error: 'AIへの接続に失敗しました', detail: plan.detail, code: 'ALL_FAILED' })
    }

    const parsedPlan = parseJson(plan.text)
    const queries =
      Array.isArray(parsedPlan?.queries) && parsedPlan.queries.length > 0
        ? parsedPlan.queries.slice(0, 4)
        : [request.trim()]

    /* ── 手順2：検索する ── */
    const { groups, engines, errors } = await multiSearch(queries, 5)

    if (groups.length === 0) {
      return res.status(502).json({
        error: '検索できませんでした',
        detail: errors.join(' / '),
        code: 'SEARCH_FAILED',
      })
    }

    /* ── 手順3：結果を読んで成果物を作らせる ── */
    const workSystem = [
      `あなたは ${recipe.staff} です。集めた検索結果をもとに「${recipe.label}」の成果物を作ります。`,
      '',
      '【守るルール】',
      '・検索結果に書かれていることだけを使います。書かれていない数字や連絡先を推測で作らないこと。',
      '・各項目には、根拠になったページのURLを source として必ず入れます。',
      '・情報の確かさを confidence で示します。',
      '  high＝公式サイトに明記／medium＝まとめサイト等に記載／low＝推測を含む',
      '・料金や連絡先は変わりやすいので、確認が必要な点は note に書きます。',
      '・検索結果に良い候補が少なければ、無理に数を揃えず、少ない件数で正直に返します。',
      `・items は最大 ${maxResults} 件までにします。`,
      '・メールの下書きは、丁寧な日本語のビジネス文書にします。DayDream Plusという音楽グループの活動として書きます。',
      '',
      '【会社の状況】',
      buildContext(context) || '（データ未登録）',
      '',
      '【出力形式】次のJSONだけを返してください。前後に説明やコードブロックは付けないこと。',
      recipe.format,
    ].join('\n')

    const work = await askProviders(
      workSystem,
      [
        {
          role: 'user',
          content: `依頼：${request.trim()}\n\n【検索して集めた情報】\n${formatForAi(groups).slice(0, 24000)}`,
        },
      ],
      { maxTokens: 4000, json: true },
    )

    if (work.error) {
      return res.status(502).json({ error: 'AIへの接続に失敗しました', detail: work.detail, code: 'ALL_FAILED' })
    }

    const result = parseJson(work.text)
    if (!result) {
      return res.status(502).json({ error: '結果を読み取れませんでした。もう一度お試しください', code: 'BAD_FORMAT' })
    }

    return res.status(200).json({
      job,
      label: recipe.label,
      staff: recipe.staff,
      queries,
      engines,
      summary: result.summary ?? '',
      items: Array.isArray(result.items) ? result.items.slice(0, maxResults) : [],
      draft: result.draft ?? '',
      nextSteps: Array.isArray(result.nextSteps) ? result.nextSteps : [],
      sourceCount: groups.reduce((n, g) => n + g.results.length, 0),
      provider: work.provider,
    })
  } catch (e) {
    return res.status(500).json({ error: 'サーバー内部エラー', detail: String(e?.message || e) })
  }
}
