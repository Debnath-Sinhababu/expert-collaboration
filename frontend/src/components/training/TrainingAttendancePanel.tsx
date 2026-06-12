'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { api } from '@/lib/api'
import { isDateInRange, normalizeDateOnly } from '@/lib/dateOnly'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, LogIn, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TrainingAttendanceCalendar, type AttendanceDay } from './TrainingAttendanceCalendar'
import {
  TrainingAttendanceDayDetail,
  type AttendanceDayFull,
} from './TrainingAttendanceDayDetail'
import { TrainingAttendanceSummaryCards } from './TrainingAttendanceSummaryCards'
import {
  canExpertMarkAttendance,
  getTrainingAttendance,
  markAttendanceEntryForDate,
  markAttendanceExitForDay,
  normalizeBookingStatus,
  type AttendancePayload,
} from '@/lib/trainingAttendance'

type Props = {
  bookingId: string
  startDate: string
  endDate: string
  hoursBooked?: number | null
  bookingStatus?: string
  /** Who is viewing this panel — drives which actions show before/after API load */
  expectedViewerRole: 'expert' | 'institution'
  defaultExpanded?: boolean
}

export function TrainingAttendancePanel({
  bookingId,
  startDate,
  endDate,
  bookingStatus,
  expectedViewerRole,
  defaultExpanded = false,
}: Props) {
  const rangeStart = normalizeDateOnly(startDate) || startDate
  const rangeEnd = normalizeDateOnly(endDate) || endDate
  const st = normalizeBookingStatus(bookingStatus)
  const bookingAllowsMark = canExpertMarkAttendance(st)

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
      setData(await getTrainingAttendance(bookingId, range))
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
    return (
      data.days.find((d) => normalizeDateOnly(d.session_date) === selectedDateStr) ?? null
    )
  }, [data?.days, selectedDateStr])

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const todayRow = data?.days?.find((d) => normalizeDateOnly(d.session_date) === todayStr)

  const apiStart = normalizeDateOnly(data?.booking?.start_date)
  const apiEnd = normalizeDateOnly(data?.booking?.end_date)
  /** Prefer dates returned by the API so the calendar matches server validation */
  const calendarStart = apiStart || rangeStart
  const calendarEnd = apiEnd || rangeEnd

  const refresh = async () => {
    await load()
  }

  const handleMarkEntryForDate = async (sessionDate: string) => {
    setBusy(true)
    try {
      const result = await markAttendanceEntryForDate(bookingId, data?.days, sessionDate)
      if (result.alreadyMarked) {
        toast.info('Entry already recorded')
        return
      }
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
      await markAttendanceExitForDay(bookingId, dayId)
      toast.success('Exit marked — pending institution review')
      await refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark exit')
    } finally {
      setBusy(false)
    }
  }

  // Lock role by page context so a brief/wrong API payload cannot hide expert actions or show them to institutions.
  const role: 'expert' | 'institution' | 'super_admin' =
    expectedViewerRole === 'expert'
      ? 'expert'
      : data?.role === 'super_admin'
        ? 'super_admin'
        : 'institution'

  const readOnly =
    data != null
      ? Boolean(data.readOnly)
      : st
        ? ['completed', 'cancelled'].includes(st)
        : false

  // Experts: trust booking card status for marking (same source as the list). API canMark can be wrong during rollout / edge cases.
  const expertCanMark = expectedViewerRole === 'expert' && bookingAllowsMark && !readOnly
  const canMark = expectedViewerRole === 'expert' ? expertCanMark : Boolean(data?.canMark)
  const summary = data?.summary ?? {
    daysApproved: 0,
    daysPending: 0,
    daysDisputed: 0,
    totalHoursApproved: 0,
    hoursBooked: null,
    percentOfHoursBooked: null,
  }

  const todayInRange = isDateInRange(todayStr, calendarStart, calendarEnd)
  const showTodayQuickActions =
    role === 'expert' && canMark && todayInRange

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

          {expectedViewerRole === 'institution' && !readOnly && summary.daysPending > 0 && (
            <p className="text-sm text-[#92400E] bg-[#FFF7ED] border border-[#FED7AA] rounded-lg px-3 py-2">
              {summary.daysPending} day{summary.daysPending !== 1 ? 's' : ''} waiting for your review. Select each
              highlighted day on the calendar, then use Approve, Edit times, or Dispute.
            </p>
          )}

          {role === 'expert' && canMark && !todayInRange && (
            <p className="text-sm text-[#92400E] bg-[#FFF7ED] border border-[#FED7AA] rounded-lg px-3 py-2">
              Today is outside this booking&apos;s training window ({calendarStart} – {calendarEnd}). Select an
              in-range day on the calendar to mark entry.
            </p>
          )}

          {data && !canMark && !readOnly && role === 'expert' && (
            <p className="text-sm text-[#6A6A6A]">
              Attendance marking is not available for this booking status.
            </p>
          )}

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
              startDate={calendarStart}
              endDate={calendarEnd}
              month={month}
              onMonthChange={setMonth}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              loading={loading}
            />
            <TrainingAttendanceDayDetail
              day={selectedDayRow}
              sessionDate={selectedDateStr}
              rangeStart={calendarStart}
              rangeEnd={calendarEnd}
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
