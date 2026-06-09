import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import { normalizeDateOnly } from './dateOnly'

export type AvailabilitySlot = {
  id: string
  start_at: string
  end_at: string
}

export type DayAvailabilityGroup = {
  dateKey: string
  label: string
  slots: { id: string; startLabel: string; endLabel: string }[]
}

export const MAX_DISPLAY_DAYS = 14
export const PROFILE_BROWSE_DAYS = 30

export function isoRangeForDateOnly(startDate: string, endDate: string) {
  const start = normalizeDateOnly(startDate) || startDate
  const end = normalizeDateOnly(endDate) || endDate
  const from = new Date(`${start}T00:00:00.000Z`).toISOString()
  const to = new Date(`${end}T23:59:59.999Z`).toISOString()
  return { from, to, start, end }
}

export function profileBrowseRange() {
  const today = new Date()
  const start = format(today, 'yyyy-MM-dd')
  const end = format(addDays(today, PROFILE_BROWSE_DAYS - 1), 'yyyy-MM-dd')
  return isoRangeForDateOnly(start, end)
}

export function countDaysInclusive(startDate: string, endDate: string) {
  const s = normalizeDateOnly(startDate)
  const e = normalizeDateOnly(endDate)
  if (!s || !e) return 0
  return differenceInCalendarDays(parseISO(e), parseISO(s)) + 1
}

export function capDisplayEndDate(startDate: string, endDate: string) {
  const total = countDaysInclusive(startDate, endDate)
  if (total <= MAX_DISPLAY_DAYS) {
    return { displayEnd: normalizeDateOnly(endDate) || endDate, truncated: false, totalDays: total }
  }
  const displayEnd = format(addDays(parseISO(normalizeDateOnly(startDate)!), MAX_DISPLAY_DAYS - 1), 'yyyy-MM-dd')
  return { displayEnd, truncated: true, totalDays: total }
}

export function groupSlotsByDay(slots: AvailabilitySlot[]): DayAvailabilityGroup[] {
  const byDay = new Map<string, AvailabilitySlot[]>()
  for (const slot of slots) {
    const key = normalizeDateOnly(slot.start_at) || format(new Date(slot.start_at), 'yyyy-MM-dd')
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(slot)
  }
  const keys = Array.from(byDay.keys()).sort()
  return keys.map((dateKey) => {
    const daySlots = byDay.get(dateKey)!.sort(
      (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
    )
    return {
      dateKey,
      label: format(parseISO(dateKey), 'EEEE, d MMMM yyyy'),
      slots: daySlots.map((s) => ({
        id: s.id,
        startLabel: format(new Date(s.start_at), 'h:mm a'),
        endLabel: format(new Date(s.end_at), 'h:mm a'),
      })),
    }
  })
}

export function summarizeAvailability(
  slots: AvailabilitySlot[],
  startDate: string,
  endDate: string
) {
  const totalDays = countDaysInclusive(startDate, endDate)
  const daysWithSlots = new Set(
    slots.map((s) => normalizeDateOnly(s.start_at) || '').filter(Boolean)
  ).size
  if (totalDays === 0) return { totalDays: 0, daysWithSlots: 0, label: 'Dates not set' }
  if (daysWithSlots === 0) {
    return {
      totalDays,
      daysWithSlots: 0,
      label: 'No calendar availability in this period',
    }
  }
  return {
    totalDays,
    daysWithSlots,
    label: `Available ${daysWithSlots} of ${totalDays} day${totalDays !== 1 ? 's' : ''}`,
  }
}

export function formatRangeLabel(startDate: string, endDate: string) {
  const s = normalizeDateOnly(startDate)
  const e = normalizeDateOnly(endDate)
  if (!s || !e) return ''
  return `${format(parseISO(s), 'd MMM yyyy')} – ${format(parseISO(e), 'd MMM yyyy')}`
}
