import type { AppData, AiStaff } from '../types'
import { buildContext } from './ai'

/* ============================================================
   AI社員に仕事を依頼する（全23人共通）
   ============================================================ */

export interface AskResult {
  staff: string
  answer: string
  deliverable: string
  points: string[]
  nextTasks: string[]
  needMore: string[]
  provider: string
  error?: string
  detail?: string
}

/** 担当分野に応じた依頼の例文 */
const HINTS: { match: RegExp; hints: string[] }[] = [
  { match: /社長|経営|意思決定/, hints: ['今月の数字を見て、来月の方針を考えて', '新しい事業を始めるべきか判断材料をまとめて'] },
  { match: /秘書|スケジュール/, hints: ['今週の予定に無理がないか確認して', 'ライブまでの逆算スケジュールを作って'] },
  { match: /戦略|新規事業/, hints: ['ファンを増やす新しい取り組みを3つ提案して', '来年の事業の柱になりそうなものを考えて'] },
  { match: /分析|データ|レポート/, hints: ['売上の推移から気づいたことを教えて', 'YouTubeの数字を分析して改善点を出して'] },
  { match: /営業/, hints: ['ライブ会場に送る問い合わせ文を作って', '協賛のお願いの切り出し方を考えて'] },
  { match: /ライター|文章|コピー/, hints: ['新曲の紹介文を200字で書いて', 'ライブの告知文を書いて'] },
  { match: /マーケ/, hints: ['新曲を広めるための順番を考えて', 'どの層に届けるべきか整理して'] },
  { match: /デザイン/, hints: ['サムネイルの構図案を3つ出して', 'グッズのデザインの方向性を提案して'] },
  { match: /リサーチ|情報収集|調査/, hints: ['同じ規模のグループがやっている工夫を調べて', '最近の音楽トレンドを整理して'] },
  { match: /プログラマ|システム開発/, hints: ['このアプリに追加すると便利な機能を提案して', '作業を自動化できそうな部分を探して'] },
  { match: /品質管理/, hints: ['この文章に問題がないか確認して', '公開前の確認項目を一覧にして'] },
  { match: /セキュリティ/, hints: ['アカウント管理で気をつける点を教えて', 'データのバックアップ体制を確認して'] },
  { match: /クラウド|インフラ/, hints: ['保存容量の使い方を見直したい', 'ファイルの整理ルールを提案して'] },
  { match: /リーダー|統括/, hints: ['今の進み具合をまとめて', '全体で遅れている部分を指摘して'] },
  { match: /SNS|広報/, hints: ['今週の投稿計画を立てて', 'フォロワーが伸びる投稿の型を教えて'] },
  { match: /音楽制作|作曲|編曲/, hints: ['次の曲の方向性を3案出して', 'サビを盛り上げる編曲の工夫を教えて'] },
  { match: /ボーカル|歌詞|歌/, hints: ['この曲のサビの歌詞を書いて', 'パート割りを提案して'] },
  { match: /音響|サウンド/, hints: ['ライブ会場の音響で注意する点を教えて', '必要な機材を一覧にして'] },
  { match: /映像|配信/, hints: ['配信の設定で気をつける点を教えて', 'MVの見せ場の作り方を提案して'] },
  { match: /ファン|対応/, hints: ['ファンからの質問への返信文を作って', 'ファンミーティングの企画を考えて'] },
  { match: /イベント|運営/, hints: ['当日の進行表を作って', '必要な人手を洗い出して'] },
  { match: /企画|プロデュース/, hints: ['次の1年でやるべきことを整理して', '企画の骨子をまとめて'] },
]

/** そのAI社員に合った依頼例を返します */
export function hintsFor(staff: AiStaff): string[] {
  const hit = HINTS.find((h) => h.match.test(staff.role))
  return hit ? hit.hints : ['担当分野で気づいたことを教えて', '今できることを提案して']
}

/** 専用の画面がある社員は、そちらに案内します */
export const SPECIAL_PANELS: Record<string, { label: string; where: string }> = {
  sales: { label: '会場・スポンサー探し', where: 'この画面の上にある「AI社員に仕事を頼む」' },
  researcher: { label: 'Web検索して調査', where: 'この画面の上にある「AI社員に仕事を頼む」' },
  aoi: { label: 'SNS投稿文の作成', where: 'この画面の「SNS投稿文を作る」' },
  qa: { label: '公開前チェック', where: 'この画面の「公開前チェック」' },
  yuma: { label: '日報・週報の作成', where: 'この画面の「統括レポート」' },
  programmer: { label: 'コード作成・不具合調査', where: 'この画面の「開発の相談」' },
  designer: { label: '画像・MVの一括生成', where: '「制作」画面の「MV一括生成」' },
  ren: { label: 'Suno用の楽曲プロンプト', where: '「制作」画面の「外部サービス連携」' },
  yui: { label: '歌詞づくり', where: '「制作」画面の「外部サービス連携」' },
  shun: { label: 'MV編集の構成づくり', where: '「制作」画面の「外部サービス連携」' },
}

export async function askStaff(
  staff: AiStaff,
  request: string,
  extra: string,
  data: AppData,
): Promise<AskResult> {
  const empty: AskResult = {
    staff: staff.name,
    answer: '',
    deliverable: '',
    points: [],
    nextTasks: [],
    needMore: [],
    provider: '',
  }
  try {
    const res = await fetch('/api?fn=ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff: { name: staff.name, role: staff.role },
        request,
        extra,
        context: buildContext(data),
      }),
    })
    if (res.ok) return (await res.json()) as AskResult
    const err = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null
    return { ...empty, error: err?.error ?? '依頼を実行できませんでした', detail: err?.detail }
  } catch {
    return { ...empty, error: '通信に失敗しました' }
  }
}

/** 結果を保存できる文章にします */
export function askResultToText(r: AskResult, request: string): string {
  const lines = [
    `【${r.staff} への依頼】`,
    `依頼：${request}`,
    `作成：${new Date().toLocaleString('ja-JP')}`,
    '',
    '■ 回答',
    r.answer,
    '',
  ]
  if (r.deliverable) lines.push('■ 成果物', r.deliverable, '')
  if (r.points.length) lines.push('■ 押さえておきたい点', ...r.points.map((x) => `・${x}`), '')
  if (r.nextTasks.length) lines.push('■ 次にやるとよいこと', ...r.nextTasks.map((x) => `・${x}`))
  return lines.join('\n')
}
