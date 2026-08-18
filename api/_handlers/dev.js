/* ============================================================
   拓斗AI：開発支援 API
   URL: /api/dev

   コードの下書き・不具合の原因調べ・仕組みの説明をします。
   ============================================================ */

import { askProviders, availableProviders, parseJson } from '../_provider.js'

const MODES = {
  write: {
    label: 'コードを書く',
    guide: [
      '動くコードを書きます。省略や「ここに処理を書く」は使わず、完成した形で書きます。',
      'コメントは日本語で、なぜそうするのかを書きます。',
      'トシさんの環境に合わせます：React + TypeScript + Vite + Tailwind CSS + Firebase。',
      'ターミナルを使わない運用なので、コマンドが必要な場合はその旨をはっきり書きます。',
    ],
  },
  debug: {
    label: '不具合を調べる',
    guide: [
      'エラーの原因を、可能性の高い順に3つまで挙げます。',
      '各原因に対して、どこをどう直すかを具体的に書きます。',
      '原因が特定できない場合は、切り分けの手順を示します。',
      '推測で断定せず、確認方法を添えます。',
    ],
  },
  explain: {
    label: '仕組みを説明する',
    guide: [
      '専門用語をできるだけ避け、身近なたとえを使って説明します。',
      'パソコンが得意でない人にも分かる言葉を選びます。',
      '長さは10行程度にまとめます。',
    ],
  },
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, available: availableProviders(), modes: Object.entries(MODES).map(([k, v]) => ({ key: k, label: v.label })) })
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'POSTでリクエストしてください' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { mode = 'write', request = '', code = '' } = body

    const m = MODES[mode]
    if (!m) return res.status(400).json({ error: '対応していない種類です' })
    if (!request.trim()) return res.status(400).json({ error: '依頼内容を入力してください' })

    const system = [
      'あなたは 拓斗AI（システム開発担当）です。DayDream AI株式会社のプログラマーとして働きます。',
      `今回の仕事は「${m.label}」です。`,
      '',
      '【守るルール】',
      ...m.guide.map((g) => `・${g}`),
      '・分からないことは正直に「分かりません」と言い、憶測で答えないこと。',
      '・危険な操作（データの削除など）が含まれる場合は、必ず警告します。',
      '',
      '【出力形式】次のJSONだけを返してください。前後に説明やコードブロックは付けないこと。',
      `{
  "answer": "説明・回答（日本語）",
  "code": "コード全文（不要なら空文字）",
  "filename": "保存するファイル名（不要なら空文字）",
  "steps": ["作業手順1", "手順2"],
  "warnings": ["注意点があれば"]
}`,
    ].join('\n')

    const userMessage = [
      `依頼：${request.trim()}`,
      code.trim() ? `\n【対象のコード・エラー内容】\n${code.trim().slice(0, 8000)}` : '',
    ].join('\n')

    const result = await askProviders(system, [{ role: 'user', content: userMessage }], {
      maxTokens: 3500,
      heavy: true,
      json: true,
    })

    if (result.error === 'NO_KEY') {
      return res.status(503).json({ error: 'APIキーが設定されていません', detail: result.detail, code: 'NO_KEY' })
    }
    if (result.error) {
      return res.status(502).json({ error: 'AIへの接続に失敗しました', detail: result.detail, code: 'ALL_FAILED' })
    }

    const p = parseJson(result.text)
    if (!p) {
      // JSONで返らなかった場合は、そのまま文章として返します
      return res.status(200).json({ mode, answer: result.text, code: '', filename: '', steps: [], warnings: [], provider: result.provider })
    }

    return res.status(200).json({
      mode,
      answer: p.answer ?? '',
      code: p.code ?? '',
      filename: p.filename ?? '',
      steps: Array.isArray(p.steps) ? p.steps : [],
      warnings: Array.isArray(p.warnings) ? p.warnings : [],
      provider: result.provider,
    })
  } catch (e) {
    return res.status(500).json({ error: 'サーバー内部エラー', detail: String(e?.message || e) })
  }
}
