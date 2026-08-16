import type { AppData, AiStaff } from '../types'

/* ============================================================
   初期データ（Firestore にまだ何も無いときに使われます）
   ログイン後に「データ編集」から書き換えると Firestore に保存され、
   以降はそちらが優先されます。
   ============================================================ */

/** AI社員 23人 */
export const DEFAULT_STAFF: AiStaff[] = [
  // ── コア部門 ───────────────────────────────
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

  // ── DayDream Plus メンバーAI ───────────────
  { id: 'yuma', name: '悠真AI', nameEn: 'Yuma AI', role: 'リーダー・統括', group: 'member', status: 'active', accent: 'blue', tasks: 8, avatar: '/avatars/yuma.png' },
  { id: 'aoi', name: '葵AI', nameEn: 'Aoi AI', role: 'SNS・広報担当', group: 'member', status: 'active', accent: 'cyan', tasks: 6, avatar: '/avatars/aoi.png' },
  { id: 'ren', name: '蓮AI', nameEn: 'Ren AI', role: '音楽制作担当', group: 'member', status: 'active', accent: 'purple', tasks: 7, avatar: '/avatars/ren.png' },
  { id: 'yui', name: '結衣AI', nameEn: 'Yui AI', role: 'ボーカル・歌詞担当', group: 'member', status: 'active', accent: 'pink', tasks: 5, avatar: '/avatars/yui.png' },
  { id: 'daichi', name: '大地AI', nameEn: 'Daichi AI', role: 'スケジュール担当', group: 'member', status: 'active', accent: 'amber', tasks: 4, avatar: '/avatars/daichi.png' },
  { id: 'mikoto', name: '美琴AI', nameEn: 'Mikoto AI', role: 'ファン対応担当', group: 'member', status: 'active', accent: 'pink', tasks: 6, avatar: '/avatars/mikoto.png' },

  // ── 運営スタッフAI ─────────────────────────
  { id: 'takagi', name: '高木', nameEn: 'Takagi', role: '企画・プロデュース', group: 'staff', status: 'active', accent: 'cyan', tasks: 5, avatar: '/avatars/takagi.png' },
  { id: 'ota', name: '太田', nameEn: 'Ota', role: 'イベント企画・運営', group: 'staff', status: 'active', accent: 'amber', tasks: 4, avatar: '/avatars/ota.png' },
  { id: 'nakao', name: '中尾', nameEn: 'Nakao', role: '音響・サウンド管理', group: 'staff', status: 'standby', accent: 'purple', tasks: 2, avatar: '/avatars/nakao.png' },
  { id: 'shun', name: 'シュン', nameEn: 'Shun', role: '映像・配信サポート', group: 'staff', status: 'active', accent: 'blue', tasks: 6, avatar: '/avatars/shun.png' },
]

