'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { AlertCircle, CalendarDays, CheckCircle2, Clock, LogIn, LogOut, MapPin, TimerReset, X } from 'lucide-react'
import { api } from '@/lib/api'
import { normalizeDateOnly } from '@/lib/dateOnly'
import { institutionDisplayName } from '@/lib/privacyDisplay'
import { isTrainingBooking } from '@/lib/trainingTypes'
import {
  canExpertMarkAttendance,
  getTrainingAttendance,
  isTodayInTrainingRange,
  markAttendanceEntryForDate,
  markAttendanceExitForDay,
  type AttendanceDayFull,
} from '@/lib/trainingAttendance'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type TrainingBooking = {
  id: string
  status?: string
  amount?: number | null
  hours_booked?: number | null
  start_date?: string | null
  end_date?: string | null
  project_id?: string
  institutions?: {
    id?: string
    name?: string
    logo_url?: string
  } | null
  projects?: {
    id?: string
    title?: string
    description?: string
    type?: string
    start_date?: string | null
    end_date?: string | null
    duration_hours?: number | null
    domain_expertise?: string | null
    required_expertise?: string[] | null
    subskills?: string[] | null
  } | null
}

type Props = {
  expertId?: string
  basePath: string
}

const ACTIVE_BOOKING_STATUSES = new Set(['confirmed', 'in_progress'])

