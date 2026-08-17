/* ============================================================
   人間のメンバー
   AI社員とは別に、実際の人が意見を書き込めるようにします
   ============================================================ */

export interface Human {
  id: string
  name: string
  title: string
  /** どんな視点から意見を出す人か（AIへの説明に使います） */
  viewpoint: string
  accent: 'cyan' | 'blue' | 'purple' | 'pink' | 'green' | 'amber'
}

export const HUMANS: Human[] = [
  {
    id: 'kobayashi',
    name: '小林さん',
    title: '社長',
    viewpoint: '会社全体の経営判断・最終決定',
    accent: 'cyan',
  },
  {
    id: 'takagi',
    name: '高木さん',
    title: '企画・プロデュース',
    viewpoint: '長年の経験にもとづく企画の見立て・全体の座組み',
    accent: 'blue',
  },
  {
    id: 'ota',
    name: '太田さん',
    title: 'イベント企画・運営',
    viewpoint: '当日の運営・会場・人手の現実的な段取り',
    accent: 'amber',
  },
  {
    id: 'nakao',
    name: '中尾さん',
    title: '音響・サウンド管理',
    viewpoint: '音づくり・機材・現場の音響条件',
    accent: 'purple',
  },
  {
    id: 'shun',
    name: 'シュンさん',
    title: '映像・配信サポート',
    viewpoint: '撮影・配信・SNSでの見え方、若い世代の感覚',
    accent: 'pink',
  },
]

export function findHuman(id: string): Human | undefined {
  return HUMANS.find((h) => h.id === id)
}
