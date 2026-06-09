'use client'

import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AttendanceDay } from './TrainingAttendanceCalendar'
import { isDateInRange } from '@/lib/dateOnly'

function formatTs(iso: string | null | undefined) {
  if (!iso) return '—'
  return format(new Date(iso), 'h:mm a, d MMM yyyy')
}

function toDatetimeLocal(iso: string | null | undefined) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(v: string) {
  if (!v) return ''
  return new Date(v).toISOString()
}

const STATUS_LABEL: Record<string, string> = {
  open: 'In progress',
  pending_review: 'Pending review',
  approved: 'Approved',
  disputed: 'Disputed',
}

const STATUS_CLASS: Record<string, string> = {
  open: 'bg-[#DBEAFE] text-[#1E40AF]',
  pending_review: 'bg-[#FEF3C7] text-[#92400E]',
  approved: 'bg-[#D1FAE5] text-[#065F46]',
  disputed: 'bg-[#FEE2E2] text-[#991B1B]',
}

export type AttendanceDayFull = AttendanceDay & {
  expert_entry_at?: string | null
  expert_exit_at?: string | null
  effective_entry_at?: string | null
  effective_exit_at?: string | null
  dispute_reason?: string | null
}

type Props = {
  day: AttendanceDayFull | null
  sessionDate: string | null
  rangeStart?: string
  rangeEnd?: string
  role: 'expert' | 'institution' | 'super_admin'
  canMark: boolean
  readOnly: boolean
  busy?: boolean
  onMarkEntry: () => void
  onMarkExit: () => void
  onApprove: () => void
  onDispute: (reason: string) => void
  onEditTimes: (entry: string, exit: string, approve: boolean) => void
  onCorrect: (entry: string, exit: string) => void
}