function formatDate(value?: string | null) {
  const dateOnly = normalizeDateOnly(value)
  if (!dateOnly) return 'Date not set'
  return new Date(`${dateOnly}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function getProjectTypeLabel(type?: string | null) {
  return type?.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Training'
}

function formatTime(value?: string | null) {
  if (!value) return null
  return new Date(value).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizeBookingsPayload(payload: unknown): TrainingBooking[] {
  if (Array.isArray(payload)) return payload as TrainingBooking[]
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: TrainingBooking[] }).data
  }
  return []
}

function sortTrainingBookings(a: TrainingBooking, b: TrainingBooking) {
  const aInRange = isTodayInTrainingRange(a.start_date, a.end_date)
  const bInRange = isTodayInTrainingRange(b.start_date, b.end_date)
  if (aInRange !== bInRange) return aInRange ? -1 : 1
  return String(a.start_date || '').localeCompare(String(b.start_date || ''))
}

function statusText(booking: TrainingBooking, todayRow: AttendanceDayFull | null, todayInRange: boolean) {
  if (!todayInRange) return 'Not scheduled for today'
  if (!todayRow?.expert_entry_at) return 'Entry pending'
  if (!todayRow.expert_exit_at) return 'Entry marked'
  if (todayRow.status === 'pending_review') return 'Awaiting review'
  return 'Completed today'
}

function AttendanceActionCard({ booking, basePath }: { booking: TrainingBooking; basePath: string }) {
  const [days, setDays] = useState<AttendanceDayFull[]>([])
  const [todayRow, setTodayRow] = useState<AttendanceDayFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const today = new Date().toISOString().slice(0, 10)
  const project = booking.projects
  const projectUrl = booking.project_id || project?.id ? `${basePath}/project/${booking.project_id || project?.id}` : `${basePath}/dashboard`
  const todayInRange = isTodayInTrainingRange(booking.start_date, booking.end_date)
  const canMark = canExpertMarkAttendance(booking.status) && todayInRange
  const entryTime = formatTime(todayRow?.expert_entry_at)
  const exitTime = formatTime(todayRow?.expert_exit_at)

  const loadAttendance = useCallback(async () => {
    setLoading(true)
    try {
      const payload = await getTrainingAttendance(booking.id, { from: today, to: today })
      const rows = payload.days || []
      setDays(rows)
      setTodayRow(rows.find((day) => normalizeDateOnly(day.session_date) === today) || null)
    } catch (error) {
      console.error('Failed to load training attendance quick action:', error)
    } finally {
      setLoading(false)
    }
  }, [booking.id, today])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  const markEntry = async () => {
    setBusy(true)
    try {
      const result = await markAttendanceEntryForDate(booking.id, days, today)
      toast.success(result.alreadyMarked ? 'Entry already recorded' : 'Entry marked')
      await loadAttendance()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark entry')
    } finally {
      setBusy(false)
    }
  }

  const markExit = async () => {
    if (!todayRow) return
    setBusy(true)
    try {
      await markAttendanceExitForDay(booking.id, todayRow.id)
      toast.success('Exit marked - pending institution review')
      await loadAttendance()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to mark exit')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-[#DCDCDC] bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link href={projectUrl}>
            <h3 className="line-clamp-2 text-sm font-semibold text-[#000000] hover:text-[#008260]">
              {project?.title || 'Training requirement'}
            </h3>
          </Link>
          <p className="mt-1 line-clamp-1 text-xs text-[#6A6A6A]">
            {institutionDisplayName(booking.institutions) || 'Institution'}
          </p>
        </div>
        <Badge className="shrink-0 rounded-full bg-[#E8F4F8] text-[11px] font-semibold text-[#008260] hover:bg-[#E8F4F8]">
          {booking.status?.replace(/_/g, ' ') || 'selected'}
        </Badge>
      </div>

      <p className="mt-3 line-clamp-2 text-xs leading-5 text-[#6A6A6A]">
        {project?.description || 'Selected training requirement details will appear here.'}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md bg-[#F7FAFF] p-2">
          <div className="flex items-center gap-1 text-[#6A6A6A]">
            <CalendarDays className="h-3.5 w-3.5" />
            Window
          </div>
          <p className="mt-1 font-semibold text-[#000000]">
            {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
          </p>
        </div>
        <div className="rounded-md bg-[#F7FAFF] p-2">
          <div className="flex items-center gap-1 text-[#6A6A6A]">
            <Clock className="h-3.5 w-3.5" />
            Hours
          </div>
          <p className="mt-1 font-semibold text-[#000000]">{booking.hours_booked || project?.duration_hours || 'N/A'} hrs</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {project?.type && (
          <Badge variant="outline" className="rounded-full border-[#DCDCDC] text-[11px] text-[#444444]">
            {getProjectTypeLabel(project.type)}
          </Badge>
        )}
        {project?.domain_expertise && (
          <Badge variant="outline" className="rounded-full border-[#DCDCDC] text-[11px] text-[#444444]">
            {project.domain_expertise}
          </Badge>
        )}
      </div>

      <div className="mt-4 rounded-md border border-[#ECECEC] bg-[#FAFAFA] p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {todayRow?.expert_exit_at ? (
              <CheckCircle2 className="h-4 w-4 text-[#008260]" />
            ) : todayRow?.expert_entry_at ? (
              <TimerReset className="h-4 w-4 text-[#FF6A00]" />
            ) : (
              <AlertCircle className="h-4 w-4 text-[#92400E]" />
            )}
            <span className="text-xs font-semibold text-[#000000]">
              {loading ? 'Checking today...' : statusText(booking, todayRow, todayInRange)}
            </span>
          </div>
        </div>

        {(entryTime || exitTime) && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#6A6A6A]">
            {entryTime && <span>Entry: {entryTime}</span>}
            {exitTime && <span>Exit: {exitTime}</span>}
          </div>
        )}

        <div className="mt-3">
          {canMark && !todayRow?.expert_entry_at && (
            <Button
              type="button"
              size="sm"
              disabled={busy || loading}
              onClick={markEntry}
              className="w-full bg-[#008260] text-white hover:bg-[#006B4F]"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Mark entry
            </Button>
          )}
          {canMark && todayRow?.expert_entry_at && !todayRow?.expert_exit_at && (
            <Button
              type="button"
              size="sm"
              disabled={busy || loading}
              onClick={markExit}
              className="w-full bg-[#FF6A00] text-white hover:bg-[#E55F00]"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Mark exit
            </Button>
          )}
          {(!canMark || todayRow?.expert_exit_at) && (
            <Link href={projectUrl}>
              <Button type="button" size="sm" variant="outline" className="w-full border-[#008260] text-[#008260] hover:bg-[#008260]/10">
                View training
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

export function ExpertTrainingAttendanceSidebar({ expertId, basePath }: Props) {
  const [bookings, setBookings] = useState<TrainingBooking[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let ignore = false

    async function loadBookings() {
      if (!expertId) return
      setLoading(true)
      try {
        const payload = await api.bookings.getAll({ expert_id: expertId, page: 1, limit: 30 })
        const next = normalizeBookingsPayload(payload)
          .filter((booking) => isTrainingBooking(booking))
          .filter((booking) => ACTIVE_BOOKING_STATUSES.has(String(booking.status || '').toLowerCase()))
          .sort(sortTrainingBookings)
          .slice(0, 5)
        if (!ignore) setBookings(next)
      } catch (error) {
        console.error('Failed to load selected trainings:', error)
        if (!ignore) setBookings([])
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    loadBookings()

    return () => {
      ignore = true
    }
  }, [expertId])

  const activeTodayCount = useMemo(
    () => bookings.filter((booking) => isTodayInTrainingRange(booking.start_date, booking.end_date)).length,
    [bookings]
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-full border border-white/30 bg-[#008260] px-4 py-3 text-left text-white shadow-[0_18px_45px_rgba(0,130,96,0.35)] transition hover:bg-[#006B4F] focus:outline-none focus:ring-2 focus:ring-[#008260] focus:ring-offset-2 sm:bottom-7 sm:right-7"
        aria-label="Open training attendance"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
          {activeTodayCount > 0 ? <LogIn className="h-5 w-5" /> : <MapPin className="h-5 w-5" />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-5">
            {activeTodayCount > 0 ? 'Mark entry / exit' : 'Training attendance'}
          </span>
          <span className="block truncate text-xs text-white/85">
            {loading
              ? 'Checking trainings...'
              : activeTodayCount > 0
                ? `${activeTodayCount} scheduled today`
                : 'View selected trainings'}
          </span>
        </span>
        {activeTodayCount > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-bold text-[#008260]">
            {activeTodayCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
            aria-label="Close training attendance"
            onClick={() => setOpen(false)}
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-[#F7FAFF] shadow-2xl sm:w-[440px]">
            <div className="border-b border-[#DCDCDC] bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[#000000]">Training attendance</h2>
                  <p className="mt-1 text-sm text-[#6A6A6A]">Selected requirements that may need entry or exit today.</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full border-[#DCDCDC]"
                  onClick={() => setOpen(false)}
                  aria-label="Close training attendance"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-4 rounded-md bg-[#F7FAFF] p-3 text-sm">
                <span className="font-semibold text-[#008260]">{activeTodayCount}</span>
                <span className="text-[#6A6A6A]"> training{activeTodayCount === 1 ? '' : 's'} scheduled today</span>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {loading && (
                <div className="rounded-lg border border-[#ECECEC] bg-white p-4 text-sm text-[#6A6A6A]">
                  Loading selected trainings...
                </div>
              )}

              {!loading && bookings.length === 0 && (
                <div className="rounded-lg border border-dashed border-[#CFCFCF] bg-white p-4 text-sm text-[#6A6A6A]">
                  No active selected training requirements right now.
                </div>
              )}

              {!loading && bookings.map((booking) => (
                <AttendanceActionCard key={booking.id} booking={booking} basePath={basePath} />
              ))}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
