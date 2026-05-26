'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { api } from '@/lib/api'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TrainingAttendanceSummaryCards, type AttendanceSummary } from './TrainingAttendanceSummaryCards'
import { TrainingAttendanceCalendar, type AttendanceDay } from './TrainingAttendanceCalendar'
import {
  TrainingAttendanceDayDetail,
  type AttendanceDayFull,
} from './TrainingAttendanceDayDetail'

type Props = {
  bookingId: string
  startDate: string
  endDate: string
  hoursBooked?: number | null
  defaultExpanded?: boolean
}

type AttendancePayload = {
  days: AttendanceDayFull[]
  summary: AttendanceSummary
  booking?: { status?: string }
  canMark?: boolean
  readOnly?: boolean
  role?: 'expert' | 'institution' | 'super_admin'
}

export function TrainingAttendancePanel({
  bookingId,
  startDate,
  endDate,
  defaultExpanded = false,
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [data, setData] = useState<AttendancePayload | null>(null)
  const [month, setMonth] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(() => new Date())

  const range = useMemo(() => {
    const from = format(startOfMonth(month), 'yyyy-MM-dd')
    const to = format(endOfMonth(month), 'yyyy-MM-dd')
    return { from, to }
  }, [month])

  const load = useCallback(async () => {
    if (!bookingId) return
    setLoading(true)
    try {
      const res = (await api.trainingAttendance.get(bookingId, range)) as AttendancePayload
      setData(res)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load attendance')
    } finally {
      setLoading(false)
    }
  }, [bookingId, range])

  useEffect(() => {
    if (expanded) load()
  }, [expanded, load])

  const selectedDateStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null
  const selectedDayRow = useMemo(() => {
    if (!selectedDateStr || !data?.days) return null
    return data.days.find((d) => d.session_date === selectedDateStr) ?? null
  }, [data?.days, selectedDateStr])

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayRow = data?.days?.find((d) => d.session_date === todayStr)

  const ensureDay = async (sessionDate: string): Promise<AttendanceDayFull> => {
    const existing = data?.days?.find((d) => d.session_date === sessionDate)
    if (existing) return existing
    const created = await api.trainingAttendance.createDay(bookingId, sessionDate)
    return created as AttendanceDayFull
  }

  const refresh = async () => {
    await load()
  }

  const handleMarkEntryForDate = async (sessionDate: string) => {
    setBusy(true)
    try {
      const day = await ensureDay(sessionDate)
      if (day.expert_entry_at && day.status !== 'disputed') {
        toast.info('Entry already recorded')
        return
      }
      await api.trainingAttendance.markEntry(bookingId, day.id)
      toast.success('Entry marked')
      await refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark entry')
    } finally {
      setBusy(false)
    }
  }

  const handleMarkExitForDay = async (dayId: string) => {
    setBusy(true)
    try {
      await api.trainingAttendance.markExit(bookingId, dayId)
      toast.success('Exit marked — pending institution review')
      await refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark exit')
    } finally {
      setBusy(false)
    }
  }

  const role = data?.role || 'expert'
  const canMark = Boolean(data?.canMark)
  const readOnly = Boolean(data?.readOnly)
  const summary = data?.summary ?? {
    daysApproved: 0,
    daysPending: 0,
    daysDisputed: 0,
    totalHoursApproved: 0,
    hoursBooked: null,
    percentOfHoursBooked: null,
  }

  const showTodayQuickActions =
    role === 'expert' &&
    canMark &&
    !readOnly &&
    todayStr >= startDate &&
    todayStr <= endDate

  return (
    <div className="mt-4 rounded-xl border border-[#E8E8E8] bg-[#FAFAFA] overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#F5F5F5] transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        <span className="font-semibold text-[#000000] text-sm sm:text-base">Training attendance</span>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-[#6A6A6A]" />
        ) : (
          <ChevronDown className="h-5 w-5 text-[#6A6A6A]" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[#ECECEC] pt-4">
          <TrainingAttendanceSummaryCards
            summary={summary}
            bookingStatus={data?.booking?.status}
          />

          {showTodayQuickActions && (
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-white border border-[#DCDCDC]">
              <span className="text-sm text-[#6A6A6A] w-full sm:w-auto sm:mr-2">Today:</span>
              {!todayRow?.expert_entry_at && (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleMarkEntryForDate(todayStr)}
                  className="bg-[#008260] hover:bg-[#006B4F] text-white"
                >
                  <LogIn className="h-4 w-4 mr-1" />
                  Mark entry
                </Button>
              )}
              {todayRow?.expert_entry_at && !todayRow?.expert_exit_at && (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => handleMarkExitForDay(todayRow.id)}
                  className="bg-[#FF6A00] hover:bg-[#E55F00] text-white"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Mark exit
                </Button>
              )}
              {todayRow?.status === 'pending_review' && (
                <span className="text-sm text-[#92400E] self-center">Awaiting institution approval</span>
              )}
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-4">
            <TrainingAttendanceCalendar
              days={(data?.days || []) as AttendanceDay[]}
              startDate={startDate}
              endDate={endDate}
              month={month}
              onMonthChange={setMonth}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              loading={loading}
            />
            <TrainingAttendanceDayDetail
              day={selectedDayRow}
              sessionDate={selectedDateStr}
              role={role}
              canMark={canMark}
              readOnly={readOnly}
              busy={busy}
              onMarkEntry={() => selectedDateStr && handleMarkEntryForDate(selectedDateStr)}
              onMarkExit={() => selectedDayRow && handleMarkExitForDay(selectedDayRow.id)}
              onApprove={async () => {
                if (!selectedDayRow) return
                setBusy(true)
                try {
                  await api.trainingAttendance.approve(bookingId, selectedDayRow.id)
                  toast.success('Attendance approved')
                  await refresh()
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : 'Approve failed')
                } finally {
                  setBusy(false)
                }
              }}
              onDispute={async (reason) => {
                if (!selectedDayRow) return
                setBusy(true)
                try {
                  await api.trainingAttendance.dispute(bookingId, selectedDayRow.id, reason)
                  toast.success('Dispute submitted')
                  await refresh()
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : 'Dispute failed')
                } finally {
                  setBusy(false)
                }
              }}
              onEditTimes={async (entry, exit, approve) => {
                if (!selectedDayRow) return
                setBusy(true)
                try {
                  await api.trainingAttendance.editTimes(bookingId, selectedDayRow.id, {
                    effective_entry_at: entry,
                    effective_exit_at: exit,
                    approve,
                  })
                  toast.success('Times updated')
                  await refresh()
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : 'Update failed')
                } finally {
                  setBusy(false)
                }
              }}
              onCorrect={async (entry, exit) => {
                if (!selectedDayRow) return
                setBusy(true)
                try {
                  await api.trainingAttendance.correct(bookingId, selectedDayRow.id, {
                    expert_entry_at: entry,
                    expert_exit_at: exit,
                  })
                  toast.success('Resubmitted for review')
                  await refresh()
                } catch (e: unknown) {
                  toast.error(e instanceof Error ? e.message : 'Resubmit failed')
                } finally {
                  setBusy(false)
                }
              }}
            />
          </div>

          {readOnly && (
            <p className="text-xs text-[#6A6A6A] text-center">
              This booking is closed — attendance history is read-only.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