export function TrainingAttendanceDayDetail({
  day,
  sessionDate,
  rangeStart,
  rangeEnd,
  role,
  canMark,
  readOnly,
  busy,
  onMarkEntry,
  onMarkExit,
  onApprove,
  onDispute,
  onEditTimes,
  onCorrect,
}: Props) {
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [editEntry, setEditEntry] = useState('')
  const [editExit, setEditExit] = useState('')
  const [showEdit, setShowEdit] = useState(false)

  if (!sessionDate) {
    return (
      <div className="rounded-xl border border-[#DCDCDC] bg-white p-6 text-sm text-[#6A6A6A]">
        Select a day within the training period to view or manage attendance.
      </div>
    )
  }

  const label = format(parseISO(sessionDate), 'EEEE, d MMMM yyyy')

  const dayInRange =
    !sessionDate || !rangeStart || !rangeEnd
      ? true
      : isDateInRange(sessionDate, rangeStart, rangeEnd)

  if (!day) {
    return (
      <div className="rounded-xl border border-[#DCDCDC] bg-white p-6 space-y-4">
        <h3 className="font-semibold text-[#000000]">{label}</h3>
        <p className="text-sm text-[#6A6A6A]">No attendance recorded for this day.</p>
        {!dayInRange && (
          <p className="text-sm text-[#92400E]">This day is outside the booking training period.</p>
        )}
        {role === 'expert' && canMark && !readOnly && dayInRange && (
          <Button
            type="button"
            disabled={busy}
            onClick={onMarkEntry}
            className="bg-[#008260] hover:bg-[#006B4F] text-white w-full sm:w-auto"
          >
            Start day — mark entry
          </Button>
        )}
      </div>
    )
  }

  const openEdit = () => {
    setEditEntry(
      toDatetimeLocal(day.effective_entry_at || day.expert_entry_at)
    )
    setEditExit(toDatetimeLocal(day.effective_exit_at || day.expert_exit_at))
    setShowEdit(true)
  }

  return (
    <div className="rounded-xl border border-[#DCDCDC] bg-white p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-[#000000]">{label}</h3>
        <Badge className={STATUS_CLASS[day.status] || ''}>{STATUS_LABEL[day.status]}</Badge>
      </div>

      {day.status === 'disputed' && day.dispute_reason && (
        <div className="rounded-lg bg-[#FFF2F2] border border-[#FECACA] p-3 text-sm text-[#9B0000]">
          <strong>Dispute:</strong> {day.dispute_reason}
        </div>
      )}

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[#717171]">Expert entry</dt>
          <dd className="font-medium">{formatTs(day.expert_entry_at)}</dd>
        </div>
        <div>
          <dt className="text-[#717171]">Expert exit</dt>
          <dd className="font-medium">{formatTs(day.expert_exit_at)}</dd>
        </div>
        {(day.effective_entry_at || day.effective_exit_at) && day.status === 'approved' && (
          <>
            <div>
              <dt className="text-[#717171]">Approved entry</dt>
              <dd className="font-medium">{formatTs(day.effective_entry_at)}</dd>
            </div>
            <div>
              <dt className="text-[#717171]">Approved exit</dt>
              <dd className="font-medium">{formatTs(day.effective_exit_at)}</dd>
            </div>
          </>
        )}
      </dl>

      {role === 'expert' && canMark && !readOnly && dayInRange && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#ECECEC]">
          {day.status === 'disputed' && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              className="border-[#008260] text-[#008260]"
              onClick={() => {
                const entry = day.expert_entry_at || new Date().toISOString()
                const exit = day.expert_exit_at || new Date().toISOString()
                onCorrect(entry, exit)
              }}
            >
              Resubmit for review
            </Button>
          )}
          {(day.status === 'open' || day.status === 'disputed') && !day.expert_entry_at && (
            <Button
              type="button"
              disabled={busy}
              onClick={onMarkEntry}
              className="bg-[#008260] hover:bg-[#006B4F] text-white"
            >
              Mark entry
            </Button>
          )}
          {(day.status === 'open' || day.status === 'disputed') &&
            day.expert_entry_at &&
            !day.expert_exit_at && (
              <Button
                type="button"
                disabled={busy}
                onClick={onMarkExit}
                className="bg-[#FF6A00] hover:bg-[#E55F00] text-white"
              >
                Mark exit
              </Button>
            )}
        </div>
      )}

      {(role === 'institution' || role === 'super_admin') &&
        !readOnly &&
        day.status === 'pending_review' && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[#ECECEC]">
          <Button
            type="button"
            disabled={busy}
            onClick={onApprove}
            className="bg-[#008260] hover:bg-[#006B4F] text-white"
          >
            Approve
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={openEdit}>
            Edit times
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            className="border-[#9B0000] text-[#9B0000]"
            onClick={() => setDisputeOpen(true)}
          >
            Dispute
          </Button>
        </div>
      )}

      {showEdit && (role === 'institution' || role === 'super_admin') && (
        <div className="space-y-3 pt-2 border-t border-[#ECECEC]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Entry</Label>
              <Input
                type="datetime-local"
                value={editEntry}
                onChange={(e) => setEditEntry(e.target.value)}
              />
            </div>
            <div>
              <Label>Exit</Label>
              <Input
                type="datetime-local"
                value={editExit}
                onChange={(e) => setEditExit(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() => {
                onEditTimes(fromDatetimeLocal(editEntry), fromDatetimeLocal(editExit), true)
                setShowEdit(false)
              }}
              className="bg-[#008260] hover:bg-[#006B4F] text-white"
            >
              Save & approve
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dispute attendance</DialogTitle>
            <DialogDescription>
              Explain what needs to be corrected. The expert will be notified to update their
              entry/exit times.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Reason for dispute…"
            rows={4}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDisputeOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="bg-[#9B0000] hover:bg-[#7A0000] text-white"
              disabled={busy || !disputeReason.trim()}
              onClick={() => {
                onDispute(disputeReason.trim())
                setDisputeOpen(false)
                setDisputeReason('')
              }}
            >
              Submit dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
