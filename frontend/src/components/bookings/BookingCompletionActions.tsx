'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import {
  formatCompletionHistoryEntry,
  type CompletionHistoryEntry,
} from '@/lib/bookingCompletion'
import { CheckCircle, XCircle } from 'lucide-react'

type BookingLike = {
  id: string
  status?: string
  hours_booked?: number | null
  completion_note?: string | null
  completion_requested_at?: string | null
  completion_decision_note?: string | null
  completion_history?: CompletionHistoryEntry[] | null
  application_id?: string | null
}

type Props = {
  booking: BookingLike
  role: 'expert' | 'institution'
  onUpdated?: (booking?: any) => void | Promise<void>
  /** Institution: after approve, optionally open rating */
  onApproved?: (booking: any) => void
  /** Institution: cancel/delete booking control (unchanged) */
  showInstitutionCancel?: boolean
  onInstitutionCancel?: () => void
}

function CompletionHistoryTimeline({ history }: { history: CompletionHistoryEntry[] }) {
  if (!history.length) return null

  return (
    <div className="w-full border-t border-[#E8E8E8] pt-3 mt-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6A6A6A] mb-3">
        Completion history
      </p>
      <ol className="relative max-h-64 space-y-0 overflow-y-auto border-l border-[#E5E7EB] ml-2 pl-4 pr-1">
        {history
          .slice()
          .reverse()
          .map((entry, idx) => {
            const formatted = formatCompletionHistoryEntry(entry)
            const when = entry.at
              ? new Date(entry.at).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })
              : ''
            const toneClass =
              formatted.tone === 'success'
                ? 'bg-emerald-500'
                : formatted.tone === 'expert'
                  ? 'bg-amber-500'
                  : formatted.tone === 'institution'
                    ? 'bg-[#008260]'
                    : 'bg-slate-400'
            const badgeClass =
              formatted.tone === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : formatted.tone === 'expert'
                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                  : formatted.tone === 'institution'
                    ? 'bg-[#E8F5F1] text-[#006B4F] border-[#BFE3D8]'
                    : 'bg-slate-50 text-slate-700 border-slate-200'

            return (
              <li key={`${entry.at}-${entry.action}-${idx}`} className="relative pb-4 last:pb-0">
                <span
                  className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${toneClass}`}
                />
                <div className="rounded-lg border border-[#ECECEC] bg-[#FAFAFA] p-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}
                    >
                      {formatted.who}
                    </span>
                    {when && <span className="text-[11px] text-[#9CA3AF]">{when}</span>}
                  </div>
                  <p className="text-sm font-medium text-[#111827] leading-snug">{formatted.title}</p>
                  {formatted.details.length > 0 && (
                    <dl className="mt-1.5 space-y-0.5 text-xs text-[#6B7280]">
                      {formatted.details.map((line) => (
                        <div key={`${line.label}-${line.value}`} className="leading-relaxed">
                          <dt className="inline font-medium text-[#4B5563]">{line.label}:</dt>{' '}
                          <dd className="inline">{line.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </li>
            )
          })}
      </ol>
    </div>
  )
}

export function BookingCompletionActions({
  booking,
  role,
  onUpdated,
  onApproved,
  showInstitutionCancel = false,
  onInstitutionCancel,
}: Props) {
  const [localBooking, setLocalBooking] = useState(booking)
  const [submitting, setSubmitting] = useState(false)
  const [note, setNote] = useState('')
  const [requestOpen, setRequestOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [directCompleteOpen, setDirectCompleteOpen] = useState(false)
  const [lowAttendance, setLowAttendance] = useState<{
    approved_hours: number
    hours_booked: number
    percent: number
  } | null>(null)

  useEffect(() => {
    setLocalBooking(booking)
  }, [booking])

  const status = String(localBooking.status || '')
  const isInProgress = status === 'in_progress'
  const isRequested = status === 'completion_requested'
  const history = Array.isArray(localBooking.completion_history)
    ? localBooking.completion_history
    : []

  const refresh = async (updated?: any) => {
    if (updated && typeof updated === 'object') {
      setLocalBooking((prev) => ({ ...prev, ...updated }))
    }
    await onUpdated?.(updated)
  }

  const handleRequest = async (acknowledgeLowAttendance = false) => {
    try {
      setSubmitting(true)
      const updated = await api.bookings.requestCompletion(localBooking.id, {
        note: note.trim() || null,
        acknowledge_low_attendance: acknowledgeLowAttendance,
      })
      toast.success('Completion requested — waiting for institution approval')
      setRequestOpen(false)
      setLowAttendance(null)
      setNote('')
      await refresh(updated)
    } catch (e: any) {
      const payload = e?.payload
      if (payload?.code === 'LOW_ATTENDANCE') {
        setLowAttendance({
          approved_hours: Number(payload.approved_hours) || 0,
          hours_booked: Number(payload.hours_booked) || 0,
          percent: Number(payload.percent) || 0,
        })
        return
      }
      toast.error(e?.message || 'Failed to request completion')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async () => {
    try {
      setSubmitting(true)
      const updated = await api.bookings.approveCompletion(localBooking.id, {
        note: note.trim() || null,
      })
      toast.success('Booking marked completed')
      setApproveOpen(false)
      setDirectCompleteOpen(false)
      setNote('')
      await refresh(updated)
      onApproved?.(updated)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to approve completion')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDecline = async () => {
    try {
      setSubmitting(true)
      const updated = await api.bookings.declineCompletion(localBooking.id, {
        note: note.trim() || null,
      })
      toast.success('Completion request declined — booking remains in progress')
      setDeclineOpen(false)
      setNote('')
      await refresh(updated)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to decline completion')
    } finally {
      setSubmitting(false)
    }
  }

  if (role === 'expert') {
    return (
      <div className="flex flex-col gap-2 w-full sm:max-w-xl">
        {isInProgress && (
          <>
            <Button
              size="sm"
              className="bg-[#008260] hover:bg-[#006D51] rounded-3xl text-white font-medium w-full sm:w-auto"
              onClick={() => {
                setNote('')
                setLowAttendance(null)
                setRequestOpen(true)
              }}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Request completion
            </Button>

            <AlertDialog
              open={requestOpen}
              onOpenChange={(open) => {
                if (!submitting) {
                  setRequestOpen(open)
                  if (!open) setLowAttendance(null)
                }
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {lowAttendance ? 'Attendance below expected hours' : 'Request completion?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3 text-sm text-muted-foreground">
                      {lowAttendance ? (
                        <>
                          <p>
                            Approved attendance is{' '}
                            <span className="font-semibold text-foreground">
                              {lowAttendance.approved_hours}h
                            </span>{' '}
                            ({lowAttendance.percent}%) of the planned{' '}
                            <span className="font-semibold text-foreground">
                              {lowAttendance.hours_booked}h
                            </span>
                            .
                          </p>
                          <p>
                            You can still send the request. The institution will review before marking
                            this engagement complete.
                          </p>
                        </>
                      ) : (
                        <>
                          <p>
                            This does not complete the booking immediately. The institution will review
                            and approve before it is marked complete.
                          </p>
                          <div>
                            <Label htmlFor="completion-note-expert" className="text-foreground">
                              Note for institution (optional)
                            </Label>
                            <Textarea
                              id="completion-note-expert"
                              className="mt-1.5"
                              rows={3}
                              value={note}
                              onChange={(e) => setNote(e.target.value)}
                              placeholder="e.g. All planned sessions are done"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={submitting}
                    className="bg-[#008260] hover:bg-[#006d51]"
                    onClick={(e) => {
                      e.preventDefault()
                      void handleRequest(Boolean(lowAttendance))
                    }}
                  >
                    {submitting
                      ? 'Sending...'
                      : lowAttendance
                        ? 'Request anyway'
                        : 'Send request'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        {isRequested && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950 w-full">
            <p className="font-semibold">Completion requested</p>
            <p className="mt-1 text-sky-900/90 leading-relaxed">
              Waiting for the institution to approve. The booking is not completed yet.
            </p>
            {localBooking.completion_note && (
              <p className="mt-1.5 text-xs text-sky-800">Your note: {localBooking.completion_note}</p>
            )}
          </div>
        )}

        {status === 'completed' && localBooking.completion_decision_note && (
          <p className="text-xs text-[#6A6A6A]">Institution note: {localBooking.completion_decision_note}</p>
        )}

        <CompletionHistoryTimeline history={history} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 w-full sm:max-w-xl">
      {isRequested && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 mb-1">
          <p className="font-semibold">Expert requested completion</p>
          {localBooking.completion_note && (
            <p className="mt-1 text-amber-900/90">Note: {localBooking.completion_note}</p>
          )}
          <p className="mt-1 text-amber-900/80 text-xs">
            Approve to mark completed, or decline to keep the engagement in progress.
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        {isRequested && (
          <>
            <Button
              size="sm"
              onClick={() => {
                setNote('')
                setApproveOpen(true)
              }}
              className="bg-[#008260] hover:bg-[#008260] text-white hover:text-white rounded-[25px] text-[13px] whitespace-nowrap px-6"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Approve completion
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setNote('')
                setDeclineOpen(true)
              }}
              className="border border-[#C2410C] text-[13px] font-medium text-[#C2410C] rounded-[25px] bg-white hover:bg-orange-50"
            >
              Decline request
            </Button>
          </>
        )}

        {isInProgress && (
          <Button
            size="sm"
            onClick={() => {
              setNote('')
              setDirectCompleteOpen(true)
            }}
            className="bg-[#008260] hover:bg-[#008260] text-white hover:text-white rounded-[25px] text-[13px] whitespace-nowrap px-6"
          >
            Mark Completed
          </Button>
        )}

        {showInstitutionCancel && (isInProgress || isRequested) && (
          <Button
            size="sm"
            variant="outline"
            onClick={onInstitutionCancel}
            className="border border-[#FF0000] text-[13px] font-medium text-[#FF0000] rounded-[25px] bg-white hover:bg-white hover:text-[#FF0000]"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Delete
          </Button>
        )}
      </div>

      <CompletionHistoryTimeline history={history} />

      <AlertDialog open={approveOpen} onOpenChange={(open) => !submitting && setApproveOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve completion?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  This will mark the booking as completed. Attendance becomes read-only after this.
                </p>
                <div>
                  <Label htmlFor="approve-note" className="text-foreground">
                    Note (optional)
                  </Label>
                  <Textarea
                    id="approve-note"
                    className="mt-1.5"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              className="bg-[#008260] hover:bg-[#006d51]"
              onClick={(e) => {
                e.preventDefault()
                void handleApprove()
              }}
            >
              {submitting ? 'Saving...' : 'Approve & complete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={declineOpen} onOpenChange={(open) => !submitting && setDeclineOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline completion request?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  The booking stays in progress so the expert can continue work or attendance. Please
                  share a short reason.
                </p>
                <div>
                  <Label htmlFor="decline-note" className="text-foreground">
                    Reason (optional but recommended)
                  </Label>
                  <Textarea
                    id="decline-note"
                    className="mt-1.5"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Pending session approval / remaining hours"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              className="bg-[#C2410C] hover:bg-[#9A3412]"
              onClick={(e) => {
                e.preventDefault()
                void handleDecline()
              }}
            >
              {submitting ? 'Saving...' : 'Decline request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={directCompleteOpen}
        onOpenChange={(open) => !submitting && setDirectCompleteOpen(open)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark booking completed?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  You are closing this engagement without an expert completion request. Use this when
                  work is finished from your side (or closing with an exception).
                </p>
                <div>
                  <Label htmlFor="direct-complete-note" className="text-foreground">
                    Note (optional)
                  </Label>
                  <Textarea
                    id="direct-complete-note"
                    className="mt-1.5"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              className="bg-[#008260] hover:bg-[#006d51]"
              onClick={(e) => {
                e.preventDefault()
                void handleApprove()
              }}
            >
              {submitting ? 'Saving...' : 'Mark completed'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
