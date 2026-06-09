'use client'

import { Clock, CalendarCheck, AlertCircle, TrendingUp } from 'lucide-react'

export type AttendanceSummary = {
  daysApproved: number
  daysPending: number
  daysDisputed: number
  daysOpen?: number
  totalHoursApproved: number
  hoursBooked: number | null
  percentOfHoursBooked: number | null
}

type Props = {
  summary: AttendanceSummary
  bookingStatus?: string
}

export function TrainingAttendanceSummaryCards({ summary, bookingStatus }: Props) {
  const progress =
    summary.percentOfHoursBooked != null ? `${summary.percentOfHoursBooked}%` : '—'

  const cards = [
    {
      label: 'Days approved',
      value: String(summary.daysApproved),
      icon: CalendarCheck,
      accent: '#008260',
      bg: '#ECF2FF',
    },
    {
      label: 'Hours delivered',
      value: `${summary.totalHoursApproved}h`,
      sub: summary.hoursBooked != null ? `of ${summary.hoursBooked}h planned` : undefined,
      icon: Clock,
      accent: '#008260',
      bg: '#ECF2FF',
    },
    {
      label: 'Pending review',
      value: String(summary.daysPending),
      icon: AlertCircle,
      accent: '#B45309',
      bg: '#FFF7ED',
    },
    {
      label: 'Progress',
      value: progress,
      sub: bookingStatus ? `Booking: ${bookingStatus.replace('_', ' ')}` : undefined,
      icon: TrendingUp,
      accent: '#FF6A00',
      bg: '#FFF1E7',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-[#E8E8E8] bg-white p-4 flex items-start gap-3"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: c.bg }}
          >
            <c.icon className="w-5 h-5" style={{ color: c.accent }} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-[#717171]">{c.label}</p>
            <p className="text-lg font-semibold text-[#000000] truncate">{c.value}</p>
            {c.sub && <p className="text-xs text-[#6A6A6A] truncate">{c.sub}</p>}
          </div>
        </div>
      ))}
      {summary.daysDisputed > 0 && (
        <div className="col-span-2 lg:col-span-4 rounded-lg bg-[#FFF2F2] border border-[#FECACA] px-4 py-2 text-sm text-[#9B0000]">
          {summary.daysDisputed} day{summary.daysDisputed !== 1 ? 's' : ''} disputed — expert action or
          institution review required.
        </div>
      )}
    </div>
  )
}
