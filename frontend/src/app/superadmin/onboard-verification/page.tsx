'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, Eye, FileText, RefreshCw, Search, Send, Star, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { superAdminApi } from '@/lib/superadmin/api'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { DataTable } from '@/components/superadmin/common/DataTable'
import { moneyInr, compensationUnitShortLabel, resolveExpertShare, toExpertNet } from '@/lib/projectCompensation'

/**
 * The expert's net payout (after the platform margin) — the same figure the offer letter states as
 * the professional fee. Mirrors computeTotalFee in backend/src/modules/onboarding/onboarding.service.js;
 * keep the two in sync so the modal never contradicts the generated letter.
 */
function computeExpertNetTotal(application: any, project: any): number | null {
  const expertShare = resolveExpertShare(project)
  const grossTotal = Number(project?.institution_gross_total) > 0
    ? Number(project.institution_gross_total)
    : Number(project?.total_budget) > 0
      ? Number(project.total_budget)
      : 0
  if (grossTotal > 0) return toExpertNet(grossTotal, expertShare)

  const unitQuantity = Number(application?.unit_quantity ?? project?.unit_quantity ?? 1)
  const qty = Number.isFinite(unitQuantity) && unitQuantity > 0 ? unitQuantity : 1

  const netPerUnit = Number(application?.final_net_per_unit)
  if (Number.isFinite(netPerUnit) && netPerUnit > 0) return Math.round(netPerUnit * qty)

  const grossPerUnit = Number(
    application?.final_gross_per_unit ?? project?.institution_gross_per_unit ?? project?.hourly_rate
  )
  if (!Number.isFinite(grossPerUnit) || grossPerUnit <= 0) return null
  return toExpertNet(grossPerUnit * qty, expertShare)
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'offer_sent', label: 'Offer Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
]

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

const STATUS_DOT: Record<string, string> = {
  pending_review: 'bg-amber-500',
  offer_sent: 'bg-sky-500',
  accepted: 'bg-emerald-500',
  declined: 'bg-red-500',
  expired: 'bg-slate-500',
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={`gap-1.5 rounded-full font-medium ${STATUS_TONE[status] || ''}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[status] || 'bg-slate-500'}`} />
      {STATUS_LABEL[status] || status}
    </Badge>
  )
}

function DetailRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-b-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value ?? '-'}</span>
    </div>
  )
}

export default function SuperAdminOnboardVerificationPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [selectedRow, setSelectedRow] = useState<any>(null)

  const load = () => {
    setLoading(true)
    setError('')
    superAdminApi.onboardingRequests()
      .then((res) => setRows(Array.isArray(res) ? res : []))
      .catch((err) => {
        setRows([])
        setError(err instanceof Error ? err.message : 'Failed to load onboarding requests')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (query) {
        const haystack = [row.experts?.name, row.institutions?.name, row.projects?.title, row.projects?.unique_code]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(query)) return false
      }
      return true
    })
  }, [rows, search, statusFilter])

  const hasActiveFilters = Boolean(search.trim()) || statusFilter !== 'all'

  const clearAll = () => {
    setSearch('')
    setStatusFilter('all')
  }

  async function verify(row: any) {
    setVerifyingId(row.id)
    try {
      const updated = await superAdminApi.verifyOnboardingRequest(row.id)
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, ...updated } : item))
      setSelectedRow((current: any) => current && current.id === row.id ? { ...current, ...updated } : current)
      toast.success('Offer letter generated and sent to the expert.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to verify and send offer letter')
    } finally {
      setVerifyingId(null)
    }
  }

  const pendingCount = rows.filter((r) => r.status === 'pending_review').length
  // Cumulative offers ever sent, not just those still awaiting a response -
  // once an expert accepts/declines, status moves off 'offer_sent' but the offer was still sent.
  const sentCount = rows.filter((r) => Boolean(r.offer_sent_at)).length
  const acceptedCount = rows.filter((r) => r.status === 'accepted').length
  const declinedCount = rows.filter((r) => r.status === 'declined').length

  const expert = selectedRow?.experts
  const institution = selectedRow?.institutions
  const project = selectedRow?.projects
  const application = selectedRow?.applications
  const rate = application?.final_gross_per_unit || application?.proposed_rate
  const unitShort = compensationUnitShortLabel(application?.compensation_unit || project?.compensation_unit)

  // Once the offer letter has been generated, its stored fee is the authoritative figure the expert
  // was told. Before that, derive it so reviewers see the payout before they hit Verify.
  const storedExpertFee = Number(selectedRow?.offer_letter_data?.totalFee)
  const expertNetTotal = Number.isFinite(storedExpertFee) && storedExpertFee > 0
    ? storedExpertFee
    : computeExpertNetTotal(application, project)
  const institutionGrossTotal = Number(project?.institution_gross_total) > 0
    ? Number(project.institution_gross_total)
    : Number(project?.total_budget) > 0
      ? Number(project.total_budget)
      : null
  const platformFeeTotal = institutionGrossTotal != null && expertNetTotal != null
    ? Math.max(0, Math.round(institutionGrossTotal - expertNetTotal))
    : null

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending Review" value={pendingCount} tone="amber" icon={FileText} />
        <StatCard label="Offer Sent" value={sentCount} tone="blue" icon={Send} helper="Total offers sent" />
        <StatCard label="Accepted" value={acceptedCount} tone="green" icon={CheckCircle2} />
        <StatCard label="Declined" value={declinedCount} tone="slate" />
      </div>

      <SectionCard
        title="Onboard Verification"
        description="Institutions submit an onboarding case after locking the booking. Review the full details, then verify each case to auto-generate and send the offer letter to the expert."
      >
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search by unique ID, expert name, institution, or requirement"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            className="shrink-0 text-slate-600 hover:text-red-900 bg-red-500/10 hover:bg-red-500/20"
            disabled={!hasActiveFilters}
            onClick={clearAll}
          >
            <X className=" h-4 w-4" />
         
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 text-slate-600 hover:text-slate-900"
            disabled={loading}
            onClick={load}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {loading ? <p className="mb-3 text-sm text-slate-600">Loading onboarding requests...</p> : null}
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        <DataTable
          rows={filteredRows}
          columns={[
            { key: 'expert', header: 'Expert', render: (row: any) => (
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-emerald-100">
                  <AvatarImage src={row.experts?.photo_url} />
                  <AvatarFallback className="bg-gradient-to-r from-[#008260] to-emerald-500 text-xs font-bold text-white">
                    {row.experts?.name?.charAt(0) || 'E'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-950">{row.experts?.name || 'Unknown expert'}</p>
                  <p className="truncate text-xs text-slate-500">{row.experts?.email}</p>
                </div>
              </div>
            ) },
            { key: 'institution', header: 'Institution', render: (row: any) => (
              <span className="text-slate-800">{row.institutions?.name || '-'}</span>
            ) },
            { key: 'project_id', header: 'Project ID', render: (row: any) => (
              row.projects?.unique_code ? (
                <span className="inline-flex items-center rounded-full bg-[#008260]/10 px-2.5 py-1 text-xs font-semibold text-[#008260]">
                  {row.projects.unique_code}
                </span>
              ) : <span className="text-slate-400">-</span>
            ) },
            { key: 'project', header: 'Requirement', render: (row: any) => (
              <div className="min-w-0 max-w-[220px]">
                <p className="truncate font-medium text-slate-900">{row.projects?.title || '-'}</p>
                {row.projects?.type ? <p className="text-xs capitalize text-slate-500">{row.projects.type}</p> : null}
              </div>
            ) },
            { key: 'submitted', header: 'Submitted', render: (row: any) => (
              <span className="text-slate-600">{formatDate(row.submitted_at)}</span>
            ) },
            { key: 'status', header: 'Status', render: (row: any) => (
              (row.status === 'declined' || row.status === 'expired') && row.decline_reason ? (
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="cursor-help"><StatusBadge status={row.status} /></span>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">{row.decline_reason}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <StatusBadge status={row.status} />
              )
            ) },
            { key: 'letter', header: 'Offer Letter', render: (row: any) => (
              <div className="flex flex-col gap-1">
                {row.offer_letter_url ? (
                  <a href={row.offer_letter_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm font-medium text-[#008260] hover:underline" onClick={(e) => e.stopPropagation()}>
                    <FileText className="mr-1 h-4 w-4" />
                    View PDF
                  </a>
                ) : <span className="text-slate-400">-</span>}
                {row.signed_offer_letter_url ? (
                  <a href={row.signed_offer_letter_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs font-medium text-emerald-700 hover:underline" onClick={(e) => e.stopPropagation()}>
                    <FileText className="mr-1 h-3.5 w-3.5" />
                    Signed copy
                  </a>
                ) : null}
              </div>
            ) },
            { key: 'action', header: '', render: (row: any) => (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedRow(row)}
                >
                  <Eye className="mr-1 h-4 w-4" />
                  View
                </Button>
                {row.status === 'pending_review' ? (
                  <Button
                    size="sm"
                    className="bg-[#008260] hover:bg-[#006d51]"
                    disabled={verifyingId === row.id}
                    onClick={() => verify(row)}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {verifyingId === row.id ? 'Sending...' : 'Verify & Send'}
                  </Button>
                ) : null}
              </div>
            ) },
          ]}
          emptyText={hasActiveFilters ? 'No onboarding requests match your search/filters.' : 'No onboarding requests yet.'}
        />
      </SectionCard>

      <Dialog open={Boolean(selectedRow)} onOpenChange={(open) => { if (!open) setSelectedRow(null) }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Onboarding Request Details</DialogTitle>
            <DialogDescription>
              Full expert, institution, and requirement details for this onboarding case.
            </DialogDescription>
          </DialogHeader>

          {selectedRow ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <StatusBadge status={selectedRow.status} />
                {(selectedRow.status === 'declined' || selectedRow.status === 'expired') && selectedRow.decline_reason ? (
                  <p className="text-xs text-red-600">{selectedRow.decline_reason}</p>
                ) : null}
              </div>

              {/* Expert */}
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 flex items-center gap-3">
                  <Avatar className="h-12 w-12 border-2 border-emerald-100">
                    <AvatarImage src={expert?.photo_url} />
                    <AvatarFallback className="bg-gradient-to-r from-[#008260] to-emerald-500 text-white font-bold">
                      {expert?.name?.charAt(0) || 'E'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-slate-950">{expert?.name || 'Unknown expert'}</p>
                    <p className="text-xs text-slate-500">{expert?.email}{expert?.phone ? ` · ${expert.phone}` : ''}</p>
                  </div>
                  {expert?.rating ? (
                    <div className="ml-auto flex items-center gap-1 text-sm text-slate-700">
                      <Star className="h-4 w-4 fill-current text-yellow-400" />
                      {expert.rating}/5 ({expert.total_ratings || 0})
                    </div>
                  ) : null}
                </div>
                <DetailRow label="Domain expertise" value={Array.isArray(expert?.domain_expertise) ? expert.domain_expertise.join(', ') : '-'} />
                <DetailRow label="Experience" value={expert?.experience_years ? `${expert.experience_years} years` : '-'} />
                <DetailRow label="Base rate" value={expert?.hourly_rate ? moneyInr(expert.hourly_rate) + '/hr' : '-'} />
                <DetailRow label="Verification" value={expert?.is_verified ? 'Verified' : 'Pending'} />
                <DetailRow label="KYC status" value={expert?.kyc_status || 'pending'} />
                {expert?.qualifications ? <DetailRow label="Qualifications" value={expert.qualifications} /> : null}
                {expert?.bio ? (
                  <div className="pt-2 text-sm">
                    <p className="text-slate-500">Bio</p>
                    <p className="mt-1 text-slate-800">{expert.bio}</p>
                  </div>
                ) : null}
              </div>

              {/* Institution */}
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="mb-2 font-semibold text-slate-950">{institution?.name || 'Unknown institution'}</p>
                <DetailRow label="Email" value={institution?.email} />
                <DetailRow label="Phone" value={institution?.phone} />
                <DetailRow label="Type" value={institution?.type} />
                <DetailRow label="Location" value={[institution?.city, institution?.state, institution?.country].filter(Boolean).join(', ') || '-'} />
                <DetailRow label="Address" value={institution?.address} />
                <DetailRow label="Contact person" value={institution?.contact_person} />
                {institution?.website_url ? (
                  <DetailRow label="Website" value={<a href={institution.website_url} target="_blank" rel="noreferrer" className="text-[#008260] hover:underline">{institution.website_url}</a>} />
                ) : null}
              </div>

              {/* Requirement */}
              <div className="rounded-lg border border-slate-200 p-4">
                <p className="mb-2 font-semibold text-slate-950">{project?.title || 'Requirement'}</p>
                {project?.description ? <p className="mb-3 text-sm text-slate-700">{project.description}</p> : null}
                <DetailRow label="Unique ID" value={project?.unique_code} />
                <DetailRow label="Type" value={project?.type} />
                <DetailRow label="Required expertise" value={Array.isArray(project?.required_expertise) ? project.required_expertise.join(', ') : '-'} />
                <DetailRow label="Start date" value={formatDate(project?.start_date)} />
                <DetailRow label="End date" value={formatDate(project?.end_date)} />
                <DetailRow label="Duration" value={project?.duration_hours ? `${project.duration_hours} hrs total` : (project?.hours_per_day ? `${project.hours_per_day} hrs/day` : '-')} />
              </div>

              {/* Payment / compensation */}
              <div className="rounded-lg border border-slate-200 bg-emerald-50/40 p-4">
                <p className="mb-2 font-semibold text-slate-950">Payment details</p>
                <DetailRow label="Locked rate" value={rate ? `${moneyInr(rate)} / ${unitShort}` : 'Not locked yet'} />
                <DetailRow label="Compensation unit" value={application?.compensation_unit || project?.compensation_unit || '-'} />
                <DetailRow label="Quantity" value={application?.unit_quantity || project?.unit_quantity || '-'} />
                <DetailRow label="Institution pays (posted)" value={project?.institution_gross_per_unit ? moneyInr(project.institution_gross_per_unit) : '-'} />
                <DetailRow label="Total budget" value={project?.total_budget ? moneyInr(project.total_budget) : '-'} />

                <div className="my-3 rounded-md border border-emerald-200 bg-white/70 p-3">
                  <DetailRow
                    label="Expert earns (net total)"
                    value={
                      expertNetTotal != null ? (
                        <span className="font-semibold text-emerald-800">{moneyInr(expertNetTotal)}</span>
                      ) : 'Not available'
                    }
                  />
                  <DetailRow label="Platform margin" value={platformFeeTotal != null ? moneyInr(platformFeeTotal) : '-'} />
                  <p className="pt-1 text-xs text-slate-500">
                    {selectedRow.offer_letter_url
                      ? 'Professional fee stated in the generated offer letter.'
                      : 'Professional fee the offer letter will state once verified.'}
                  </p>
                </div>

                <DetailRow label="Applied on" value={formatDate(application?.applied_at)} />
                <DetailRow label="Reviewed on" value={formatDate(application?.reviewed_at)} />
                {application?.rate_note ? <DetailRow label="Rate note" value={application.rate_note} /> : null}
                {application?.cover_letter ? (
                  <div className="pt-2 text-sm">
                    <p className="text-slate-500">Cover letter</p>
                    <p className="mt-1 whitespace-pre-wrap text-slate-800">{application.cover_letter}</p>
                  </div>
                ) : null}
              </div>

              {selectedRow.offer_letter_url ? (
                <a href={selectedRow.offer_letter_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-sm text-[#008260] hover:underline">
                  <FileText className="mr-1 h-4 w-4" />
                  View generated offer letter (PDF)
                </a>
              ) : null}

              {selectedRow.status === 'accepted' && (selectedRow.signature_name || selectedRow.signed_offer_letter_url) ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-900">Signed by expert</p>
                  <DetailRow label="Signature" value={selectedRow.signature_name || '-'} />
                  <DetailRow label="Signed on" value={formatDate(selectedRow.signature_date || selectedRow.signed_at)} />
                  {selectedRow.signed_offer_letter_url ? (
                    <a href={selectedRow.signed_offer_letter_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center text-sm font-medium text-emerald-700 hover:underline">
                      <FileText className="mr-1 h-4 w-4" />
                      View signed offer letter (PDF)
                    </a>
                  ) : null}
                </div>
              ) : null}

              {selectedRow.status === 'pending_review' ? (
                <div className="flex justify-end border-t border-slate-100 pt-4">
                  <Button
                    className="bg-[#008260] hover:bg-[#006d51]"
                    disabled={verifyingId === selectedRow.id}
                    onClick={() => verify(selectedRow)}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {verifyingId === selectedRow.id ? 'Sending...' : 'Verify & Send Offer Letter'}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
