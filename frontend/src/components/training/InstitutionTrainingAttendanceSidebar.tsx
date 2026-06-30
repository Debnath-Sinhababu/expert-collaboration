'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, CalendarCheck, CheckCircle2, Clock, ExternalLink, X } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { normalizeDateOnly } from '@/lib/dateOnly'
import { isTrainingBooking } from '@/lib/trainingTypes'
import {
  getTrainingAttendance,
  notifyTrainingAttendanceUpdated,
  TRAINING_ATTENDANCE_UPDATED_EVENT,
  type AttendanceDayFull,
  type AttendanceSummary,
} from '@/lib/trainingAttendance'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type TrainingBooking = {
  id: string
  status?: string
  start_date?: string | null
  end_date?: string | null
  hours_booked?: number | null
  project_id?: string | null
  projects?: {
    id?: string
    title?: string
    description?: string
    type?: string
    duration_hours?: number | null
  } | null
  experts?: {
    name?: string | null
    email?: string | null
  } | null
}

type ReviewBooking = {
  booking: TrainingBooking
  summary: AttendanceSummary
  pendingDays: AttendanceDayFull[]
}

type Props = {
  institutionId?: string
  basePath: string
}

const ACTIVE_BOOKING_STATUSES = new Set(['confirmed', 'in_progress'])

function normalizeBookingsPayload(payload: unknown): TrainingBooking[] {
  if (Array.isArray(payload)) return payload as TrainingBooking[]
  if (payload && typeof payload === 'object' && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: TrainingBooking[] }).data
  }
  return []
}

