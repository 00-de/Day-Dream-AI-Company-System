/* ============================================================
   葵AI：SNS投稿文の作成 API
   URL: /api/sns

   X（旧Twitter）・Instagram・YouTube用の投稿文を、
   それぞれの媒体に合った形で作ります。
   ============================================================ */

import { askProviders, availableProviders, buildContext, parseJson } from './_provider.js'

/** 媒体ごとの書き方 */
const CHANNELS = {
  x: {
    label: 'X（旧Twitter）',
    rules: [
      '全角140字以内。超えたら切り詰めます。',
      '1行目で目を引き、改行を入れて読みやすくします。',
      'ハッシュタグは3〜4個まで。多すぎると読みにくくなります。',
      '絵文字は2〜4個。使いすぎないこと。',
      'リンクを貼る想定なら、末尾に「詳しくは↓」のような一言を入れます。',
    ],
  },
  instagram: {
    label: 'Instagram',
    rules: [
      '150〜400字。1行目が一番大事なので、そこで惹きつけます。',
      '本文と改行を使い、読みやすい塊に分けます。',
      'ハッシュタグは10〜15個。本文の後に、改行を挟んでまとめて置きます。',
      '写真が主役なので、写真の説明ではなく「その時の気持ち」を書きます。',
    ],
  },
  youtube: {
    label: 'YouTube（概要欄）',
    rules: [
      '最初の2行で内容が分かるようにします（検索結果に出る部分です）。',
      '曲名・メンバー名・制作クレジットを入れます。',
      'チャンネル登録の呼びかけを1行入れます。',
      'ハッシュタグは3個まで。末尾に置きます。',
    ],
  },
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      available: availableProviders(),
      channels: Object.entries(CHANNELS).map(([k, v]) => ({ key: k, label: v.label })),
    })
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POSTでリクエストしてください' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { channel = 'x', topic = '', tone = 'friendly', count = 3, context = null } = body

    const ch = CHANNELS[channel]
    if (!ch) return res.status(400).json({ error: '対応していない媒体です' })
    if (!topic.trim()) return res.status(400).json({ error: '投稿の内容を入力してください' })

    const toneGuide =
      tone === 'excited'
        ? 'テンション高めで、勢いのある言葉を使います。'
        : tone === 'polite'
          ? '丁寧で落ち着いた、お知らせらしい文章にします。'
          : tone === 'casual'
            ? '友達に話しかけるような、砕けた言葉づかいにします。'
            : '親しみやすく、前向きで、読んだ人が応援したくなる文章にします。'

    const n = Math.min(5, Math.max(1, Number(count) || 3))

    const system = [
      'あなたは 葵AI（SNS・広報担当）です。DayDream Plusの投稿文を作ります。',
      `媒体は「${ch.label}」です。`,
      '',
      '【媒体のルール】',
      ...ch.rules.map((r) => `・${r}`),
      '',
      '【文章のトーン】',
      `・${toneGuide}`,
      '',
      '【共通のルール】',
      '・DayDream Plusは、悠真・葵・蓮・結衣・大地の5人組の音楽グループです。',
      '・嘘や誇張を書きません。決まっていないことを「決定」と書かないこと。',
      '・数字は下の「現在の状況」にあるものだけを使い、作らないこと。',
      `・案は ${n} 個、それぞれ違う切り口で作ります（呼びかけ型／エピソード型／告知型など）。`,
      '・各案に、なぜその書き方にしたかの狙いを一言添えます。',
      '・投稿に適した時間帯も提案します。',
      '',
      '【現在の状況】',
      buildContext(context) || '（データ未登録）',
      '',
      '【出力形式】次のJSONだけを返してください。前後に説明やコードブロックは付けないこと。',
      `{
  "posts": [
    {
      "approach": "切り口の名前（例：呼びかけ型）",
      "text": "投稿する本文（ハッシュタグ込み）",
      "chars": 実際の文字数,
      "aim": "この書き方にした狙い（1文）",
      "bestTime": "投稿におすすめの時間帯"
    }
  ],
  "hashtagPool": ["予備のハッシュタグ", "..."],
  "tips": ["投稿するときのコツ1", "コツ2"]
}`,
    ].join('\n')

    const result = await askProviders(system, [{ role: 'user', content: `投稿したい内容：${topic.trim()}` }], {
      maxTokens: 2500,
      json: true,
    })

    if (result.error === 'NO_KEY') {
      return res.status(503).json({ error: 'APIキーが設定されていません', detail: result.detail, code: 'NO_KEY' })
    }
    if (result.error) {
      return res.status(502).json({ error: 'AIへの接続に失敗しました', detail: result.detail, code: 'ALL_FAILED' })
    }

    const parsed = parseJson(result.text)
    if (!parsed || !Array.isArray(parsed.posts)) {
      return res.status(502).json({ error: '投稿文を読み取れませんでした', code: 'BAD_FORMAT' })
    }

    // 文字数は自分で数え直します（AIの自己申告は当てになりません）
    const posts = parsed.posts.map((p) => ({
      approach: p.approach ?? '',
      text: p.text ?? '',
      chars: [...String(p.text ?? '')].length,
      aim: p.aim ?? '',
      bestTime: p.bestTime ?? '',
    }))

    return res.status(200).json({
      channel,
      label: ch.label,
      posts,
      hashtagPool: Array.isArray(parsed.hashtagPool) ? parsed.hashtagPool : [],
      tips: Array.isArray(parsed.tips) ? parsed.tips : [],
      provider: result.provider,
    })
  } catch (e) {
    return res.status(500).json({ error: 'サーバー内部エラー', detail: String(e?.message || e) })
  }
}
