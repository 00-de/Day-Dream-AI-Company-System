/* ============================================================
   ログインできる人の一覧（役割と権限）
   ここに書いたメールアドレスで、Firebase Authentication に
   ユーザーを登録してください。
   ============================================================ */

export type RoleKey = 'president' | 'producer' | 'event' | 'sound' | 'video'

export interface Account {
  email: string
  /** 表示名 */
  name: string
  /** 肩書き */
  title: string
  role: RoleKey
  /** データ編集ができるか */
  canEdit: boolean
  accent: 'cyan' | 'blue' | 'purple' | 'pink' | 'green' | 'amber'
}

export const ACCOUNTS: Account[] = [
  {
    email: 'president@daydream-ai.jp',
    name: 'トシさん',
    title: '社長',
    role: 'president',
    canEdit: true,
    accent: 'cyan',
  },
  {
    email: 'takagi@daydream-ai.jp',
    name: '高木さん',
    title: '企画・プロデュース',
    role: 'producer',
    canEdit: true,
    accent: 'blue',
  },
  {
    email: 'ota@daydream-ai.jp',
    name: '太田さん',
    title: 'イベント企画・運営',
    role: 'event',
    canEdit: true,
    accent: 'amber',
  },
  {
    email: 'nakao@daydream-ai.jp',
    name: '中尾さん',
    title: '音響・サウンド管理',
    role: 'sound',
    canEdit: false,
    accent: 'purple',
  },
  {
    email: 'shun@daydream-ai.jp',
    name: 'シュンさん',
    title: '映像・配信サポート',
    role: 'video',
    canEdit: false,
    accent: 'pink',
  },
]

/** メールアドレスからアカウント情報を探す */
export function findAccount(email: string | null | undefined): Account | null {
  if (!email) return null
  const target = email.trim().toLowerCase()
  return ACCOUNTS.find((a) => a.email.toLowerCase() === target) ?? null
}

/** 一覧に無いメールアドレスでログインしたとき用 */
export const GUEST_ACCOUNT: Account = {
  email: '',
  name: 'ゲスト',
  title: '閲覧のみ',
  role: 'video',
  canEdit: false,
  accent: 'green',
}
