import type { AiStaff } from '../types'
import { Avatar } from './Avatar'
import { ACCENT, StatusDot } from './Ui'

/* ============================================================
   AI社員カード
   ============================================================ */

const STATUS_TEXT: Record<AiStaff['status'], string> = {
  active: '稼働中',
  standby: '待機中',
  maintenance: 'メンテ中',
}

export function StaffCard({ staff, onSelect }: { staff: AiStaff; onSelect?: (s: AiStaff) => void }) {
  const a = ACCENT[staff.accent]
  return (
    <button
      type="button"
      onClick={() => onSelect?.(staff)}
      className="panel panel-hover text-left w-full px-3 py-2.5 flex items-center gap-3 group"
    >
      <Avatar name={staff.name} src={staff.avatar} accent={staff.accent} size={46} />
      <div className="min-w-0 flex-1">
        <p className={`text-[13px] font-bold text-slate-100 truncate group-hover:${a.text}`}>{staff.name}</p>
        {staff.nameEn && <p className="text-[9px] text-slate-500 truncate">{staff.nameEn}</p>}
        <p className="text-[10px] text-slate-400 truncate">{staff.role}</p>
        <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-300">
          <StatusDot tone={staff.status === 'active' ? 'green' : staff.status === 'standby' ? 'amber' : 'red'} />
          <span className={staff.status === 'active' ? '' : 'text-amber-300'}>{STATUS_TEXT[staff.status]}</span>
          <span className="ml-auto text-slate-500">タスク {staff.tasks}件</span>
        </p>
      </div>
    </button>
  )
}