function formatDate(value?: string | null) {
  const dateOnly = normalizeDateOnly(value)
  if (!dateOnly) return 'Date not set'
  return new Date(`${dateOnly}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function InstitutionTrainingAttendanceSidebar({ institutionId, basePath }: Props) {
  const [items, setItems] = useState<ReviewBooking[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [approving, setApproving] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    if (!institutionId) return
    setLoading(true)
    try {
      const payload = await api.bookings.getAll({ institution_id: institutionId, page: 1, limit: 40 })
      const bookings = normalizeBookingsPayload(payload)
        .filter((booking) => isTrainingBooking(booking))
        .filter((booking) => ACTIVE_BOOKING_STATUSES.has(String(booking.status || '').toLowerCase()))

      const withSummaries = await Promise.all(
        bookings.map(async (booking) => {
          try {
            const attendance = await getTrainingAttendance(booking.id)
            const pendingDays = attendance.days.filter((day) => day.status === 'pending_review')
            return { booking, summary: attendance.summary, pendingDays }
          } catch {
            return null
          }
        })
      )

      setItems(
        withSummaries
          .filter((item): item is ReviewBooking => Boolean(item && item.summary.daysPending > 0))
          .slice(0, 5)
      )
    } catch (error) {
      console.error('Failed to load institution attendance review items:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [institutionId])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const refresh = () => load()
    window.addEventListener(TRAINING_ATTENDANCE_UPDATED_EVENT, refresh)
    window.addEventListener('focus', refresh)
    return () => {
      window.removeEventListener(TRAINING_ATTENDANCE_UPDATED_EVENT, refresh)
      window.removeEventListener('focus', refresh)
    }
  }, [load])

  const pendingCount = useMemo(
    () => items.reduce((sum, item) => sum + (item.summary.daysPending || 0), 0),
    [items]
  )

  const approveNextPendingDay = async (bookingId: string, dayId?: string) => {
    if (!dayId) return
    setApproving((current) => ({ ...current, [bookingId]: true }))
    try {
      await api.trainingAttendance.approve(bookingId, dayId)
      notifyTrainingAttendanceUpdated(bookingId)
      toast.success('Attendance approved')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to approve attendance')
    } finally {
      setApproving((current) => ({ ...current, [bookingId]: false }))
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 left-5 z-40 flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-full border border-white/30 bg-[#008260] px-4 py-3 text-left text-white shadow-[0_18px_45px_rgba(0,130,96,0.35)] transition hover:bg-[#006B4F] focus:outline-none focus:ring-2 focus:ring-[#008260] focus:ring-offset-2 sm:bottom-7 sm:left-7"
        aria-label="Open attendance review"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15">
          {pendingCount > 0 ? <AlertCircle className="h-5 w-5" /> : <CalendarCheck className="h-5 w-5" />}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-5">
            {pendingCount > 0 ? 'Confirm attendance' : 'Attendance review'}
          </span>
          <span className="block truncate text-xs text-white/85">
            {loading ? 'Checking attendance...' : pendingCount > 0 ? `${pendingCount} pending review` : 'No pending review'}
          </span>
        </span>
        {pendingCount > 0 && (
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-bold text-[#008260]">
            {pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
            aria-label="Close attendance review"
            onClick={() => setOpen(false)}
          />

          <aside className="absolute left-0 top-0 flex h-full w-full max-w-lg flex-col bg-[#F7FAFF] shadow-2xl sm:w-[520px]">
            <div className="border-b border-[#DCDCDC] bg-white px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFF7ED] text-[#B45309]">
                      <AlertCircle className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-[#000000]">Attendance review</h2>
                      <p className="text-sm text-[#6A6A6A]">Priority queue for training confirmations.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-[#FED7AA] bg-[#FFF7ED] p-3">
                      <p className="text-xs font-medium text-[#92400E]">Pending days</p>
                      <p className="mt-1 text-2xl font-bold text-[#92400E]">{pendingCount}</p>
                    </div>
                    <div className="rounded-lg border border-[#BFE3D8] bg-[#E8F5F1] p-3">
                      <p className="text-xs font-medium text-[#008260]">Requirements</p>
                      <p className="mt-1 text-2xl font-bold text-[#008260]">{items.length}</p>
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-full border-[#DCDCDC]"
                  onClick={() => setOpen(false)}
                  aria-label="Close attendance review"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {loading && (
                <div className="rounded-lg border border-[#ECECEC] bg-white p-4 text-sm text-[#6A6A6A]">
                  Loading attendance review...
                </div>
              )}

              {!loading && items.length === 0 && (
                <div className="rounded-lg border border-dashed border-[#CFCFCF] bg-white p-4 text-sm text-[#6A6A6A]">
                  No training attendance is waiting for confirmation.
                </div>
              )}

              {!loading && items.map(({ booking, summary, pendingDays }) => {
                const projectId = booking.project_id || booking.projects?.id
                const projectHref = projectId ? `${basePath}/dashboard/project/${projectId}` : `${basePath}/dashboard`
                const nextPendingDay = pendingDays[0]
                const isApproving = Boolean(approving[booking.id])
                return (
                  <div key={booking.id} className="rounded-xl border border-[#DCDCDC] bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-sm font-semibold text-[#000000]">
                          {booking.projects?.title || 'Training requirement'}
                        </h3>
                        <p className="mt-1 text-xs text-[#6A6A6A]">
                          Expert: {booking.experts?.name || booking.experts?.email || 'Assigned expert'}
                        </p>
                      </div>
                      <Badge className="shrink-0 rounded-full bg-[#FFF7ED] text-[11px] font-semibold text-[#92400E] hover:bg-[#FFF7ED]">
                        {summary.daysPending} pending
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-[#F7FAFF] p-3">
                        <div className="flex items-center gap-1 text-[#6A6A6A]">
                          <Clock className="h-3.5 w-3.5" />
                          Window
                        </div>
                        <p className="mt-1 font-semibold text-[#000000]">
                          {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-[#F7FAFF] p-3">
                        <div className="text-[#6A6A6A]">Hours approved</div>
                        <p className="mt-1 font-semibold text-[#000000]">
                          {summary.totalHoursApproved}h{summary.hoursBooked != null ? ` / ${summary.hoursBooked}h` : ''}
                        </p>
                      </div>
                    </div>

                    {nextPendingDay && (
                      <div className="mt-3 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] p-3">
                        <p className="text-xs font-semibold text-[#92400E]">Next pending day</p>
                        <p className="mt-1 text-sm font-semibold text-[#000000]">
                          {formatDate(nextPendingDay.session_date)}
                        </p>
                        <p className="mt-1 text-xs text-[#6A6A6A]">
                          Entry and exit are submitted. Approve now, or open the full project to edit times/dispute.
                        </p>
                      </div>
                    )}

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isApproving || !nextPendingDay}
                        onClick={() => approveNextPendingDay(booking.id, nextPendingDay?.id)}
                        className="bg-[#008260] text-white hover:bg-[#006B4F]"
                      >
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        {isApproving ? 'Approving...' : 'Approve next day'}
                      </Button>
                      <Link href={projectHref}>
                        <Button type="button" variant="outline" size="sm" className="w-full border-[#008260] text-[#008260] hover:bg-[#008260]/10">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Full details
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
