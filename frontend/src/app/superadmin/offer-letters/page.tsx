'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { FileText, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { superAdminApi } from '@/lib/superadmin/api'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { DataTable } from '@/components/superadmin/common/DataTable'

const STATUS_LABEL: Record<string, string> = {
  pending_review: 'Pending Review',
  offer_sent: 'Offer Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired (3-day auto-decline)',
}

const STATUS_TONE: Record<string, string> = {
  pending_review: 'bg-amber-100 text-amber-800',
  offer_sent: 'bg-sky-100 text-sky-800',
  accepted: 'bg-emerald-100 text-emerald-800',
  declined: 'bg-red-100 text-red-800',
  expired: 'bg-slate-200 text-slate-700',
}

export default function SuperAdminOfferLettersPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verifyingId, setVerifyingId] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    setError('')
    superAdminApi.onboardingRequests(statusFilter === 'all' ? {} : { status: statusFilter })
      .then((res) => setRows(Array.isArray(res) ? res : []))
      .catch((err) => {
        setRows([])
        setError(err instanceof Error ? err.message : 'Failed to load onboarding requests')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  async function verify(row: any) {
    setVerifyingId(row.id)
    try {
      const updated = await superAdminApi.verifyOnboardingRequest(row.id)
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, ...updated } : item))
      toast.success('Offer letter generated and sent to the expert.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to verify and send offer letter')
    } finally {
      setVerifyingId(null)
    }
  }

  const pendingCount = rows.filter((r) => r.status === 'pending_review').length
  const sentCount = rows.filter((r) => r.status === 'offer_sent').length
  const declinedCount = rows.filter((r) => r.status === 'declined').length

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Pending Review" value={pendingCount} tone="amber" icon={FileText} />
        <StatCard label="Offer Sent" value={sentCount} tone="blue" icon={Send} />
        <StatCard label="Declined" value={declinedCount} tone="slate" />
      </div>

      <SectionCard
        title="Offer Letters"
        description="Institutions submit an onboarding case after locking the booking. Verify each case to auto-generate and send the offer letter to the expert."
        action={
          <select
            className="rounded-md border border-slate-200 px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="pending_review">Pending Review</option>
            <option value="offer_sent">Offer Sent</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="expired">Expired</option>
          </select>
        }
      >
        {loading ? <p className="mb-3 text-sm text-slate-600">Loading onboarding requests...</p> : null}
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        <DataTable
          rows={rows}
          columns={[
            { key: 'expert', header: 'Expert', render: (row: any) => (
              <div>
                <p className="font-medium text-slate-950">{row.experts?.name || 'Unknown expert'}</p>
                <p className="text-xs text-slate-500">{row.experts?.email}</p>
              </div>
            ) },
            { key: 'institution', header: 'Institution', render: (row: any) => row.institutions?.name || '-' },
            { key: 'project', header: 'Requirement', render: (row: any) => row.projects?.title || '-' },
            { key: 'submitted', header: 'Submitted', render: (row: any) => row.submitted_at ? new Date(row.submitted_at).toLocaleDateString() : '-' },
            { key: 'status', header: 'Status', render: (row: any) => (
              <div>
                <Badge className={STATUS_TONE[row.status] || ''}>{STATUS_LABEL[row.status] || row.status}</Badge>
                {(row.status === 'declined' || row.status === 'expired') && row.decline_reason ? (
                  <p className="mt-1 max-w-xs text-xs text-red-600">{row.decline_reason}</p>
                ) : null}
              </div>
            ) },
            { key: 'letter', header: 'Offer Letter', render: (row: any) => row.offer_letter_url ? (
              <a href={row.offer_letter_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-[#008260] hover:underline">
                <FileText className="mr-1 h-4 w-4" />
                View PDF
              </a>
            ) : '-' },
            { key: 'action', header: '', render: (row: any) => row.status === 'pending_review' ? (
              <Button
                size="sm"
                className="bg-[#008260] hover:bg-[#006d51]"
                disabled={verifyingId === row.id}
                onClick={() => verify(row)}
              >
                <Send className="mr-2 h-4 w-4" />
                {verifyingId === row.id ? 'Sending...' : 'Verify & Send Offer Letter'}
              </Button>
            ) : null },
          ]}
          emptyText="No onboarding requests yet."
        />
      </SectionCard>
    </div>
  )
}
