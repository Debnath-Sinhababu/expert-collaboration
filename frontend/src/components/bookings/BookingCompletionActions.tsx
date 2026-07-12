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
  formatEngagementHistoryEntry,
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
  cancellation_note?: string | null
  cancellation_requested_at?: string | null
  application_id?: string | null
}

type Props = {
  booking: BookingLike
  role: 'expert' | 'institution'
  onUpdated?: (booking?: any) => void | Promise<void>
  onApproved?: (booking: any) => void
}

type DialogKind =
  | 'request_completion'
  | 'approve_completion'
  | 'decline_completion'
  | 'direct_complete'
  | 'request_cancellation'
  | 'approve_cancellation'
  | 'decline_cancellation'
  | 'direct_cancel'
  | null

function ActivityHistory({ history }: { history: CompletionHistoryEntry[] }) {
  if (!history.length) return null

  return (
    <div className="border-t border-[#ECECEC] pt-3 mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6A6A6A] mb-2">
        Activity history
      </p>
      <ol className="relative max-h-56 overflow-y-auto border-l border-[#E5E7EB] ml-1.5 pl-3.5 pr-1 space-y-0">
        {history
          .slice()
          .reverse()
          .map((entry, idx) => {
            const formatted = formatEngagementHistoryEntry(entry)
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
                : formatted.tone === 'danger'
                  ? 'bg-rose-500'
                  : formatted.tone === 'expert'
                    ? 'bg-amber-500'
                    : formatted.tone === 'institution'
                      ? 'bg-[#008260]'
                      : 'bg-slate-400'
            const kindLabel =
              formatted.kind === 'completion'
                ? 'Completion'
                : formatted.kind === 'cancellation'
                  ? 'Cancellation'
                  : null

            return (
              <li key={`${entry.at}-${entry.action}-${idx}`} className="relative pb-3 last:pb-0">
                <span
                  className={`absolute -left-[18px] top-1.5 h-2 w-2 rounded-full ring-2 ring-white ${toneClass}`}
                />
                <div className="rounded-md border border-[#EFEFEF] bg-[#FAFAFA] px-2.5 py-2">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <span className="text-[11px] font-medium text-[#374151]">{formatted.who}</span>
                    {kindLabel && (
                      <span className="text-[10px] uppercase tracking-wide text-[#9CA3AF]">
                        {kindLabel}
                      </span>
                    )}
                    {when && <span className="text-[10px] text-[#9CA3AF] ml-auto">{when}</span>}
                  </div>
                  <p className="text-[13px] font-medium text-[#111827] leading-snug">{formatted.title}</p>
                  {formatted.details.length > 0 && (
                    <dl className="mt-1 space-y-0.5 text-[11px] text-[#6B7280]">
                      {formatted.details.map((line) => (
                        <div key={`${line.label}-${line.value}`}>
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

export function BookingCompletionActions({ booking, role, onUpdated, onApproved }: Props) {
  const [localBooking, setLocalBooking] = useState(booking)
  const [submitting, setSubmitting] = useState(false)
  const [note, setNote] = useState('')
  const [dialog, setDialog] = useState<DialogKind>(null)
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
  const isCompletionRequested = status === 'completion_requested'
  const isCancellationRequested = status === 'cancellation_requested'
  const isTerminal = status === 'completed' || status === 'cancelled'
  const history = Array.isArray(localBooking.completion_history)
    ? localBooking.completion_history
    : []

  const refresh = async (updated?: any) => {
    if (updated && typeof updated === 'object') {
      setLocalBooking((prev) => ({ ...prev, ...updated }))
    }
    await onUpdated?.(updated)
  }

  const closeDialog = () => {
    if (!submitting) {
      setDialog(null)
      setLowAttendance(null)
      setNote('')
    }
  }

  const openDialog = (kind: DialogKind) => {
    setNote('')
    setLowAttendance(null)
    setDialog(kind)
  }

  const handleRequestCompletion = async (acknowledgeLowAttendance = false) => {
    try {
      setSubmitting(true)
      const updated = await api.bookings.requestCompletion(localBooking.id, {
        note: note.trim() || null,
        acknowledge_low_attendance: acknowledgeLowAttendance,
      })
      toast.success('Completion requested')
      setDialog(null)
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

  const handleApproveCompletion = async () => {
    try {
      setSubmitting(true)
      const updated = await api.bookings.approveCompletion(localBooking.id, {
        note: note.trim() || null,
      })
      toast.success('Booking marked completed')
      setDialog(null)
      setNote('')
      await refresh(updated)
      onApproved?.(updated)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to approve completion')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeclineCompletion = async () => {
    try {
      setSubmitting(true)
      const updated = await api.bookings.declineCompletion(localBooking.id, {
        note: note.trim() || null,
      })
      toast.success('Completion request declined')
      setDialog(null)
      setNote('')
      await refresh(updated)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to decline completion')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRequestCancellation = async () => {
    try {
      setSubmitting(true)
      const updated = await api.bookings.requestCancellation(localBooking.id, {
        note: note.trim() || null,
      })
      toast.success('Cancellation requested')
      setDialog(null)
      setNote('')
      await refresh(updated)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to request cancellation')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApproveCancellation = async () => {
    try {
      setSubmitting(true)
      const updated = await api.bookings.approveCancellation(localBooking.id, {
        note: note.trim() || null,
      })
      toast.success('Booking cancelled')
      setDialog(null)
      setNote('')
      await refresh(updated)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to approve cancellation')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeclineCancellation = async () => {
    try {
      setSubmitting(true)
      const updated = await api.bookings.declineCancellation(localBooking.id, {
        note: note.trim() || null,
      })
      toast.success('Cancellation request declined')
      setDialog(null)
      setNote('')
      await refresh(updated)
    } catch (e: any) {
      toast.error(e?.message || 'Failed to decline cancellation')
    } finally {
      setSubmitting(false)
    }
  }

  const statusBanner = isCompletionRequested ? (
    <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-950">
      <p className="font-semibold">Completion pending approval</p>
      <p className="mt-1 text-sky-900/85 leading-relaxed text-[13px]">
        {role === 'expert'
          ? 'Waiting for the institution to approve. This booking is not completed yet.'
          : 'Expert asked to mark this booking complete. Approve or decline below.'}
      </p>
      {localBooking.completion_note && (
        <p className="mt-1.5 text-xs text-sky-800">
          Note: {localBooking.completion_note}
        </p>
      )}
    </div>
  ) : isCancellationRequested ? (
    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-950">
      <p className="font-semibold">Cancellation pending approval</p>
      <p className="mt-1 text-rose-900/85 leading-relaxed text-[13px]">
        {role === 'expert'
          ? 'Waiting for the institution to approve. This booking is still active.'
          : 'Expert asked to cancel this booking. Approve or decline below.'}
      </p>
      {localBooking.cancellation_note && (
        <p className="mt-1.5 text-xs text-rose-800">
          Note: {localBooking.cancellation_note}
        </p>
      )}
    </div>
  ) : null

  return (
    <div className="w-full sm:max-w-md rounded-xl border border-[#E8E8E8] bg-white p-3 space-y-3">
      {statusBanner}

      {role === 'expert' && isInProgress && (
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            className="bg-[#008260] hover:bg-[#006D51] rounded-3xl text-white font-medium w-full"
            onClick={() => openDialog('request_completion')}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Request completion
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-[#9B0000] hover:text-[#9B0000] hover:bg-[#FFF2F2] rounded-3xl font-medium w-full"
            onClick={() => openDialog('request_cancellation')}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Request cancellation
          </Button>
        </div>
      )}

      {role === 'institution' && isCompletionRequested && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            size="sm"
            className="bg-[#008260] hover:bg-[#008260] text-white rounded-[25px] text-[13px] flex-1"
            onClick={() => openDialog('approve_completion')}
          >
            Approve completion
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[#C2410C] text-[#C2410C] rounded-[25px] text-[13px] flex-1"
            onClick={() => openDialog('decline_completion')}
          >
            Decline
          </Button>
        </div>
      )}

      {role === 'institution' && isCancellationRequested && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            size="sm"
            className="bg-[#9B0000] hover:bg-[#7A0000] text-white rounded-[25px] text-[13px] flex-1"
            onClick={() => openDialog('approve_cancellation')}
          >
            Approve cancellation
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[#008260] text-[#008260] rounded-[25px] text-[13px] flex-1"
            onClick={() => openDialog('decline_cancellation')}
          >
            Keep booking
          </Button>
        </div>
      )}

      {role === 'institution' && isInProgress && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            size="sm"
            className="bg-[#008260] hover:bg-[#008260] text-white rounded-[25px] text-[13px] flex-1"
            onClick={() => openDialog('direct_complete')}
          >
            Mark completed
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[#FF0000] text-[#FF0000] rounded-[25px] text-[13px] flex-1"
            onClick={() => openDialog('direct_cancel')}
          >
            Cancel booking
          </Button>
        </div>
      )}

      {isTerminal && (
        <p className="text-xs text-[#6A6A6A]">
          {status === 'completed' ? 'This booking is completed.' : 'This booking is cancelled.'}
        </p>
      )}

      <ActivityHistory history={history} />

      {/* Request completion */}
      <AlertDialog
        open={dialog === 'request_completion'}
        onOpenChange={(open) => (!open ? closeDialog() : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lowAttendance ? 'Attendance below expected hours' : 'Request completion?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                {lowAttendance ? (
                  <p>
                    Approved attendance is{' '}
                    <span className="font-semibold text-foreground">
                      {lowAttendance.approved_hours}h
                    </span>{' '}
                    ({lowAttendance.percent}%) of planned{' '}
                    <span className="font-semibold text-foreground">
                      {lowAttendance.hours_booked}h
                    </span>
                    . You can still send the request for institution review.
                  </p>
                ) : (
                  <>
                    <p>
                      The institution must approve before this booking is marked complete.
                    </p>
                    <div>
                      <Label className="text-foreground">Note (optional)</Label>
                      <Textarea
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
                void handleRequestCompletion(Boolean(lowAttendance))
              }}
            >
              {submitting ? 'Sending...' : lowAttendance ? 'Request anyway' : 'Send request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Approve / decline completion */}
      <AlertDialog
        open={dialog === 'approve_completion' || dialog === 'direct_complete'}
        onOpenChange={(open) => (!open ? closeDialog() : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog === 'direct_complete' ? 'Mark booking completed?' : 'Approve completion?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  {dialog === 'direct_complete'
                    ? 'Close this engagement from your side. Attendance becomes read-only.'
                    : 'This will mark the booking completed. Attendance becomes read-only.'}
                </p>
                <div>
                  <Label className="text-foreground">Note (optional)</Label>
                  <Textarea
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
            <AlertDialogCancel disabled={submitting}>Back</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              className="bg-[#008260] hover:bg-[#006d51]"
              onClick={(e) => {
                e.preventDefault()
                void handleApproveCompletion()
              }}
            >
              {submitting ? 'Saving...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={dialog === 'decline_completion'}
        onOpenChange={(open) => (!open ? closeDialog() : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline completion request?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>The booking stays in progress so work can continue.</p>
                <div>
                  <Label className="text-foreground">Reason (optional)</Label>
                  <Textarea
                    className="mt-1.5"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Pending session approval"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Back</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              className="bg-[#C2410C] hover:bg-[#9A3412]"
              onClick={(e) => {
                e.preventDefault()
                void handleDeclineCompletion()
              }}
            >
              {submitting ? 'Saving...' : 'Decline request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Request cancellation */}
      <AlertDialog
        open={dialog === 'request_cancellation'}
        onOpenChange={(open) => (!open ? closeDialog() : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request cancellation?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  This does not cancel immediately. The institution must approve before the booking
                  is cancelled.
                </p>
                <div>
                  <Label className="text-foreground">Reason (optional)</Label>
                  <Textarea
                    className="mt-1.5"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Schedule conflict / unable to continue"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Keep booking</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              className="bg-[#9B0000] hover:bg-[#7A0000]"
              onClick={(e) => {
                e.preventDefault()
                void handleRequestCancellation()
              }}
            >
              {submitting ? 'Sending...' : 'Send cancellation request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={dialog === 'approve_cancellation' || dialog === 'direct_cancel'}
        onOpenChange={(open) => (!open ? closeDialog() : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialog === 'direct_cancel' ? 'Cancel this booking?' : 'Approve cancellation?'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  {dialog === 'direct_cancel'
                    ? 'This will cancel the booking immediately from your side.'
                    : 'This will cancel the booking as requested by the expert.'}
                </p>
                <div>
                  <Label className="text-foreground">Note (optional)</Label>
                  <Textarea
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
            <AlertDialogCancel disabled={submitting}>Back</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              className="bg-[#9B0000] hover:bg-[#7A0000]"
              onClick={(e) => {
                e.preventDefault()
                void handleApproveCancellation()
              }}
            >
              {submitting ? 'Saving...' : 'Confirm cancel'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={dialog === 'decline_cancellation'}
        onOpenChange={(open) => (!open ? closeDialog() : undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keep this booking active?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>The cancellation request will be declined and the booking stays in progress.</p>
                <div>
                  <Label className="text-foreground">Note to expert (optional)</Label>
                  <Textarea
                    className="mt-1.5"
                    rows={2}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Please continue with remaining sessions"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Back</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              className="bg-[#008260] hover:bg-[#006d51]"
              onClick={(e) => {
                e.preventDefault()
                void handleDeclineCancellation()
              }}
            >
              {submitting ? 'Saving...' : 'Keep booking'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
