/* ============================================================
   AI秘書チャット API（Vercel サーバーレス関数）
   URL: /api/chat

   APIキーはこのサーバー側だけで読み込みます。
   ブラウザには絶対に出ないので、VITE_ 接頭辞は付けないでください。
   ============================================================ */

import {
  askProviders,
  availableProviders,
  availableProviderDetails,
  providerSettings,
  buildContext,
} from '../_provider.js'

/** AIへの指示文をつくる */
function buildSystemPrompt(ctx, persona) {
  const who = persona?.name || 'AI秘書'
  const role = persona?.role || 'スケジュール管理・社長の補佐'
  const userName = ctx?.company?.presidentName || 'トシさん'

  return [
    `あなたは「${who}」です。担当は「${role}」。`,
    `DayDream AI株式会社で働くAI社員として、社長の${userName}を補佐します。`,
    '',
    '【話し方のルール】',
    '・必ず日本語で答えます。',
    '・親しみやすく、前向きで、簡潔に。基本は3〜5文以内。',
    '・箇条書きが分かりやすい場面では箇条書きを使います。',
    '・数字を答えるときは、下の「現在の状況」の数字をそのまま使います。推測で数字を作らないこと。',
    '・「現在の状況」に書かれていないことを聞かれたら、正直に分からないと伝え、どこを見れば分かるかを案内します。',
    '・専門用語は避け、パソコンが得意でない人にも伝わる言葉を選びます。',
    '',
    '【現在の状況】',
    buildContext(ctx) || '（データがまだ登録されていません）',
  ].join('\n')
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // 設定確認用：どのAIが使える状態かを返します（キーの中身は返しません）
    return res.status(200).json({
      ok: true,
      available: availableProviders(),
      details: availableProviderDetails(),
      settings: providerSettings(),
    })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POSTでリクエストしてください' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { messages = [], context = null, persona = null } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages が空です' })
    }

    // 直近のやり取りだけ送る（費用と速度のため）
    const trimmed = messages
      .filter((m) => m && typeof m.content === 'string' && m.content.trim())
      .slice(-24)
      .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))

    const result = await askProviders(buildSystemPrompt(context, persona), trimmed, { maxTokens: 800 })

    if (result.error === 'NO_KEY') {
      return res.status(503).json({ error: 'APIキーが設定されていません', detail: result.detail, code: 'NO_KEY' })
    }
    if (result.error) {
      return res.status(502).json({ error: 'AIへの接続に失敗しました', detail: result.detail, code: 'ALL_FAILED' })
    }

    return res.status(200).json({
      reply: result.text,
      provider: result.provider,
      model: result.model,
      switched: result.switched ?? false,
    })
  } catch (e) {
    return res.status(500).json({ error: 'サーバー内部エラー', detail: String(e?.message || e) })
  }
}
