/* ============================================================
   Firebase Admin（サーバー側からデータを読み書きする仕組み）

   【なぜ必要か】
   画面からの読み書きは「ログインした人だけ」に制限しています。
   自動実行は深夜など人がいない時間に動くため、ログインできません。
   そこでサーバー専用の鍵（サービスアカウント）を使って、
   ルールを通さず直接読み書きします。

   この鍵は絶対に公開しないでください。
   Vercelの環境変数（FIREBASE_SERVICE_ACCOUNT）にだけ入れます。
   ============================================================ */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

let db = null

/** Firestore に接続します（未設定なら null を返します） */
export function getDb() {
  if (db) return db

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return null

  try {
    // 環境変数には JSON をそのまま貼る方式と、Base64 で貼る方式の両方に対応します
    const text = raw.trim().startsWith('{')
      ? raw
      : Buffer.from(raw, 'base64').toString('utf8')
    const account = JSON.parse(text)

    // 秘密鍵の改行が \n という文字列になっている場合を直します
    if (typeof account.private_key === 'string') {
      account.private_key = account.private_key.replace(/\\n/g, '\n')
    }

    const app = getApps().length > 0 ? getApps()[0] : initializeApp({ credential: cert(account) })
    db = getFirestore(app)
    return db
  } catch (e) {
    console.error('Firebase Admin の初期化に失敗しました:', e.message)
    return null
  }
}

export { FieldValue }

/** ダッシュボードのデータを読みます */
export async function readDashboard(database) {
  const snap = await database.collection('system').doc('dashboard').get()
  return snap.exists ? snap.data() : null
}

/** コレクションを読みます */
export async function readCollection(database, name, limit = 200) {
  const snap = await database.collection(name).limit(limit).get()
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }))
}

/** お知らせを先頭に追加します（最大12件まで保持） */
export async function addNotice(database, notice) {
  const ref = database.collection('system').doc('dashboard')
  const snap = await ref.get()
  const current = snap.exists ? snap.data() : {}
  const notices = Array.isArray(current.notices) ? current.notices : []

  const next = [
    { id: `auto${Date.now()}`, ago: 'たった今', ...notice },
    ...notices,
  ].slice(0, 12)

  await ref.set({ notices: next, updatedAt: new Date().toISOString() }, { merge: true })
}
