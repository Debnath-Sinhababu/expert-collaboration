'use client'

import { useMemo } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, isWithinInterval, startOfDay } from 'date-fns'
import { normalizeDateOnly } from '@/lib/dateOnly'
import 'react-day-picker/style.css'

function parseLocalDateOnly(value: string): Date {
  const d = normalizeDateOnly(value)
  if (!d) return startOfDay(new Date())
  const [y, m, day] = d.split('-').map(Number)
  return startOfDay(new Date(y, m - 1, day))
}

export type AttendanceDay = {
  id: string
  session_date: string
  status: 'open' | 'pending_review' | 'approved' | 'disputed'
}

type Props = {
  days: AttendanceDay[]
  startDate: string
  endDate: string
  month: Date
  onMonthChange: (d: Date) => void
  selectedDay?: Date
  onSelectDay: (d: Date | undefined) => void
  loading?: boolean
}

export function TrainingAttendanceCalendar({
  days,
  startDate,
  endDate,
  month,
  onMonthChange,
  selectedDay,
  onSelectDay,
  loading,
}: Props) {
  const statusByDate = useMemo(() => {
    const map = new Map<string, AttendanceDay['status']>()
    days.forEach((d) => {
      const key = normalizeDateOnly(d.session_date)
      if (key) map.set(key, d.status)
    })
    return map
  }, [days])

  const rangeStart = useMemo(() => parseLocalDateOnly(startDate), [startDate])
  const rangeEnd = useMemo(() => parseLocalDateOnly(endDate), [endDate])

  const disabled = (date: Date) => {
    const d = startOfDay(date)
    return d < rangeStart || d > rangeEnd
  }

  const modifierFns = useMemo(
    () => ({
      approved: (date: Date) => statusByDate.get(format(date, 'yyyy-MM-dd')) === 'approved',
      pending: (date: Date) => statusByDate.get(format(date, 'yyyy-MM-dd')) === 'pending_review',
      disputed: (date: Date) => statusByDate.get(format(date, 'yyyy-MM-dd')) === 'disputed',
      open: (date: Date) => statusByDate.get(format(date, 'yyyy-MM-dd')) === 'open',
    }),
    [statusByDate]
  )

  return (
    <div className="rounded-xl border border-[#DCDCDC] bg-white p-4">
      <div className="flex flex-wrap gap-3 mb-3 text-xs text-[#6A6A6A]">
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#008260]" /> Approved
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" /> Pending
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626]" /> Disputed
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" /> Open
        </span>
      </div>
      <DayPicker
        mode="single"
        selected={selectedDay}
        onSelect={onSelectDay}
        month={month}
        onMonthChange={onMonthChange}
        disabled={disabled}
        modifiers={modifierFns}
        modifiersClassNames={{
          approved: '!bg-[#D1FAE5] !text-[#065F46] font-semibold rounded-md',
          pending: '!bg-[#FEF3C7] !text-[#92400E] font-semibold rounded-md',
          disputed: '!bg-[#FEE2E2] !text-[#991B1B] font-semibold rounded-md',
          open: '!bg-[#DBEAFE] !text-[#1E40AF] font-semibold rounded-md',
        }}
      />
      {loading && <p className="text-xs text-[#6A6A6A] mt-2">Loading attendance…</p>}
      {selectedDay &&
        isWithinInterval(startOfDay(selectedDay), { start: rangeStart, end: rangeEnd }) && (
          <p className="text-xs text-[#6A6A6A] mt-2">
            Training window: {format(rangeStart, 'd MMM yyyy')} – {format(rangeEnd, 'd MMM yyyy')}
          </p>
        )}
    </div>
  )
}
