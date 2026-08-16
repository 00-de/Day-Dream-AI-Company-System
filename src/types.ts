/* ============================================================
   DayDream AI Company System - 型定義
   ============================================================ */

/** AI社員の稼働ステータス */
export type StaffStatus = 'active' | 'standby' | 'maintenance'

/** AI社員の所属グループ */
export type StaffGroup = 'core' | 'member' | 'staff'

/** AI社員 */
export interface AiStaff {
  id: string
  /** 表示名（日本語） */
  name: string
  /** ローマ字表記（メンバーAIのみ表示） */
  nameEn?: string
  /** 担当業務 */
  role: string
  group: StaffGroup
  status: StaffStatus
  /** アバター画像パス（public/avatars/ に置いた画像。無い場合はイニシャル表示） */
  avatar?: string
  /** テーマカラー（グロー用） */
  accent: 'cyan' | 'blue' | 'purple' | 'pink' | 'green' | 'amber'
  /** 担当中タスク数 */
  tasks: number
}

/** 予定 */
export interface ScheduleItem {
  time: string
  title: string
  accent: 'cyan' | 'blue' | 'purple' | 'pink' | 'green' | 'amber'
}

/** お知らせ・アラート */
export interface NoticeItem {
  id: string
  icon: string
  title: string
  ago: string
  tone: 'info' | 'good' | 'warn'
}

/** プロジェクト進捗 */
export interface ProjectItem {
  name: string
  progress: number
}

/** 楽曲 */
export interface Song {
  id: string
  title: string
  length: string
  date: string
}

/** 動画 */
export interface VideoItem {
  id: string
  title: string
  views: string
}

/** ライブ予定 */
export interface LiveItem {
  date: string
  title: string
  venue: string
}

/** システム監視項目 */
export interface SystemStatus {
  name: string
  state: '正常' | '注意' | '停止'
}

/** チャットメッセージ */
export interface ChatMessage {
  id: string
  from: 'ai' | 'me'
  text: string
  time: string
}
