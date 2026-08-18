import type { AppData, AiStaff, MeetingTurn, MeetingTask, HumanOpinion, StaffOpinion } from '../types'
import { buildContext } from './ai'

/* ============================================================
   会議ルームの呼び出し（ブラウザ側）
   ============================================================ */

export interface MeetingResult {
  turns: MeetingTurn[]
  summary: string
  decisions: string[]
  tasks: MeetingTask[]
  provider: string
  /** AIに接続できず、簡易生成になった場合 true */
  offline: boolean
  /** 失敗した場合のメッセージ */
  error?: string
  /** 失敗したときの詳しい内容（原因調べ用） */
  detail?: string
}

/** 会議を開く */
export async function holdMeeting(
  topic: string,
  note: string,
  participants: AiStaff[],
  data: AppData,
  rounds = 2,
  humanOpinions: HumanOpinion[] = [],
): Promise<MeetingResult> {
  try {
    const res = await fetch('/api?fn=meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        note,
        rounds,
        participants: participants.map((p) => ({ name: p.name, role: p.role })),
        humanOpinions: humanOpinions.map((h) => ({ id: h.id, name: h.name, title: h.title, text: h.text })),
        context: buildContext(data),
      }),
    })

    if (res.ok) {
      const json = (await res.json()) as Omit<MeetingResult, 'offline'>
      return { ...json, offline: false }
    }

    const err = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null
    return {
      ...offlineMeeting(topic, note, participants, data, rounds, humanOpinions),
      error: err?.error ?? undefined,
      detail: err?.detail,
    }
  } catch {
    return offlineMeeting(topic, note, participants, data, rounds, humanOpinions)
  }
}

/* ============================================================
   簡易会議（APIキーが無いときや通信できないとき）
   参加者の担当に応じた定型の発言を組み立てます
   ============================================================ */

/** 担当分野ごとの発言のひな形 */
const ANGLES: { match: RegExp; open: string; second: string }[] = [
  { match: /経営|意思決定|統括|リーダー/, open: '全体の方向性から考えます。', second: '費用と時間の見通しを先に固めましょう。' },
  { match: /スケジュール|秘書/, open: 'まず日程の観点から整理します。', second: '締め切りから逆算すると、着手はこの週になります。' },
  { match: /戦略|新規事業|プロデュース|企画/, open: '中長期の狙いを整理します。', second: '他にはない切り口を1つ立てたいところです。' },
  { match: /分析|データ|レポート/, open: '数字の面から見ていきます。', second: '効果を測る指標を先に決めておきたいです。' },
  { match: /音楽|作曲|編曲|音響|サウンド/, open: '音づくりの面から意見を出します。', second: '制作にかかる工数を見積もっておきます。' },
  { match: /ボーカル|歌詞|歌/, open: '歌う側の視点でお話しします。', second: '言葉の届きやすさを最優先にしたいです。' },
  { match: /SNS|広報|マーケ/, open: '広め方の面から考えます。', second: '公開のタイミングを揃えると効果が上がります。' },
  { match: /デザイン|映像|配信/, open: '見た目・映像の面から意見します。', second: '世界観を統一できるよう素材を先に用意します。' },
  { match: /ファン|対応/, open: 'ファンのみなさんの反応を考えます。', second: '事前の告知があると受け止められ方が変わります。' },
  { match: /イベント|運営/, open: '当日の運営面から確認します。', second: '人手と会場の段取りを先に押さえます。' },
  { match: /開発|プログラマ|クラウド|セキュリティ|品質/, open: '仕組みの面から見ます。', second: '無理のない範囲で段階的に進めるのが安全です。' },
]

function angleFor(role: string) {
  return ANGLES.find((a) => a.match.test(role)) ?? { open: '担当の立場から意見します。', second: '進め方を具体化しておきます。' }
}

