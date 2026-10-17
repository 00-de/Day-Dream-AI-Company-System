import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../lib/firebase'
import { useAuth } from '../lib/auth'
import { Panel, ACCENT, StateBadge } from './Ui'
import { Avatar } from './Avatar'
import { useData } from '../lib/data'
import { IconCheck } from './Icons'

/* ============================================================
   自動で作られたレポート（悠真AIが毎朝つくります）

   GitHub Actions が決まった時刻にAPIを呼び、
   その結果がここに並びます。社長は読むだけです。
   ============================================================ */

interface AutoReport {
  id: string
  spanLabel: string
  headline: string
  mood: 'good' | 'normal' | 'warn'
  summary: string
  progress: string[]
  concerns: string[]
  decisions: string[]
  tomorrow: string[]
  createdAt: string
}

const MOOD = {
  good: ['順調です', 'text-emerald-300 ring-emerald-400/40 bg-emerald-400/10', '🌤'],
  normal: ['ふつうに進行中', 'text-cyan-300 ring-cyan-400/40 bg-cyan-400/10', '📋'],
  warn: ['気をつけたい点があります', 'text-amber-300 ring-amber-400/40 bg-amber-400/10', '⚠️'],
} as const

export function AutoReportPanel() {
  const { data } = useData()
  const { user } = useAuth()
  const [reports, setReports] = useState<AutoReport[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const yuma = data.staff.find((s) => s.id === 'yuma')

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user) return
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(10))
    const unsub = onSnapshot(
      q,
      (snap) => setReports(snap.docs.map((d) => ({ ...(d.data() as AutoReport), id: d.id }))),
      () => undefined,
    )
    return unsub
  }, [user])

  const latest = reports[0]

  return (
    <Panel
      title="自動レポート"
      action={
        <span className="flex items-center gap-1.5">
          {yuma && <span className={`text-[10px] ${ACCENT[yuma.accent].text}`}>{yuma.name}</span>}
          <StateBadge text="毎朝7時に自動作成" />
        </span>
      }
    >
      {!latest ? (
        <div className="text-center py-5">
          {yuma && <Avatar name={yuma.name} src={yuma.avatar} accent={yuma.accent} size={44} />}
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            まだレポートがありません。
            <br />
            毎朝7時に、悠真AIが前日の状況をまとめます。
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* 最新のレポート */}
          <div className={`rounded-lg px-3 py-2.5 ring-1 ${MOOD[latest.mood][1]}`}>
            <p className="text-[10px] opacity-80 font-num">
              {latest.spanLabel}・{new Date(latest.createdAt).toLocaleString('ja-JP')}
            </p>
            <p className="text-[13px] font-bold flex items-center gap-2 mt-1">
              <span>{MOOD[latest.mood][2]}</span>
              {latest.headline}
            </p>
            <p className="text-[11px] mt-1 opacity-90 leading-relaxed">{latest.summary}</p>
          </div>

          {[
            ['進んだこと', latest.progress, 'text-emerald-400'],
            ['気になること', latest.concerns, 'text-amber-400'],
            ['判断してほしいこと', latest.decisions, 'text-cyan-400'],
            ['今日やること', latest.tomorrow, 'text-slate-400'],
          ].map(([title, list, color]) =>
            (list as string[]).length > 0 ? (
              <div key={title as string} className="panel p-2.5">
                <p className="text-[10px] text-slate-400 mb-1.5">{title as string}</p>
                <ul className="space-y-1">
                  {(list as string[]).map((x, i) => (
                    <li key={i} className="flex gap-1.5 text-[11px] text-slate-200 leading-relaxed">
                      <IconCheck className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${color as string}`} />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}

          {/* 過去のレポート */}
          {reports.length > 1 && (
            <div className="pt-2 border-t border-white/10">
              <p className="text-[10px] text-slate-500 mb-1.5">過去のレポート</p>
              <ul className="space-y-1">
                {reports.slice(1).map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(openId === r.id ? null : r.id)}
                      className="w-full text-left panel px-2.5 py-1.5 panel-hover"
                    >
                      <p className="text-[11px] text-slate-200 truncate">{r.headline}</p>
                      <p className="text-[9px] text-slate-500 font-num">
                        {r.spanLabel}・{new Date(r.createdAt).toLocaleDateString('ja-JP')}
                      </p>
                    </button>
                    {openId === r.id && (
                      <p className="mt-1 px-2.5 text-[11px] text-slate-300 leading-relaxed">{r.summary}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Panel>
  )
}
