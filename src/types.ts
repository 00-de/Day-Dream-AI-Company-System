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

/* ============================================================
   フェーズ2：Firestore に保存するデータ全体の型
   ============================================================ */

/** 経営数値 */
export interface Finance {
  monthSales: number
  monthSalesDiff: string
  monthProfit: number
  monthProfitDiff: string
  goal: number
  achieved: number
  goalRate: number
  daysLeft: number
}

/** 会社情報 */
export interface Company {
  name: string
  system: string
  subtitle: string
  presidentName: string
  version: string
}

/** ライブ準備チェック項目 */
export interface LiveCheck {
  label: string
  done: boolean
}

/** 次回ライブ */
export interface NextLive {
  date: string
  title: string
  venue: string
  progress: number
  checks: LiveCheck[]
}

/** YouTube 指標 */
export interface YoutubeStats {
  subscribers: string
  subscribersDiff: string
  views: string
  viewsDiff: string
  watchHours: string
  watchHoursDiff: string
}

/** ファイル種別 */
export interface FileKind {
  icon: string
  label: string
  count: number
}

/** システム使用率 */
export interface SystemMetric {
  label: string
  value: number
  accent: 'cyan' | 'blue' | 'purple' | 'pink' | 'green' | 'amber'
}

/** Firestore に保存するアプリ全体のデータ */
export interface AppData {
  company: Company
  finance: Finance
  salesTrend: number[]
  profitTrend: number[]
  youtubeTrend: number[]
  schedule: ScheduleItem[]
  notices: NoticeItem[]
  projects: ProjectItem[]
  projectSummary: { running: number; done: number; hold: number }
  nowPlaying: { title: string; credit: string; current: string; total: string; progress: number }
  songs: Song[]
  youtube: YoutubeStats
  videos: VideoItem[]
  nextLive: NextLive
  lives: LiveItem[]
  files: FileKind[]
  storage: { used: number; total: number; unit: string }
  systemStatus: SystemStatus[]
  systemMetrics: SystemMetric[]
  network: { speed: number; unit: string }
  backup: { last: string; next: string; state: string }
  staff: AiStaff[]
  /** 社員名簿の版数。上がると保存済みデータの名前・役職が自動更新されます */
  staffVersion?: number
  /** 最終更新（表示用のISO文字列） */
  updatedAt?: string
}

/* ============================================================
   フェーズ4：タスク管理とファイル管理
   ============================================================ */

/** タスクの状態 */
export type TaskStatus = 'todo' | 'doing' | 'done'

/** タスク */
export interface Task {
  id: string
  title: string
  /** 担当するAI社員のID（未割り当ては空） */
  assignee: string
  status: TaskStatus
  /** 期限（YYYY-MM-DD） */
  due: string
  /** 優先度 */
  priority: 'high' | 'normal' | 'low'
  createdAt: string
}

/** アップロードしたファイルの種類 */
export type MediaKind = 'image' | 'audio' | 'video' | 'document'

/** アップロードしたファイル */
export interface MediaItem {
  id: string
  name: string
  kind: MediaKind
  /** 表示・再生用のURL */
  url: string
  /** Firebase Storage 内のパス（削除に使います） */
  path: string
  /** バイト数 */
  size: number
  uploadedAt: string
  /** メモ・タグ */
  note?: string
}

/* ============================================================
   会議ルーム
   ============================================================ */

/** 会議での1発言 */
export interface MeetingTurn {
  speaker: string
  text: string
  /** 人間メンバーの発言なら true */
  human?: boolean
  /** 人間メンバーの肩書き */
  title?: string
}

/** 会議から出たタスク案 */
export interface MeetingTask {
  title: string
  assignee: string
  priority: 'high' | 'normal' | 'low'
}

/** 会議の記録 */
export interface Meeting {
  id: string
  topic: string
  note?: string
  /** 参加したAI社員のID */
  participants: string[]
  turns: MeetingTurn[]
  summary: string
  decisions: string[]
  tasks: MeetingTask[]
  /** 会議前に集めた人間メンバーの意見 */
  humanOpinions?: HumanOpinion[]
  /** 会議に参加していない社員から集めた意見 */
  staffOpinions?: StaffOpinion[]
  /** 生成に使ったAI（Groq / Gemini / OpenAI / オフライン） */
  provider: string
  createdAt: string
}

/** 人間メンバーの意見 */
export interface HumanOpinion {
  /** 人間メンバーのID */
  id: string
  name: string
  title: string
  text: string
}

/** 会議に参加していない社員の意見 */
export interface StaffOpinion {
  name: string
  stance: 'agree' | 'conditional' | 'concern'
  text: string
}
