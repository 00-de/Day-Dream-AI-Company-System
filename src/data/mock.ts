import type {
  ScheduleItem,
  NoticeItem,
  ProjectItem,
  Song,
  VideoItem,
  LiveItem,
  SystemStatus,
} from '../types'

/* ============================================================
   ダッシュボード表示用データ
   ※ 後で Firebase Firestore に差し替えできるよう
      すべてこのファイルに集約しています
   ============================================================ */

export const COMPANY = {
  name: 'DayDream AI株式会社',
  system: 'DayDream AI Company System',
  subtitle: 'AI社員23人体制 統合ダッシュボード',
  presidentName: 'トシさん',
  version: 'v1.0.0',
}

/** 経営サマリー */
export const FINANCE = {
  monthSales: 12456890,
  monthSalesDiff: '+23.5%',
  monthProfit: 4567890,
  monthProfitDiff: '+18.7%',
  goal: 16000000,
  achieved: 12456890,
  goalRate: 78,
  daysLeft: 12,
}

/** 売上推移（12ヶ月・グラフ用） */
export const SALES_TREND = [62, 58, 71, 66, 78, 74, 85, 82, 91, 88, 96, 108]
export const PROFIT_TREND = [24, 22, 29, 27, 33, 30, 36, 34, 41, 39, 44, 51]
export const YOUTUBE_TREND = [30, 34, 33, 41, 45, 43, 52, 58, 55, 64, 72, 86]

/** 今日のスケジュール */
export const SCHEDULE: ScheduleItem[] = [
  { time: '10:00', title: '新曲ミーティング', accent: 'cyan' },
  { time: '13:00', title: '楽曲チェック', accent: 'purple' },
  { time: '15:00', title: 'YouTube分析', accent: 'pink' },
  { time: '17:00', title: 'AI戦略会議', accent: 'blue' },
  { time: '19:00', title: 'ライブ準備ミーティング', accent: 'amber' },
]

/** お知らせ・アラート */
export const NOTICES: NoticeItem[] = [
  { id: 'n1', icon: '🎬', title: '新曲「みんな笑顔になれ」MV公開！', ago: '2分前', tone: 'good' },
  { id: 'n2', icon: '📈', title: 'YouTube登録者が1,000人増加！', ago: '15分前', tone: 'good' },
  { id: 'n3', icon: '🎤', title: 'ライブイベントの準備を開始しました', ago: '1時間前', tone: 'info' },
  { id: 'n4', icon: '💾', title: 'システムバックアップ完了', ago: '3時間前', tone: 'info' },
  { id: 'n5', icon: '💡', title: 'AI社員「AI戦略」から新規事業の提案があります', ago: '5時間前', tone: 'warn' },
]

/** プロジェクト進捗 */
export const PROJECTS: ProjectItem[] = [
  { name: '新曲制作プロジェクト', progress: 85 },
  { name: 'MV制作プロジェクト', progress: 60 },
  { name: 'ライブ準備プロジェクト', progress: 75 },
  { name: 'アプリ開発プロジェクト', progress: 40 },
  { name: 'YouTube運用プロジェクト', progress: 90 },
]

export const PROJECT_SUMMARY = { running: 12, done: 8, hold: 2 }

/** 楽曲 */
export const NOW_PLAYING = {
  title: 'みんな笑顔になれ',
  credit: '作詞・作曲：DayDream AI',
  current: '02:45',
  total: '04:19',
  progress: 63,
}

export const SONGS: Song[] = [
  { id: 's1', title: 'みんな笑顔になれ', length: '04:19', date: '2026/08/05' },
  { id: 's2', title: 'Brand New Beat', length: '04:01', date: '2026/07/28' },
  { id: 's3', title: 'STARDUST FINALE!!', length: '04:32', date: '2026/07/15' },
  { id: 's4', title: 'SUMMER DIVE!!', length: '03:58', date: '2026/07/01' },
  { id: 's5', title: '母', length: '05:12', date: '2026/06/18' },
]

/** YouTube */
export const YOUTUBE = {
  subscribers: '18,250',
  subscribersDiff: '+1,245',
  views: '2,456,789',
  viewsDiff: '+256,789',
  watchHours: '45,678',
  watchHoursDiff: '+5,678',
}

export const VIDEOS: VideoItem[] = [
  { id: 'v1', title: 'みんな笑顔になれ MV', views: '125,678 回視聴' },
  { id: 'v2', title: 'STARDUST FINALE!! Live', views: '98,765 回視聴' },
  { id: 'v3', title: 'SUMMER DIVE!! MV', views: '87,654 回視聴' },
]

/** ライブ */
export const NEXT_LIVE = {
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
}

export const LIVES: LiveItem[] = [
  { date: '2026/08/25', title: 'ミニライブ', venue: '垂井文化会館' },
  { date: '2026/10/15', title: 'ファンミーティング（予定）', venue: '大垣市民会館' },
]

/** ファイル管理 */
export const FILES = [
  { icon: '🎵', label: '楽曲', count: 128 },
  { icon: '🖼️', label: '画像', count: 756 },
  { icon: '🎬', label: '動画', count: 234 },
  { icon: '📄', label: 'ドキュメント', count: 89 },
  { icon: '📦', label: 'その他', count: 457 },
]

export const STORAGE = { used: 256, total: 1024, unit: 'GB' }

/** システム監視 */
export const SYSTEM_STATUS: SystemStatus[] = [
  { name: 'サーバー', state: '正常' },
  { name: 'データベース', state: '正常' },
  { name: 'バックアップ', state: '正常' },
  { name: 'AIサービス', state: '正常' },
  { name: 'セキュリティ', state: '正常' },
]

export const SYSTEM_METRICS = [
  { label: 'CPU使用率', value: 23, accent: 'cyan' as const },
  { label: 'メモリ使用率', value: 45, accent: 'purple' as const },
  { label: 'ストレージ使用率', value: 68, accent: 'amber' as const },
]

export const NETWORK = { speed: 120, unit: 'Mbps' }

/** バックアップ */
export const BACKUP = {
  last: '今日 03:00',
  next: '明日 03:00',
  state: '正常',
}

/** AI秘書チャットの初期メッセージ */
export const CHAT_GREETING =
  'こんにちは、トシさん！\n今日も最高の一日にしましょう！\n何かお手伝いできることはありますか？'

/** 画像生成ギャラリー（public/gallery/ に画像を置くと表示されます） */
export const GALLERY = [
  '/gallery/img1.png',
  '/gallery/img2.png',
  '/gallery/img3.png',
  '/gallery/img4.png',
  '/gallery/img5.png',
]

/** 金額をフォーマットする */
export function yen(n: number): string {
  return '¥' + n.toLocaleString('ja-JP')
}
