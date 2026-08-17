/* ============================================================
   Stability AI 画像生成 API（Vercel サーバーレス関数）
   URL: /api/image

   STABILITY_API_KEY はこのサーバー側だけで読み込みます。
   VITE_ は絶対に付けないでください。

   1枚ずつ生成します（60枚まとめては、ブラウザ側から
   繰り返し呼び出すことで進捗を見せながら実行します）
   ============================================================ */

/** 使えるモデルと料金（1クレジット = $0.01） */
export const MODELS = {
  core: { path: 'core', label: 'Core', credits: 3, usd: 0.03 },
  sd35: { path: 'sd3', label: 'SD3.5 Large', credits: 6.5, usd: 0.065 },
  ultra: { path: 'ultra', label: 'Ultra', credits: 8, usd: 0.08 },
}

const ASPECTS = ['16:9', '1:1', '9:16', '3:2', '2:3', '4:5', '5:4', '21:9', '9:21']

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // 設定確認用。キーの中身は返しません
    const key = process.env.STABILITY_API_KEY
    if (!key) return res.status(200).json({ ok: true, configured: false, models: MODELS })

    // 残クレジットを取得します
    try {
      const r = await fetch('https://api.stability.ai/v1/user/balance', {
        headers: { Authorization: `Bearer ${key}` },
      })
      const j = r.ok ? await r.json() : null
      return res.status(200).json({
        ok: true,
        configured: true,
        credits: j?.credits ?? null,
        models: MODELS,
      })
    } catch {
      return res.status(200).json({ ok: true, configured: true, credits: null, models: MODELS })
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POSTでリクエストしてください' })
  }

  const key = process.env.STABILITY_API_KEY
  if (!key) {
    return res.status(503).json({
      error: 'Stability AI のAPIキーが設定されていません',
      detail:
        'Vercelの Settings → Environment Variables に STABILITY_API_KEY を登録し、再デプロイしてください。',
      code: 'NO_KEY',
    })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const {
      prompt = '',
      negative = '',
      aspect = '16:9',
      model = 'core',
      seed = 0,
      stylePreset = '',
    } = body

    if (!prompt.trim()) {
      return res.status(400).json({ error: 'プロンプトが空です' })
    }

    const m = MODELS[model] ?? MODELS.core
    const ratio = ASPECTS.includes(aspect) ? aspect : '16:9'

    const form = new FormData()
    form.append('prompt', prompt.trim().slice(0, 9000))
    form.append('output_format', 'png')
    form.append('aspect_ratio', ratio)
    if (negative.trim()) form.append('negative_prompt', negative.trim().slice(0, 9000))
    if (seed) form.append('seed', String(seed))
    if (stylePreset) form.append('style_preset', stylePreset)

    const r = await fetch(`https://api.stability.ai/v2beta/stable-image/generate/${m.path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
      },
      body: form,
    })

    if (!r.ok) {
      const text = (await r.text()).slice(0, 400)
      // よくあるエラーを日本語で返します
      let message = '画像の生成に失敗しました'
      if (r.status === 401) message = 'APIキーが正しくありません'
      else if (r.status === 402) message = 'クレジットが足りません。Stability AIでチャージしてください'
      else if (r.status === 403) message = '内容が規約に触れたため生成できませんでした。表現を変えてお試しください'
      else if (r.status === 429) message = '短時間に送りすぎました。少し待ってからお試しください'
      return res.status(r.status === 402 ? 402 : 502).json({ error: message, detail: text, code: r.status })
    }

    const json = await r.json()
    if (json.finish_reason === 'CONTENT_FILTERED') {
      return res.status(422).json({
        error: '内容フィルターにかかりました。表現を変えてお試しください',
        code: 'FILTERED',
      })
    }

    return res.status(200).json({
      image: json.image, // base64（png）
      seed: json.seed,
      model: m.label,
      credits: m.credits,
      usd: m.usd,
    })
  } catch (e) {
    return res.status(500).json({ error: 'サーバー内部エラー', detail: String(e?.message || e) })
  }
}
