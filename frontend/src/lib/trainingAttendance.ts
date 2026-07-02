import { api } from '@/lib/api'
import { isDateInRange, normalizeDateOnly } from '@/lib/dateOnly'

export type AttendanceDayFull = {
  id: string
  session_date: string
  status: 'open' | 'pending_review' | 'approved' | 'disputed'
  expert_entry_at?: string | null
  expert_exit_at?: string | null
  effective_entry_at?: string | null
  effective_exit_at?: string | null
  dispute_reason?: string | null
  entry_attachment_url?: string | null
  exit_attachment_url?: string | null
}

export type AttendanceSummary = {
  daysApproved: number
  daysPending: number
  daysDisputed: number
  totalHoursApproved: number
  hoursBooked: number | null
  percentOfHoursBooked: number | null
}

export type AttendancePayload = {
  days: AttendanceDayFull[]
  summary: AttendanceSummary
  rangeSummary?: AttendanceSummary
  booking?: {
    status?: string
    start_date?: string | null
    end_date?: string | null
  }
  canMark?: boolean
  readOnly?: boolean
  role?: 'expert' | 'institution' | 'super_admin'
}

export const ACTIVE_ATTENDANCE_BOOKING_STATUSES = ['confirmed', 'in_progress']
export const TRAINING_ATTENDANCE_UPDATED_EVENT = 'training-attendance-updated'

export function notifyTrainingAttendanceUpdated(bookingId?: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(TRAINING_ATTENDANCE_UPDATED_EVENT, { detail: { bookingId } }))
}

export function normalizeBookingStatus(status: string | undefined | null) {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
}

export function canExpertMarkAttendance(bookingStatus: string | undefined | null) {
  return ACTIVE_ATTENDANCE_BOOKING_STATUSES.includes(normalizeBookingStatus(bookingStatus))
}

export function isTodayInTrainingRange(startDate: string | null | undefined, endDate: string | null | undefined) {
  return isDateInRange(new Date().toISOString().slice(0, 10), startDate, endDate)
}

export async function getTrainingAttendance(
  bookingId: string,
  range?: { from?: string; to?: string }
): Promise<AttendancePayload> {
  const res = (await api.trainingAttendance.get(bookingId, range)) as AttendancePayload
  return {
    ...res,
    days: Array.isArray(res.days) ? res.days : [],
  }
}

export async function ensureAttendanceDay(
  bookingId: string,
  days: AttendanceDayFull[] | undefined,
  sessionDate: string
): Promise<AttendanceDayFull> {
  const existing = days?.find((day) => normalizeDateOnly(day.session_date) === sessionDate)
  if (existing) return existing
  return (await api.trainingAttendance.createDay(bookingId, sessionDate)) as AttendanceDayFull
}

export async function markAttendanceEntryForDate(
  bookingId: string,
  days: AttendanceDayFull[] | undefined,
  sessionDate: string,
  attachment?: File | null
) {
  const day = await ensureAttendanceDay(bookingId, days, sessionDate)
  if (day.expert_entry_at && day.status !== 'disputed') {
    notifyTrainingAttendanceUpdated(bookingId)
    return { day, changed: false, alreadyMarked: true }
  }
  await api.trainingAttendance.markEntry(bookingId, day.id, attachment)
  notifyTrainingAttendanceUpdated(bookingId)
  return { day, changed: true, alreadyMarked: false }
}

export async function markAttendanceExitForDay(bookingId: string, dayId: string, attachment?: File | null) {
  const result = await api.trainingAttendance.markExit(bookingId, dayId, attachment)
  notifyTrainingAttendanceUpdated(bookingId)
  return result
}
