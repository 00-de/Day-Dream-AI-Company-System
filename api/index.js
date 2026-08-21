/* ============================================================
   すべてのAI機能の入口（Vercel サーバーレス関数）
   URL: /api?fn=chat のように、fn で処理を指定します

   【なぜ1つにまとめているか】
   Vercelの無料プラン（Hobby）では、サーバー機能を12個までしか
   置けません。機能ごとにファイルを分けると上限に達するため、
   入口を1つにして、中で振り分けています。

   処理の中身は api/_handlers/ にあります。
   ファイル名が _ で始まるフォルダは、URLとして公開されません。
   ============================================================ */

import agent from './_handlers/agent.js'
import ask from './_handlers/ask.js'
import chat from './_handlers/chat.js'
import check from './_handlers/check.js'
import craft from './_handlers/craft.js'
import dev from './_handlers/dev.js'
import image from './_handlers/image.js'
import meeting from './_handlers/meeting.js'
import meetingchat from './_handlers/meetingchat.js'
import opinions from './_handlers/opinions.js'
import report from './_handlers/report.js'
import shots from './_handlers/shots.js'
import sns from './_handlers/sns.js'

const HANDLERS = {
  agent,
  ask,
  chat,
  check,
  craft,
  dev,
  image,
  meeting,
  meetingchat,
  opinions,
  report,
  shots,
  sns,
}

export default async function handler(req, res) {
  // ?fn=chat のように指定します
  const url = new URL(req.url, `https://${req.headers.host}`)
  const fn = url.searchParams.get('fn') || ''

  const target = HANDLERS[fn]
  if (!target) {
    return res.status(404).json({
      error: '処理が見つかりません',
      detail: `fn に次のいずれかを指定してください：${Object.keys(HANDLERS).join(', ')}`,
    })
  }

  return target(req, res)
}
