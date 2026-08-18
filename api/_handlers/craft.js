/* ============================================================
   素材プロンプト生成 API（Vercel サーバーレス関数）
   URL: /api/craft

   「夏の海のMVを作りたい」のような思いつきを、
   Suno / Genspark / CapCut それぞれに最適な形の
   指示文（プロンプト）に変換して返します。

   ※ Suno・Genspark・CapCut には公開APIが無いため、
     アプリ内で直接生成することはできません。
     この関数は「そのまま貼り付けられる指示文」を作ります。
   ============================================================ */

import { askProviders, availableProviders, buildContext, parseJson } from '../_provider.js'

/** 種類ごとの指示文の作り方 */
const RECIPES = {
  music: {
    label: 'Suno（楽曲）',
    format: `{
  "title": "曲のタイトル（日本語）",
  "style": "Sunoのstyle欄に入れる英語の指定（ジャンル・テンポ・楽器・声質を60語以内で）",
  "lyrics": "[Verse 1]\\n歌詞...\\n\\n[Chorus]\\n歌詞...\\n\\n[Verse 2]\\n歌詞...\\n\\n[Bridge]\\n歌詞...\\n\\n[Chorus]\\n歌詞...",
  "negative": "避けたい要素の英語指定",
  "tips": ["制作のコツ1", "制作のコツ2"]
}`,
    rules: [
      '歌詞は日本語で書きます。DayDream Plusが歌える、前向きで情景の見える言葉を選びます。',
      '[Verse 1] [Chorus] のような構成タグは英語のまま入れます（Sunoが認識するため）。',
      '歌詞は2番＋ブリッジまで入れて、合計40行程度にします。',
      'style欄は必ず英語で書きます。日本語だとSunoが解釈しにくいためです。',
      'メンバー5人（悠真・葵・蓮・結衣・大地）が歌う想定で、サビは全員で歌える言葉にします。',
    ],
  },
  image: {
    label: 'Genspark（画像）',
    format: `{
  "title": "この画像の用途（日本語）",
  "prompt": "英語の画像生成プロンプト（構図・被写体・照明・画風・画質指定を含める）",
  "promptJa": "上のプロンプトの日本語訳",
  "negative": "避けたい要素の英語指定",
  "aspect": "16:9 / 1:1 / 9:16 のいずれか",
  "tips": ["生成のコツ1", "生成のコツ2"]
}`,
    rules: [
      'promptは必ず英語で書きます。画像生成AIは英語のほうが精度が高いためです。',
      '構図・被写体・服装・照明・背景・画風・画質の順に、具体的に並べます。',
      'アニメ調のイラストを基本とし、DayDream Plusの世界観（ネオン・夜・ステージ）に合わせます。',
      '実在の人物名やアーティスト名は入れません。',
    ],
  },
  video: {
    label: 'CapCut（MV編集）',
    format: `{
  "title": "この動画の内容（日本語）",
  "structure": [{ "time": "0:00-0:15", "scene": "場面の説明", "effect": "使うエフェクト・トランジション" }],
  "effects": ["CapCutで使う機能1", "CapCutで使う機能2"],
  "textStyle": "テロップの入れ方の指定",
  "tips": ["編集のコツ1", "編集のコツ2"]
}`,
    rules: [
      'CapCutに実際にある機能名で書きます（キーフレーム、クロマキー、速度カーブ、テキストテンプレートなど）。',
      '曲の長さは4分程度を想定し、時間の区切りを8〜12個に分けます。',
      'パソコン版CapCutでの操作を前提にします。',
    ],
  },
  lyrics: {
    label: '歌詞づくり',
    format: `{
  "title": "曲のタイトル（日本語）",
  "theme": "この曲で伝えたいこと",
  "lyrics": "歌詞全文（構成タグ付き）",
  "parts": [{ "section": "1番Aメロ", "member": "担当メンバー名", "reason": "その理由" }],
  "tips": ["歌唱のコツ1", "歌唱のコツ2"]
}`,
    rules: [
      '歌詞は日本語で、声に出して歌える語感を大事にします。',
      'パート割りは、悠真（キーボード・歌）・葵（ギター・歌）・蓮（ギター・コーラス）・結衣（メインボーカル）・大地（ドラム）から選びます。',
      'サビは全員、感情の山場は結衣に振るのが基本です。',
    ],
  },
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, available: availableProviders(), kinds: Object.keys(RECIPES) })
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POSTでリクエストしてください' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { kind = 'image', idea = '', context = null } = body

    const recipe = RECIPES[kind]
    if (!recipe) {
      return res.status(400).json({ error: '対応していない種類です' })
    }
    if (!idea.trim()) {
      return res.status(400).json({ error: '作りたいものを入力してください' })
    }

    const system = [
      `あなたは DayDream AI株式会社の制作ディレクターです。${recipe.label} 用の指示文を作ります。`,
      '',
      '【守るルール】',
      ...recipe.rules.map((r) => `・${r}`),
      '・作った指示文は、そのままコピーして貼り付けられる完成形にします。',
      '',
      '【会社の現在の状況】',
      buildContext(context) || '（データがまだ登録されていません）',
      '',
      '【出力形式】',
      '次のJSONだけを返してください。前後に説明文やコードブロックは付けないこと。',
      recipe.format,
    ].join('\n')

    const result = await askProviders(system, [{ role: 'user', content: `作りたいもの：${idea.trim()}` }], {
      maxTokens: 2600,
      json: true,
    })

    if (result.error === 'NO_KEY') {
      return res.status(503).json({ error: 'APIキーが設定されていません', detail: result.detail, code: 'NO_KEY' })
    }
    if (result.error) {
      return res.status(502).json({ error: 'AIへの接続に失敗しました', detail: result.detail, code: 'ALL_FAILED' })
    }

    const parsed = parseJson(result.text)
    if (!parsed) {
      return res.status(502).json({ error: 'AIの回答を読み取れませんでした', code: 'BAD_FORMAT' })
    }

    return res.status(200).json({ kind, result: parsed, provider: result.provider })
  } catch (e) {
    return res.status(500).json({ error: 'サーバー内部エラー', detail: String(e?.message || e) })
  }
}