/** アプリ全体の初期データ */
export const DEFAULT_DATA: AppData = {
  company: {
    name: 'DayDream AI株式会社',
    system: 'DayDream AI Company System',
    subtitle: 'AI社員23人体制 統合ダッシュボード',
    presidentName: 'トシさん',
    version: 'v1.1.0',
  },

  finance: {
    monthSales: 12456890,
    monthSalesDiff: '+23.5%',
    monthProfit: 4567890,
    monthProfitDiff: '+18.7%',
    goal: 16000000,
    achieved: 12456890,
    goalRate: 78,
    daysLeft: 12,
  },

  salesTrend: [62, 58, 71, 66, 78, 74, 85, 82, 91, 88, 96, 108],
  profitTrend: [24, 22, 29, 27, 33, 30, 36, 34, 41, 39, 44, 51],
  youtubeTrend: [30, 34, 33, 41, 45, 43, 52, 58, 55, 64, 72, 86],

  schedule: [
    { time: '10:00', title: '新曲ミーティング', accent: 'cyan' },
    { time: '13:00', title: '楽曲チェック', accent: 'purple' },
    { time: '15:00', title: 'YouTube分析', accent: 'pink' },
    { time: '17:00', title: 'AI戦略会議', accent: 'blue' },
    { time: '19:00', title: 'ライブ準備ミーティング', accent: 'amber' },
  ],

  notices: [
    { id: 'n1', icon: '🎬', title: '新曲「みんな笑顔になれ」MV公開！', ago: '2分前', tone: 'good' },
    { id: 'n2', icon: '📈', title: 'YouTube登録者が1,000人増加！', ago: '15分前', tone: 'good' },
    { id: 'n3', icon: '🎤', title: 'ライブイベントの準備を開始しました', ago: '1時間前', tone: 'info' },
    { id: 'n4', icon: '💾', title: 'システムバックアップ完了', ago: '3時間前', tone: 'info' },
    { id: 'n5', icon: '💡', title: 'AI社員「AI戦略」から新規事業の提案があります', ago: '5時間前', tone: 'warn' },
  ],

  projects: [
    { name: '新曲制作プロジェクト', progress: 85 },
    { name: 'MV制作プロジェクト', progress: 60 },
    { name: 'ライブ準備プロジェクト', progress: 75 },
    { name: 'アプリ開発プロジェクト', progress: 40 },
    { name: 'YouTube運用プロジェクト', progress: 90 },
  ],

  projectSummary: { running: 12, done: 8, hold: 2 },

  nowPlaying: {
    title: 'みんな笑顔になれ',
    credit: '作詞・作曲：DayDream AI',
    current: '02:45',
    total: '04:19',
    progress: 63,
  },

  songs: [
    { id: 's1', title: 'みんな笑顔になれ', length: '04:19', date: '2026/08/05' },
    { id: 's2', title: 'Brand New Beat', length: '04:01', date: '2026/07/28' },
    { id: 's3', title: 'STARDUST FINALE!!', length: '04:32', date: '2026/07/15' },
    { id: 's4', title: 'SUMMER DIVE!!', length: '03:58', date: '2026/07/01' },
    { id: 's5', title: '母', length: '05:12', date: '2026/06/18' },
  ],

  youtube: {
    subscribers: '18,250',
    subscribersDiff: '+1,245',
    views: '2,456,789',
    viewsDiff: '+256,789',
    watchHours: '45,678',
    watchHoursDiff: '+5,678',
  },

  videos: [
    { id: 'v1', title: 'みんな笑顔になれ MV', views: '125,678 回視聴' },
    { id: 'v2', title: 'STARDUST FINALE!! Live', views: '98,765 回視聴' },
    { id: 'v3', title: 'SUMMER DIVE!! MV', views: '87,654 回視聴' },
  ],

  nextLive: {
    date: '2026年8月15日',
    title: 'DayDream Plus Live 2026',
    venue: '垂井町文化会館 大ホール',
    progress: 75,
    checks: [
      { label: '会場手配', done: true },
      { label: '機材チェック', done: true },
      { label: 'リハーサル', done: true },
      { label: 'チケット販売', done: false },
    ],
  },

  lives: [
    { date: '2026/08/25', title: 'ミニライブ', venue: '垂井文化会館' },
    { date: '2026/10/15', title: 'ファンミーティング（予定）', venue: '大垣市民会館' },
  ],

  files: [
    { icon: '🎵', label: '楽曲', count: 128 },
    { icon: '🖼️', label: '画像', count: 756 },
    { icon: '🎬', label: '動画', count: 234 },
    { icon: '📄', label: 'ドキュメント', count: 89 },
    { icon: '📦', label: 'その他', count: 457 },
  ],

  storage: { used: 256, total: 1024, unit: 'GB' },

  systemStatus: [
    { name: 'サーバー', state: '正常' },
    { name: 'データベース', state: '正常' },
    { name: 'バックアップ', state: '正常' },
    { name: 'AIサービス', state: '正常' },
    { name: 'セキュリティ', state: '正常' },
  ],

  systemMetrics: [
    { label: 'CPU使用率', value: 23, accent: 'cyan' },
    { label: 'メモリ使用率', value: 45, accent: 'purple' },
    { label: 'ストレージ使用率', value: 68, accent: 'amber' },
  ],

  network: { speed: 120, unit: 'Mbps' },

  backup: { last: '今日 03:00', next: '明日 03:00', state: '正常' },

  staff: DEFAULT_STAFF,
}

/* ── 画面固定の表示物（Firestoreには保存しません） ────────── */

export const STAFF_GROUP_LABEL: Record<string, string> = {
  core: 'コア部門',
  member: 'DayDream Plus メンバーAI',
  staff: '運営スタッフAI',
}

export const CHAT_GREETING =
  'こんにちは、トシさん！\n今日も最高の一日にしましょう！\n何かお手伝いできることはありますか？'

export const GALLERY = [
  '/gallery/img1.png',
  '/gallery/img2.png',
  '/gallery/img3.png',
  '/gallery/img4.png',
  '/gallery/img5.png',
]

/** 金額の表示形式 */
export function yen(n: number): string {
  return '¥' + n.toLocaleString('ja-JP')
}

/** AI社員の稼働状況を集計する */
export function countStaffStatus(staff: AiStaff[]) {
  const active = staff.filter((s) => s.status === 'active').length
  const standby = staff.filter((s) => s.status === 'standby').length
  const maintenance = staff.filter((s) => s.status === 'maintenance').length
  const rate = staff.length ? Math.round((active / staff.length) * 100) : 0
  return { total: staff.length, active, standby, maintenance, rate }
}
