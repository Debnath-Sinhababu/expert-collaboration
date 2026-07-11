export type CompletionHistoryEntry = {
  at: string
  actor: 'expert' | 'institution' | 'system'
  action: string
  note?: string | null
  approved_hours?: number | null
  hours_booked?: number | null
  low_attendance?: boolean | null
}

export type CompletionHistoryDetailLine = { label: string; value: string }

export function formatCompletionHistoryEntry(entry: CompletionHistoryEntry): {
  title: string
  details: CompletionHistoryDetailLine[]
  who: string
  tone: 'neutral' | 'expert' | 'institution' | 'success'
} {
  const who =
    entry.actor === 'expert'
      ? 'Expert'
      : entry.actor === 'institution'
        ? 'Institution'
        : 'System'
  const note = entry.note?.trim() || ''
  const noteDetails: CompletionHistoryDetailLine[] = note
    ? [{ label: 'Note', value: note }]
    : []

  const attendanceDetails: CompletionHistoryDetailLine[] = []
  if (entry.approved_hours != null && entry.hours_booked != null && Number(entry.hours_booked) > 0) {
    attendanceDetails.push({
      label: 'Approved attendance',
      value: `${entry.approved_hours}h of ${entry.hours_booked}h planned`,
    })
  }
  if (entry.low_attendance) {
    attendanceDetails.push({
      label: 'Flag',
      value: 'Requested with attendance below 80% of planned hours',
    })
  }

  const withLines = (
    title: string,
    tone: 'neutral' | 'expert' | 'institution' | 'success',
    fallback?: CompletionHistoryDetailLine
  ) => ({
    who,
    tone,
    title,
    details: [
      ...attendanceDetails,
      ...(noteDetails.length ? noteDetails : fallback ? [fallback] : []),
    ],
  })

  switch (entry.action) {
    case 'request_completion':
      return withLines('Expert requested completion', 'expert', {
        label: 'Status',
        value: 'Waiting for institution approval',
      })
    case 'approve_completion':
      return withLines('Institution approved the completion request', 'success', {
        label: 'Status',
        value: 'Booking marked completed',
      })
    case 'decline_completion':
      return withLines('Institution declined the completion request', 'institution', {
        label: 'Status',
        value: 'Booking returned to in progress',
      })
    case 'institution_mark_completed':
      return withLines('Institution marked the booking completed', 'success', {
        label: 'Status',
        value: 'Closed without an expert completion request',
      })
    default: {
      const readable = String(entry.action || 'update').replace(/_/g, ' ')
      return withLines(`${who} updated completion status`, 'neutral', {
        label: 'Action',
        value: readable,
      })
    }
  }
}
