import type { AiStaff } from '../types'

/* ============================================================
   AI社員 23人 のマスターデータ
   avatar は public/avatars/ に画像を置くと自動で表示されます
   例: public/avatars/yuma.png → avatar: '/avatars/yuma.png'
   画像が無い場合は自動でイニシャルのネオンアバターになります
   ============================================================ */

export const AI_STAFF: AiStaff[] = [
  // ── コア部門（経営・開発・運用） ───────────────────────────
  { id: 'ceo', name: 'AI社長', role: '経営・意思決定', group: 'core', status: 'active', accent: 'cyan', tasks: 9, avatar: '/avatars/ceo.png' },
  { id: 'secretary', name: 'AI秘書', role: 'スケジュール管理', group: 'core', status: 'active', accent: 'blue', tasks: 12, avatar: '/avatars/secretary.png' },
  { id: 'strategy', name: 'AI戦略', role: '戦略立案・新規事業', group: 'core', status: 'active', accent: 'purple', tasks: 6, avatar: '/avatars/strategy.png' },
  { id: 'analyst', name: 'AI分析官', role: 'データ分析・レポート', group: 'core', status: 'active', accent: 'cyan', tasks: 8, avatar: '/avatars/analyst.png' },
  { id: 'sales', name: 'AI営業', role: '営業支援・提案', group: 'core', status: 'active', accent: 'green', tasks: 5, avatar: '/avatars/sales.png' },
  { id: 'writer', name: 'AIライター', role: '文章作成・コピー', group: 'core', status: 'active', accent: 'pink', tasks: 7, avatar: '/avatars/writer.png' },
  { id: 'marketer', name: 'AIマーケター', role: 'マーケティング戦略', group: 'core', status: 'active', accent: 'amber', tasks: 6, avatar: '/avatars/marketer.png' },
  { id: 'designer', name: 'AIデザイナー', role: 'デザイン制作', group: 'core', status: 'active', accent: 'purple', tasks: 10, avatar: '/avatars/designer.png' },
  { id: 'researcher', name: 'AIリサーチャー', role: '情報収集・調査', group: 'core', status: 'active', accent: 'blue', tasks: 4, avatar: '/avatars/researcher.png' },
  { id: 'programmer', name: 'AIプログラマー', role: 'システム開発', group: 'core', status: 'active', accent: 'cyan', tasks: 14, avatar: '/avatars/programmer.png' },
  { id: 'qa', name: 'AI品質管理', role: '品質チェック・テスト', group: 'core', status: 'active', accent: 'green', tasks: 5, avatar: '/avatars/qa.png' },
  { id: 'security', name: 'AIセキュリティ', role: 'セキュリティ管理', group: 'core', status: 'active', accent: 'blue', tasks: 3, avatar: '/avatars/security.png' },
  { id: 'cloud', name: 'AIクラウド', role: 'クラウド・インフラ管理', group: 'core', status: 'active', accent: 'cyan', tasks: 4, avatar: '/avatars/cloud.png' },

  // ── DayDream Plus メンバーAI ───────────────────────────────
  { id: 'yuma', name: '悠真AI', nameEn: 'Yuma AI', role: 'リーダー・統括', group: 'member', status: 'active', accent: 'blue', tasks: 8, avatar: '/avatars/yuma.png' },
  { id: 'aoi', name: '葵AI', nameEn: 'Aoi AI', role: 'SNS・広報担当', group: 'member', status: 'active', accent: 'cyan', tasks: 6, avatar: '/avatars/aoi.png' },
  { id: 'ren', name: '蓮AI', nameEn: 'Ren AI', role: '音楽制作担当', group: 'member', status: 'active', accent: 'purple', tasks: 7, avatar: '/avatars/ren.png' },
  { id: 'yui', name: '結衣AI', nameEn: 'Yui AI', role: 'ボーカル・歌詞担当', group: 'member', status: 'active', accent: 'pink', tasks: 5, avatar: '/avatars/yui.png' },
  { id: 'daichi', name: '大地AI', nameEn: 'Daichi AI', role: 'スケジュール担当', group: 'member', status: 'active', accent: 'amber', tasks: 4, avatar: '/avatars/daichi.png' },
  { id: 'mikoto', name: '美琴AI', nameEn: 'Mikoto AI', role: 'ファン対応担当', group: 'member', status: 'active', accent: 'pink', tasks: 6, avatar: '/avatars/mikoto.png' },

  // ── 運営スタッフAI ─────────────────────────────────────────
  { id: 'takagi', name: '高木', nameEn: 'Takagi', role: '企画・プロデュース', group: 'staff', status: 'active', accent: 'cyan', tasks: 5, avatar: '/avatars/takagi.png' },
  { id: 'ota', name: '太田', nameEn: 'Ota', role: 'イベント企画・運営', group: 'staff', status: 'active', accent: 'amber', tasks: 4, avatar: '/avatars/ota.png' },
  { id: 'nakao', name: '中尾', nameEn: 'Nakao', role: '音響・サウンド管理', group: 'staff', status: 'standby', accent: 'purple', tasks: 2, avatar: '/avatars/nakao.png' },
  { id: 'shun', name: 'シュン', nameEn: 'Shun', role: '映像・配信サポート', group: 'staff', status: 'active', accent: 'blue', tasks: 6, avatar: '/avatars/shun.png' },
]

export const STAFF_GROUP_LABEL: Record<string, string> = {
  core: 'コア部門',
  member: 'DayDream Plus メンバーAI',
  staff: '運営スタッフAI',
}

/** 稼働状況の集計 */
export function countStaffStatus() {
  const active = AI_STAFF.filter((s) => s.status === 'active').length
  const standby = AI_STAFF.filter((s) => s.status === 'standby').length
  const maintenance = AI_STAFF.filter((s) => s.status === 'maintenance').length
  const rate = Math.round((active / AI_STAFF.length) * 100)
  return { total: AI_STAFF.length, active, standby, maintenance, rate }
}
