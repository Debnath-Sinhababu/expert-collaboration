export function formatInterviewDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  const datePart = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return `${datePart}, ${formatTime12Hour(date)}`
}

export function formatInterviewSlotRange(slot: { start_at: string; end_at: string }): string {
  const start = new Date(slot.start_at)
  const end = new Date(slot.end_at)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-'

  const datePart = start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return `${datePart}, ${formatTime12Hour(start)} - ${formatTime12Hour(end)}`
}

function formatTime12Hour(date: Date): string {
  let hours = date.getHours()
  const minutes = date.getMinutes()
  const period = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12 || 12

  if (minutes === 0) {
    return `${hours} ${period}`
  }

  const minuteStr = String(minutes).padStart(2, '0')
  return `${hours}:${minuteStr} ${period}`
}

export function datetimeLocalToIso(value?: string | null): string | null {
  if (!value?.trim()) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}
