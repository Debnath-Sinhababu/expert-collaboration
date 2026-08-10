'use client'

import { useMemo, useState } from 'react'
import { Clock3, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { buildProjectEditDiff } from '@/lib/projectEditRequest'

type Props = {
  editRequest: any | null
  canReview: boolean
  onReview: (action: 'approve' | 'reject', reviewNote?: string) => Promise<void>
}

function formatWhen(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '—'
}

export function ProjectEditRequestPanel({ editRequest, canReview, onReview }: Props) {
  const [reviewNote, setReviewNote] = useState('')
  const [saving, setSaving] = useState<'approve' | 'reject' | null>(null)

  const diffRows = useMemo(
    () => buildProjectEditDiff(editRequest?.previous_snapshot, editRequest?.proposed_payload),
    [editRequest],
  )

  if (!editRequest || editRequest.status !== 'pending') return null

  async function handleReview(action: 'approve' | 'reject') {
    setSaving(action)
    try {
      await onReview(action, reviewNote.trim() || undefined)
      setReviewNote('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to review edit request')
    } finally {
      setSaving(null)
    }
  }

  return (
    <SectionCard
      title="Pending institution edit"
      description="This project has bookings. The institute submitted changes that need your approval before they go live."
      eyebrow="Edit review"
    >
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <div className="flex items-start gap-2">
          <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Waiting for admin approval</p>
            <p className="mt-1 text-amber-900/90">Submitted {formatWhen(editRequest.created_at)}</p>
          </div>
        </div>
      </div>

      {diffRows.length ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-0 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Field</span>
            <span>Current</span>
            <span>Proposed</span>
          </div>
          <div className="divide-y divide-slate-100">
            {diffRows.map((row) => (
              <div key={row.key} className="grid grid-cols-1 gap-2 px-4 py-3 text-sm md:grid-cols-[1fr_1fr_1fr] md:gap-4">
                <p className="font-medium text-slate-900">{row.label}</p>
                <p className="text-slate-600">{row.before}</p>
                <p className="font-medium text-[#008260]">{row.after}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-600">No field-level differences detected in the submitted payload.</p>
      )}

      {editRequest.proposed_payload?.requirement_pdf_url ? (
        <p className="mt-3 text-sm">
          <a
            href={editRequest.proposed_payload.requirement_pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#008260] hover:underline"
          >
            Open proposed requirement PDF
          </a>
        </p>
      ) : null}

      {canReview ? (
        <div className="mt-5 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <Textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Optional note to the institution (shown if you reject, or stored on approval)"
            rows={2}
            className="bg-white"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="bg-[#008260] hover:bg-[#006d51]"
              disabled={Boolean(saving)}
              onClick={() => handleReview('approve')}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {saving === 'approve' ? 'Approving...' : 'Approve changes'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={Boolean(saving)}
              onClick={() => handleReview('reject')}
            >
              <XCircle className="mr-2 h-4 w-4" />
              {saving === 'reject' ? 'Rejecting...' : 'Reject changes'}
            </Button>
          </div>
        </div>
      ) : null}
    </SectionCard>
  )
}
