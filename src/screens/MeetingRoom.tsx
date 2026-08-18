import { useEffect, useMemo, useRef, useState } from 'react'
import type { AiStaff, Meeting, MeetingTurn, HumanOpinion, StaffOpinion } from '../types'
import { useData } from '../lib/data'
import { useLibrary } from '../lib/library'
import { useAuth } from '../lib/auth'
import { holdMeeting, collectOpinions } from '../lib/meeting'
import { Panel, ACCENT, StateBadge, MoreLink } from '../components/Ui'
import { Avatar } from '../components/Avatar'
import { HUMANS } from '../data/humans'
import { IconCheck, IconUsers, IconSparkle } from '../components/Icons'

/* ============================================================
   AI会議ルーム
   議題を決めてAI社員を集めると、それぞれの担当の立場から
   発言し、議事録・決定事項・次のタスクまでまとめます。
   ============================================================ */

/** よく使う議題の例 */
const TOPIC_PRESETS = [
  '次のシングルの方向性を決めたい',
  '次回ライブの集客をどう増やすか',
  'YouTubeの登録者を1万人増やす施策',
  'ファンミーティングの企画を考える',
  '来月の制作スケジュールの立て方',
  '新しいグッズのアイデア出し',
]

export function MeetingRoom() {
  const { data } = useData()
  const { addMeeting, updateMeeting, meetings, deleteMeeting, addTask } = useLibrary()
  const { account } = useAuth()

  const [topic, setTopic] = useState('')
  const [note, setNote] = useState('')
  const [rounds, setRounds] = useState(2)
  const [selected, setSelected] = useState<string[]>(['ceo', 'strategy', 'ren', 'mikoto'])
  const [running, setRunning] = useState(false)
  const [current, setCurrent] = useState<Meeting | null>(null)
  const [shownTurns, setShownTurns] = useState(0)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState('')
  const [addedTasks, setAddedTasks] = useState<string[]>([])
  const [opinions, setOpinions] = useState<HumanOpinion[]>([])
  const [whoId, setWhoId] = useState(HUMANS[0].id)
  const [opinionText, setOpinionText] = useState('')
  const [staffOpinions, setStaffOpinions] = useState<StaffOpinion[]>([])
  const [collecting, setCollecting] = useState(false)
  const [opinionFilter, setOpinionFilter] = useState<'all' | 'concern'>('all')
  const logRef = useRef<HTMLDivElement>(null)

  const staffOf = (id: string) => data.staff.find((s) => s.id === id)
  const participants = useMemo(
    () => selected.map(staffOf).filter((s): s is AiStaff => Boolean(s)),
    [selected, data.staff],
  )

  /** 名前から発言者のAI社員を探す */
  const speakerOf = (name: string): AiStaff | undefined =>
    data.staff.find((s) => s.name === name || s.nameEn === name || name.includes(s.name))

  // 発言を1つずつ表示する
  useEffect(() => {
    if (!current || shownTurns >= current.turns.length) return
    const t = setTimeout(() => setShownTurns((n) => n + 1), 700)
    return () => clearTimeout(t)
  }, [current, shownTurns])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
  }, [shownTurns])

  const toggleMember = (id: string) =>
    setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id].slice(0, 6)))

  /** 人間メンバーの意見を追加する */
  const addOpinion = () => {
    const text = opinionText.trim()
    const who = HUMANS.find((h) => h.id === whoId)
    if (!text || !who) return
    setOpinions((list) => [
      ...list.filter((o) => o.id !== who.id),
      { id: who.id, name: who.name, title: who.title, text },
    ])
    setOpinionText('')
  }

  const removeOpinion = (id: string) => setOpinions((list) => list.filter((o) => o.id !== id))

  const start = async () => {
    if (!topic.trim() || participants.length < 2 || running) return
    setError('')
    setRunning(true)
    setCurrent(null)
    setShownTurns(0)
    setAddedTasks([])
    setStaffOpinions([])

    const result = await holdMeeting(topic.trim(), note.trim(), participants, data, rounds, opinions)

    if (result.turns.length === 0) {
      setError('会議を開けませんでした。もう一度お試しください。')
      setDetail(result.detail ?? '')
      setRunning(false)
      return
    }

    // AIに繋がらず簡易生成になった場合は、理由を表示します
    if (result.provider === 'オフライン生成') {
      setError(result.error ?? 'AIに接続できなかったため、簡易生成の議事録になっています。')
      setDetail(result.detail ?? '')
    } else {
      setError('')
      setDetail('')
    }

    const saved = await addMeeting({
      topic: topic.trim(),
      note: note.trim(),
      participants: selected,
      turns: result.turns,
      summary: result.summary,
      decisions: result.decisions,
      tasks: result.tasks,
      humanOpinions: opinions,
      provider: result.provider,
    })

    setCurrent(saved)
    setRunning(false)
  }

  /** 議事録から出たタスクを、タスク管理に登録する */
  const registerTask = async (title: string, assigneeName: string, priority: 'high' | 'normal' | 'low') => {
    const st = speakerOf(assigneeName)
    await addTask({
      title,
      assignee: st?.id ?? '',
      status: 'todo',
      due: '',
      priority,
    })
    setAddedTasks((list) => [...list, title])
  }

  /** 会議に参加していない社員から意見を集める */
  const askEveryone = async () => {
    if (!current || collecting) return
    const absent = data.staff.filter((st) => !current.participants.includes(st.id))
    if (absent.length === 0) return

    setCollecting(true)
    const r = await collectOpinions(
      current.topic,
      current.summary,
      current.decisions,
      absent,
      current.humanOpinions ?? [],
      data,
    )
    setStaffOpinions(r.opinions)
    // 集めた意見は、そのまま会議記録に保存します
    if (r.opinions.length > 0 && account.canEdit) {
      await updateMeeting(current.id, { staffOpinions: r.opinions })
      setCurrent({ ...current, staffOpinions: r.opinions })
    }
    setCollecting(false)
  }

  const openHistory = (m: Meeting) => {
    setCurrent(m)
    setOpinions(m.humanOpinions ?? [])
    setStaffOpinions(m.staffOpinions ?? [])
    setShownTurns(m.turns.length)
    setTopic(m.topic)
    setAddedTasks([])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const visibleTurns: MeetingTurn[] = current ? current.turns.slice(0, shownTurns) : []
  const finished = current !== null && shownTurns >= current.turns.length

  return (
    <div className="layout-grid grid grid-cols-1 xl:grid-cols-12 gap-3">
      {/* ─────────── 左：会議の設定 ─────────── */}
      <div className="xl:col-span-3 space-y-3">
        <Panel title="議題">
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            placeholder="話し合いたいことを入力してください"
            aria-label="議題"
            className="w-full bg-night-950/70 rounded-lg px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none transition resize-none"
          />
          <p className="mt-2 mb-1.5 text-[10px] text-slate-500">議題の例</p>
          <div className="flex flex-wrap gap-1.5">
            {TOPIC_PRESETS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTopic(t)}
                className="text-[10px] px-2 py-1 rounded-md bg-white/[0.04] ring-1 ring-white/10 text-slate-300 hover:ring-cyan-400/40 hover:text-cyan-200 transition text-left"
              >
                {t}
              </button>
            ))}
          </div>

          <p className="mt-3 mb-1 text-[10px] text-slate-400">補足（任意）</p>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="予算・期限などの前提条件"
            aria-label="補足"
            className="w-full bg-night-950/70 rounded-lg px-3 py-2 text-[11px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none transition"
          />

          <p className="mt-3 mb-1.5 text-[10px] text-slate-400">発言の回数</p>
          <div className="flex gap-1.5">
            {[1, 2, 3].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRounds(r)}
                className={`flex-1 text-[11px] py-1.5 rounded-md transition ${
                  rounds === r
                    ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40'
                    : 'text-slate-400 ring-1 ring-white/10 hover:text-slate-100'
                }`}
              >
                {r}巡
              </button>
            ))}
          </div>
          <p className="mt-1 text-[9px] text-slate-600">
            1巡＝参加者全員が1回ずつ発言します（合計 {participants.length * rounds} 発言）
          </p>
        </Panel>

        <Panel
          title={`人間メンバーの意見（${opinions.length}件）`}
          action={<span className="text-[9px] text-slate-500">AIが必ず踏まえます</span>}
        >
          <p className="text-[10px] text-slate-500 mb-2 leading-relaxed">
            現場を知っている人の意見を入れると、AI社員がそれに名前を挙げて応答し、
            対応が必要なことは「次にやること」に入ります。
          </p>

          <select
            value={whoId}
            onChange={(e) => setWhoId(e.target.value)}
            aria-label="意見を書く人"
            className="w-full bg-night-950/70 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none"
          >
            {HUMANS.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}（{h.title}）
              </option>
            ))}
          </select>

          <textarea
            value={opinionText}
            onChange={(e) => setOpinionText(e.target.value)}
            rows={3}
            placeholder="この議題について思うこと、現場の事情、心配な点など"
            aria-label="意見の内容"
            className="mt-2 w-full bg-night-950/70 rounded-lg px-3 py-2 text-[12px] text-slate-100 placeholder:text-slate-600 ring-1 ring-white/10 focus:ring-cyan-400/50 outline-none resize-none"
          />

          <button
            type="button"
            onClick={addOpinion}
            disabled={!opinionText.trim()}
            className="mt-2 w-full py-2 rounded-lg text-[11px] text-cyan-100 bg-cyan-500/25 ring-1 ring-cyan-400/40 hover:bg-cyan-500/40 disabled:opacity-40 transition"
          >
            意見を追加する
          </button>

          {opinions.length > 0 && (
            <ul className="mt-2.5 space-y-1.5">
              {opinions.map((o) => {
                const h = HUMANS.find((x) => x.id === o.id)
                return (
                  <li key={o.id} className="panel p-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] font-bold ${h ? ACCENT[h.accent].text : 'text-slate-200'}`}
                      >
                        {o.name}
                      </span>
                      <span className="text-[9px] text-slate-600">{o.title}</span>
                      <button
                        type="button"
                        onClick={() => removeOpinion(o.id)}
                        className="ml-auto text-slate-600 hover:text-red-300 text-[11px]"
                        aria-label="この意見を削除"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">
                      {o.text}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel
          title={`参加するAI社員（${participants.length}人）`}
          action={<span className="text-[9px] text-slate-500">最大6人</span>}
        >
          <div className="scroll-box space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
            {data.staff.map((s) => {
              const on = selected.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleMember(s.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg ring-1 transition text-left ${
                    on ? 'ring-cyan-400/45 bg-cyan-400/10' : 'ring-white/10 hover:ring-white/25'
                  }`}
                >
                  <span
                    className={`w-4 h-4 shrink-0 rounded grid place-content-center ring-1 ${
                      on ? 'bg-cyan-400/25 ring-cyan-400/50 text-cyan-200' : 'ring-white/15 text-transparent'
                    }`}
                  >
                    <IconCheck className="w-3 h-3" />
                  </span>
                  <Avatar name={s.name} src={s.avatar} accent={s.accent} size={26} rounded="rounded-md" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] text-slate-100 truncate">{s.name}</span>
                    <span className="block text-[9px] text-slate-500 truncate">{s.role}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </Panel>

        <button
          type="button"
          onClick={() => void start()}
          disabled={running || !topic.trim() || participants.length < 2}
          className="w-full py-3 rounded-xl text-[13px] font-bold text-cyan-50 bg-cyan-500/30 ring-1 ring-cyan-400/50 hover:bg-cyan-500/45 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-glow"
        >
          {running ? '会議中です…' : '会議を開始する'}
        </button>
        {participants.length < 2 && (
          <p className="text-[10px] text-amber-300/80 text-center">AI社員を2人以上選んでください</p>
        )}
        {error && (
          <div className="text-[11px] text-amber-300 bg-amber-400/10 ring-1 ring-amber-400/30 rounded-lg px-3 py-2">
            <p>{error}</p>
            {detail && (
              <details className="mt-1.5">
                <summary className="text-[10px] text-amber-400/80 cursor-pointer">
                  詳しい内容を見る（原因を調べるとき用）
                </summary>
                <pre className="mt-1 text-[9px] text-slate-400 whitespace-pre-wrap break-all leading-relaxed">
                  {detail}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* ─────────── 中央：会議の様子 ─────────── */}
      <div className="xl:col-span-6 space-y-3">
        <Panel
          title={current ? `会議中：${current.topic}` : '会議ルーム'}
          action={
            current && (
              <span className="text-[9px] px-1.5 py-[2px] rounded ring-1 text-cyan-300 ring-cyan-400/30 bg-cyan-400/10">
                {current.provider}
              </span>
            )
          }
        >
          {/* 参加者の席 */}
          <div className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-white/10">
            {(current?.humanOpinions ?? opinions).map((o) => {
              const h = HUMANS.find((x) => x.id === o.id)
              const accent = h?.accent ?? 'cyan'
              return (
                <div
                  key={`seat-${o.id}`}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
                  style={{ boxShadow: `0 0 0 1px ${ACCENT[accent].hex}55` }}
                  title="人間メンバー"
                >
                  <span className="text-[11px]">🧑</span>
                  <span className={`text-[10px] ${ACCENT[accent].text}`}>{o.name}</span>
                </div>
              )
            })}
            {participants.map((p) => {
              const speaking =
                current && shownTurns > 0 && current.turns[shownTurns - 1]?.speaker.includes(p.name)
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ring-1 transition ${
                    speaking ? 'ring-cyan-400/60 bg-cyan-400/10 shadow-glow' : 'ring-white/10'
                  }`}
                >
                  <Avatar name={p.name} src={p.avatar} accent={p.accent} size={22} rounded="rounded-md" />
                  <span className="text-[10px] text-slate-200">{p.name}</span>
                </div>
              )
            })}
          </div>

          {/* 発言 */}
          <div ref={logRef} className="scroll-box space-y-3 min-h-[300px] max-h-[520px] overflow-y-auto pr-1">
            {!current && !running && (
              <div className="h-[300px] grid place-content-center text-center">
                <IconUsers className="w-8 h-8 text-slate-700 mx-auto" />
                <p className="text-[12px] text-slate-500 mt-2">
                  議題を入力して「会議を開始する」を押してください
                </p>
                <p className="text-[10px] text-slate-600 mt-1">
                  選んだAI社員が、それぞれの担当の立場から意見を出します
                </p>
              </div>
            )}

            {running && (
              <div className="h-[300px] grid place-content-center text-center">
                <span className="text-[24px] animate-pulseDot">💬</span>
                <p className="text-[12px] text-cyan-300 mt-2">AI社員が話し合っています…</p>
                <p className="text-[10px] text-slate-500 mt-1">10〜20秒ほどかかります</p>
              </div>
            )}

            {/* 人間メンバーの意見（会議の最初に置きます） */}
            {current &&
              (current.humanOpinions ?? []).map((o) => {
                const h = HUMANS.find((x) => x.id === o.id)
                const accent = h?.accent ?? 'cyan'
                return (
                  <div key={`op-${o.id}`} className="flex gap-2.5 animate-floatUp">
                    <div
                      className="w-[34px] h-[34px] shrink-0 rounded-xl grid place-content-center text-[13px] font-bold"
                      style={{
                        color: ACCENT[accent].hex,
                        background: `${ACCENT[accent].hex}22`,
                        boxShadow: `0 0 0 1px ${ACCENT[accent].hex}55`,
                      }}
                    >
                      人
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-2">
                        <span className={`text-[11px] font-bold ${ACCENT[accent].text}`}>{o.name}</span>
                        <span className="text-[9px] text-slate-600">{o.title}</span>
                        <span className="text-[8px] px-1.5 py-[1px] rounded bg-white/10 text-slate-400">
                          人間の意見
                        </span>
                      </p>
                      <div
                        className="mt-1 rounded-xl px-3 py-2 text-[12px] text-slate-100 leading-relaxed whitespace-pre-wrap"
                        style={{
                          background: `${ACCENT[accent].hex}14`,
                          boxShadow: `0 0 0 1px ${ACCENT[accent].hex}33`,
                        }}
                      >
                        {o.text}
                      </div>
                    </div>
                  </div>
                )
              })}

            {visibleTurns.map((turn, i) => {
              const st = speakerOf(turn.speaker)
              const accent = st?.accent ?? 'cyan'
              return (
                <div key={i} className="flex gap-2.5 animate-floatUp">
                  <Avatar name={turn.speaker} src={st?.avatar} accent={accent} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-baseline gap-2">
                      <span className={`text-[11px] font-bold ${ACCENT[accent].text}`}>{turn.speaker}</span>
                      {st && <span className="text-[9px] text-slate-600">{st.role}</span>}
                    </p>
                    <div className="mt-1 rounded-xl px-3 py-2 bg-white/[0.04] ring-1 ring-white/10 text-[12px] text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {turn.text}
                    </div>
                  </div>
                </div>
              )
            })}

            {current && !finished && (
              <p className="text-[11px] text-slate-500 pl-11">次の発言を待っています…</p>
            )}
          </div>

          {current && !finished && (
            <button
              type="button"
              onClick={() => setShownTurns(current.turns.length)}
              className="mt-2 w-full py-1.5 rounded-lg text-[11px] text-slate-400 ring-1 ring-white/10 hover:text-cyan-200 hover:ring-cyan-400/40 transition"
            >
              すべての発言をすぐ表示する
            </button>
          )}
        </Panel>

        {/* 議事録 */}
        {current && finished && (
          <Panel title="議事録">
            <p className="text-[12px] text-slate-200 leading-relaxed whitespace-pre-wrap">
              {current.summary}
            </p>

            {current.decisions.length > 0 && (
              <>
                <p className="mt-3 mb-1.5 text-[11px] text-slate-400">決定したこと</p>
                <ul className="space-y-1.5">
                  {current.decisions.map((d, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12px] text-slate-200">
                      <IconCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      {d}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {current.tasks.length > 0 && (
              <>
                <p className="mt-4 mb-1.5 text-[11px] text-slate-400">次にやること</p>
                <ul className="space-y-1.5">
                  {current.tasks.map((t, i) => {
                    const st = speakerOf(t.assignee)
                    const added = addedTasks.includes(t.title)
                    return (
                      <li key={i} className="panel px-2.5 py-2 flex items-center gap-2">
                        {st && <Avatar name={st.name} src={st.avatar} accent={st.accent} size={24} rounded="rounded-md" />}
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] text-slate-100 truncate">{t.title}</p>
                          <p className="text-[9px] text-slate-500">担当：{t.assignee}</p>
                        </div>
                        {account.canEdit && (
                          <button
                            type="button"
                            onClick={() => void registerTask(t.title, t.assignee, t.priority ?? 'normal')}
                            disabled={added}
                            className={`text-[10px] px-2 py-1 rounded-md ring-1 transition shrink-0 ${
                              added
                                ? 'text-emerald-300 ring-emerald-400/30 bg-emerald-400/10'
                                : 'text-cyan-200 ring-cyan-400/40 hover:bg-cyan-400/15'
                            }`}
                          >
                            {added ? '登録しました' : 'タスクに登録'}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
                {account.canEdit && (
                  <p className="mt-2 text-[9px] text-slate-600">
                    登録したタスクは、経営ダッシュボードの「タスク管理」に入ります
                  </p>
                )}
              </>
            )}
          </Panel>
        )}

        {/* 参加していない社員の意見 */}
        {current && finished && (
          <Panel
            title={`参加していないAI社員の意見（${
              data.staff.filter((st) => !current.participants.includes(st.id)).length
            }人）`}
            action={
              staffOpinions.length > 0 && (
                <div className="flex gap-1">
                  {(['all', 'concern'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setOpinionFilter(f)}
                      className={`text-[10px] px-2 py-1 rounded-md transition ${
                        opinionFilter === f
                          ? 'bg-cyan-400/15 text-cyan-200 ring-1 ring-cyan-400/40'
                          : 'text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      {f === 'all' ? 'すべて' : '懸念のみ'}
                    </button>
                  ))}
                </div>
              )
            }
          >
            {staffOpinions.length === 0 ? (
              <div className="text-center py-3">
                <p className="text-[11px] text-slate-400 mb-2.5 leading-relaxed">
                  この会議に出ていない社員にも、決まった内容への意見を聞けます。
                  見落としや反対意見が出てくることがあります。
                </p>
                <button
                  type="button"
                  onClick={() => void askEveryone()}
                  disabled={collecting}
                  className="px-4 py-2.5 rounded-lg text-[12px] font-bold text-cyan-50 bg-cyan-500/30 ring-1 ring-cyan-400/50 hover:bg-cyan-500/45 disabled:opacity-40 transition"
                >
                  {collecting ? '全員に意見を聞いています…（20〜40秒）' : '全員に意見を聞く'}
                </button>
              </div>
            ) : (
              <>
                {/* 集計 */}
                <div className="inner-grid grid grid-cols-3 gap-2 mb-3">
                  {([
                    ['agree', '賛成', 'text-emerald-300'],
                    ['conditional', '条件付き', 'text-amber-300'],
                    ['concern', '懸念あり', 'text-red-300'],
                  ] as const).map(([key, label, color]) => (
                    <div key={key} className="panel py-2 text-center">
                      <p className={`font-num text-[16px] font-bold ${color}`}>
                        {staffOpinions.filter((o) => o.stance === key).length}
                      </p>
                      <p className="text-[9px] text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>

                <ul className="scroll-box space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {staffOpinions
                    .filter((o) => opinionFilter === 'all' || o.stance === 'concern')
                    .map((o, i) => {
                      const st = speakerOf(o.name)
                      const accent = st?.accent ?? 'cyan'
                      const badge =
                        o.stance === 'agree'
                          ? ['賛成', 'text-emerald-300 ring-emerald-400/30 bg-emerald-400/10']
                          : o.stance === 'conditional'
                            ? ['条件付き', 'text-amber-300 ring-amber-400/30 bg-amber-400/10']
                            : ['懸念あり', 'text-red-300 ring-red-400/30 bg-red-400/10']
                      return (
                        <li key={`${o.name}-${i}`} className="panel p-2.5 flex gap-2.5">
                          <Avatar name={o.name} src={st?.avatar} accent={accent} size={30} rounded="rounded-lg" />
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2">
                              <span className={`text-[11px] font-bold ${ACCENT[accent].text}`}>{o.name}</span>
                              {st && <span className="text-[9px] text-slate-600 truncate">{st.role}</span>}
                              <span className={`ml-auto text-[9px] px-1.5 py-[1px] rounded ring-1 shrink-0 ${badge[1]}`}>
                                {badge[0]}
                              </span>
                            </p>
                            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed whitespace-pre-wrap">
                              {o.text}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                </ul>

                <p className="mt-2.5 text-[10px] text-slate-500">
                  集めた意見は会議記録に保存されています。過去の会議を開くと読み返せます。
                </p>
              </>
            )}
          </Panel>
        )}
      </div>

      {/* ─────────── 右：過去の会議 ─────────── */}
      <div className="xl:col-span-3 space-y-3">
        <Panel
          title={`過去の会議（${meetings.length}件）`}
          action={<MoreLink label="" />}
        >
          {meetings.length === 0 ? (
            <p className="text-[11px] text-slate-500 py-4 text-center">まだ会議の記録はありません</p>
          ) : (
            <ul className="scroll-box space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {meetings.map((m) => (
                <li key={m.id} className="panel panel-hover p-2.5">
                  <button type="button" onClick={() => openHistory(m)} className="w-full text-left">
                    <p className="text-[12px] text-slate-100 leading-snug">{m.topic}</p>
                    <p className="text-[9px] text-slate-500 mt-1 font-num">
                      {new Date(m.createdAt).toLocaleString('ja-JP')}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      {m.participants.slice(0, 5).map((pid) => {
                        const st = staffOf(pid)
                        return st ? (
                          <Avatar
                            key={pid}
                            name={st.name}
                            src={st.avatar}
                            accent={st.accent}
                            size={18}
                            rounded="rounded"
                          />
                        ) : null
                      })}
                      <span className="ml-auto text-[9px] text-slate-600">{m.turns.length}発言</span>
                    </div>
                  </button>
                  {account.canEdit && (
                    <button
                      type="button"
                      onClick={() => void deleteMeeting(m.id)}
                      className="mt-1.5 text-[9px] text-slate-600 hover:text-red-300 transition"
                    >
                      この記録を削除
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="会議ルームの使い方">
          <ul className="space-y-2 text-[11px] text-slate-400 leading-relaxed">
            <li className="flex gap-2">
              <IconSparkle className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
              議題を入れて、意見を聞きたいAI社員を2〜6人選びます
            </li>
            <li className="flex gap-2">
              <IconSparkle className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
              それぞれの担当の立場から意見が出るので、違う角度の視点が集まります
            </li>
            <li className="flex gap-2">
              <IconSparkle className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
              会議のあとに議事録・決定事項・次にやることが自動でまとまります
            </li>
            <li className="flex gap-2">
              <IconSparkle className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
              「タスクに登録」で、そのままタスク管理に入ります
            </li>
            <li className="flex gap-2">
              <IconSparkle className="w-3.5 h-3.5 text-cyan-300 shrink-0 mt-0.5" />
              人間メンバー（小林さん・高木さん・太田さん・中尾さん・シュンさん）の意見を先に入れると、
              AI社員がそれに名前を挙げて応答します
            </li>
          </ul>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">売上・予定・ライブ情報</span>
            <StateBadge text="AIが参照します" />
          </div>
        </Panel>
      </div>
    </div>
  )
}