export function offlineMeeting(
  topic: string,
  note: string,
  participants: AiStaff[],
  data: AppData,
  rounds: number,
  humanOpinions: HumanOpinion[] = [],
): MeetingResult {
  const turns: MeetingTurn[] = []

  // 人間の意見に触れる発言を、最初のAI社員に持たせます
  const opinionRef = humanOpinions.length
    ? `${humanOpinions[0].name}のご意見（${humanOpinions[0].text.slice(0, 40)}…）を踏まえます。`
    : ''

  for (let r = 0; r < Math.max(1, rounds); r++) {
    participants.forEach((p, i) => {
      const a = angleFor(p.role)
      if (r === 0) {
        turns.push({
          speaker: p.name,
          text:
            `${a.open}「${topic}」について、${p.role}としては` +
            (i === 0
              ? `まず現状の整理から始めたいです。${opinionRef}`
              : `${participants[i - 1].name}さんの意見に沿いつつ、担当範囲で必要な準備を洗い出します。`) +
            (note ? `${note}という点も踏まえます。` : ''),
        })
      } else {
        turns.push({
          speaker: p.name,
          text: `${a.second}現在のプロジェクト進捗（${data.projects[0]?.name} ${data.projects[0]?.progress}%）を見ると、無理のない範囲で進められそうです。`,
        })
      }
    })
  }

  const tasks: MeetingTask[] = (humanOpinions
    .slice(0, 2)
    .map((h) => ({
      title: `${h.name}のご意見「${h.text.slice(0, 30)}」への対応を検討する`,
      assignee: participants[0]?.name ?? '',
      priority: 'high',
    })) as MeetingTask[])
    .concat(
      participants.slice(0, 3).map((p, i) => ({
        title: `「${topic}」について ${p.role} の準備を進める`,
        assignee: p.name,
        priority: (i === 0 ? 'high' : 'normal') as 'high' | 'normal' | 'low',
      })),
    )

  return {
    turns,
    summary: `「${topic}」について、${participants.map((p) => p.name).join('・')}の${participants.length}人で話し合いました。各担当が必要な準備を確認し、次の担当割り当てまで決めています。※AIに接続できていないため、簡易生成の議事録です。`,
    decisions: [
      `「${topic}」を進める方向で合意`,
      '各担当が次回までに準備を整える',
    ],
    tasks,
    provider: 'オフライン生成',
    offline: true,
  }
}


/* ============================================================
   会議に参加していない社員から意見を集める
   ============================================================ */

export interface OpinionsResult {
  opinions: StaffOpinion[]
  provider: string
  error?: string
  detail?: string
}

export async function collectOpinions(
  topic: string,
  summary: string,
  decisions: string[],
  members: AiStaff[],
  humanOpinions: HumanOpinion[],
  data: AppData,
): Promise<OpinionsResult> {
  try {
    const res = await fetch('/api?fn=opinions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        summary,
        decisions,
        members: members.map((m) => ({ name: m.name, role: m.role })),
        humanOpinions: humanOpinions.map((h) => ({ name: h.name, text: h.text })),
        context: buildContext(data),
      }),
    })

    if (res.ok) return (await res.json()) as OpinionsResult

    const err = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null
    return { ...offlineOpinions(members), error: err?.error ?? undefined, detail: err?.detail }
  } catch {
    return offlineOpinions(members)
  }
}

/** AIに接続できないときの簡易意見 */
export function offlineOpinions(members: AiStaff[]): OpinionsResult {
  const stances: StaffOpinion['stance'][] = ['agree', 'agree', 'conditional', 'agree', 'concern']
  return {
    opinions: members.map((m, i) => ({
      name: m.name,
      stance: stances[i % stances.length],
      text: `${m.role}の立場としては、進める方向で問題ないと考えます。担当範囲で必要な準備があれば対応します。※AIに接続できていないため簡易表示です。`,
    })),
    provider: 'オフライン生成',
  }
}


/* ============================================================
   会議中の発言（人間が話しかけて、AI社員が返します）
   ============================================================ */

export interface ChatReply {
  replies: MeetingTurn[]
  provider: string
  error?: string
  detail?: string
}

/** 1人分の発言 */
export interface Speech {
  name: string
  title: string
  text: string
}

export async function sendMeetingMessage(
  topic: string,
  participants: AiStaff[],
  history: MeetingTurn[],
  speeches: Speech[],
  data: AppData,
  replyCount = 2,
): Promise<ChatReply> {
  try {
    const res = await fetch('/api?fn=meetingchat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        participants: participants.map((p) => ({ name: p.name, role: p.role })),
        history: history.map((t) => ({ speaker: t.speaker, text: t.text, human: t.human })),
        messages: speeches,
        replyCount,
        context: buildContext(data),
      }),
    })

    if (res.ok) {
      const json = (await res.json()) as { replies: MeetingTurn[]; provider: string }
      return { replies: json.replies, provider: json.provider }
    }

    const err = (await res.json().catch(() => null)) as { error?: string; detail?: string } | null
    // AIに繋がらないときは、担当に応じた簡易応答を返します
    return {
      replies: participants.slice(0, replyCount).map((p) => ({
        speaker: p.name,
        text: `${p.role}の立場として承知しました。${speeches
          .map((sp) => `${sp.name}のご発言「${sp.text.slice(0, 24)}」`)
          .join('、')}の件、担当範囲で対応を検討します。※AIに接続できていないため簡易応答です。`,
      })),
      provider: 'オフライン応答',
      error: err?.error,
      detail: err?.detail,
    }
  } catch {
    return {
      replies: [],
      provider: '',
      error: '通信に失敗しました',
    }
  }
}
