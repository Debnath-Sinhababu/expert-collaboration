'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { TrainingAttendancePanel } from '@/components/training/TrainingAttendancePanel'
import { useSuperAdminAccess } from '@/components/superadmin/layout/SuperAdminAccessContext'
import { superAdminApi } from '@/lib/superadmin/api'
import { canAccessAny } from '@/lib/superadmin/permissions'
import type { SuperAdminPermission } from '@/lib/superadmin/types'

const STAGES = [
  { value: 'pending', label: 'Pending' },
  { value: 'interview', label: 'Interview' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'selected', label: 'Selected' },
]

const ADD_STAGES = [
  { value: 'added', label: 'Add as pending and notify' },
  { value: 'interview_scheduled', label: 'Schedule interview' },
]

function stageLabel(value: string) {
  if (value === 'added') return 'Pending'
  if (value === 'interview_scheduled') return 'Interview'
  if (value === 'completed') return 'Completed'
  return STAGES.find((stage) => stage.value === value)?.label || value
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-'
}

function money(value: unknown) {
  return `Rs. ${Number(value || 0).toFixed(2)}`
}

function paymentSummaryCard(label: string, record: any) {
  if (!record) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
        <p className="mt-1 text-sm font-medium text-slate-700">Not calculated yet</p>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold capitalize text-slate-700">{record.status || 'pending'}</span>
      </div>
      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
        <div><span className="text-slate-500">Amount</span><p className="font-semibold text-slate-950">{money(record.invoice_amount || record.calculated_amount)}</p></div>
        <div><span className="text-slate-500">Paid</span><p className="font-semibold text-slate-950">{money(record.paid_amount)}</p></div>
        <div><span className="text-slate-500">Remaining</span><p className="font-semibold text-slate-950">{money(record.remaining_amount)}</p></div>
      </div>
      {record.pdf_url ? <a className="mt-2 inline-block text-sm font-medium text-[#008260]" href={record.pdf_url} target="_blank" rel="noreferrer">Open invoice</a> : null}
    </div>
  )
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 16)
}

export default function SuperAdminRequirementDetailPage() {
  const params = useParams<{ id: string }>()
  const me = useSuperAdminAccess()
  const [detail, setDetail] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeStage, setActiveStage] = useState('pending')
  const [expertSearch, setExpertSearch] = useState('')
  const [experts, setExperts] = useState<any[]>([])
  const [expertId, setExpertId] = useState('')
  const [stage, setStage] = useState('added')
  const [interviewAt, setInterviewAt] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [workflowSaving, setWorkflowSaving] = useState(false)
  const [interviewDialog, setInterviewDialog] = useState<null | {
    kind: 'pipeline' | 'native'
    row: any
    value: string
  }>(null)

  const decoded = decodeURIComponent(params.id)
  const { requirementType, requirementId } = useMemo(() => {
    const [type, ...rest] = decoded.split(':')
    return { requirementType: type || 'project', requirementId: rest.join(':') || decoded }
  }, [decoded])

  async function loadDetail() {
    setLoading(true)
    setError('')
    try {
      const res = await superAdminApi.requirementDetail(requirementType, requirementId)
      setDetail(res)
    } catch (err) {
      setDetail(null)
      setError(err instanceof Error ? err.message : 'Failed to load requirement')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
  }, [requirementType, requirementId])

  useEffect(() => {
    const t = setTimeout(() => {
      if (!expertSearch.trim()) {
        setExperts([])
        return
      }
      superAdminApi.profiles({ type: 'experts', search: expertSearch, limit: 10 })
        .then((res) => setExperts(res.data || []))
        .catch(() => setExperts([]))
    }, 250)
    return () => clearTimeout(t)
  }, [expertSearch])

  async function addExpert(e: React.FormEvent) {
    e.preventDefault()
    if (!expertId) {
      toast.error('Select an expert')
      return
    }
    setSaving(true)
    try {
      const created = await superAdminApi.addRequirementExpert(requirementId, {
        expert_id: expertId,
        requirement_type: requirementType,
        stage,
        interview_scheduled_at: interviewAt || null,
        notes,
      })
      if (!created?.id) {
        throw new Error('Expert was not added. The backend did not return an application id.')
      }
      setExpertId('')
      setExpertSearch('')
      setStage('added')
      setInterviewAt('')
      setNotes('')
      toast.success(stage === 'interview_scheduled' ? 'Expert moved to interview' : 'Expert notified')
      await loadDetail()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add expert')
    } finally {
      setSaving(false)
    }
  }

  async function runCandidateAction(row: any, action: string, interviewValue = row.interview_scheduled_at || null) {
    setWorkflowSaving(true)
    try {
      await superAdminApi.runRequirementExpertAction(requirementId, row.id, {
        action,
        interview_scheduled_at: interviewValue,
        notes: row.notes || null,
      })
      toast.success('Workflow updated')
      await loadDetail()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update workflow')
    } finally {
      setWorkflowSaving(false)
    }
  }

  async function updateNativeApplication(row: any, status: string, interviewValue?: string | null) {
    setWorkflowSaving(true)
    try {
      await superAdminApi.updateNativeRequirementApplication(requirementType, requirementId, row.id, {
        status,
        interview_scheduled_at: interviewValue || null,
      })
      toast.success('Application updated')
      await loadDetail()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update application')
    } finally {
      setWorkflowSaving(false)
    }
  }

  async function updateBooking(row: any, status: string) {
    setWorkflowSaving(true)
    try {
      await superAdminApi.updateRequirementBooking(requirementType, requirementId, row.id, { status })
      toast.success('Booking updated')
      await loadDetail()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update booking')
    } finally {
      setWorkflowSaving(false)
    }
  }

  async function confirmInterview() {
    if (!interviewDialog) return
    const current = interviewDialog
    setInterviewDialog(null)
    if (current.kind === 'pipeline') {
      await runCandidateAction(current.row, 'schedule_interview', current.value || null)
      return
    }
    await updateNativeApplication(current.row, 'interview', current.value || null)
  }

  function nativeActions(row: any) {
    if (!canManagePipeline) return null
    if (requirementType === 'project') {
      return (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={workflowSaving} onClick={() => setInterviewDialog({ kind: 'native', row, value: toDatetimeLocal(row.interview_date) })}>Interview</Button>
          <Button type="button" size="sm" className="bg-[#008260] hover:bg-[#006d51]" disabled={workflowSaving} onClick={() => updateNativeApplication(row, 'accepted')}>Select</Button>
          <Button type="button" size="sm" variant="outline" disabled={workflowSaving} onClick={() => updateNativeApplication(row, 'pending')}>Pending</Button>
          <Button type="button" size="sm" variant="outline" className="text-red-600 hover:text-red-700" disabled={workflowSaving} onClick={() => updateNativeApplication(row, 'rejected')}>Reject</Button>
        </div>
      )
    }
    if (requirementType === 'internship') {
      return (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" disabled={workflowSaving} onClick={() => setInterviewDialog({ kind: 'native', row, value: toDatetimeLocal(row.interview_scheduled_at) })}>Interview</Button>
          <Button type="button" size="sm" className="bg-[#008260] hover:bg-[#006d51]" disabled={workflowSaving} onClick={() => updateNativeApplication(row, 'shortlisted_corporate')}>Shortlist</Button>
          <Button type="button" size="sm" variant="outline" disabled={workflowSaving} onClick={() => updateNativeApplication(row, 'pending')}>Pending</Button>
          <Button type="button" size="sm" variant="outline" className="text-red-600 hover:text-red-700" disabled={workflowSaving} onClick={() => updateNativeApplication(row, 'rejected_corporate')}>Reject</Button>
        </div>
      )
    }
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" className="bg-[#008260] hover:bg-[#006d51]" disabled={workflowSaving} onClick={() => updateNativeApplication(row, 'shortlisted')}>Shortlist</Button>
        <Button type="button" size="sm" variant="outline" disabled={workflowSaving} onClick={() => updateNativeApplication(row, 'pending')}>Pending</Button>
        <Button type="button" size="sm" variant="outline" className="text-red-600 hover:text-red-700" disabled={workflowSaving} onClick={() => updateNativeApplication(row, 'rejected')}>Reject</Button>
      </div>
    )
  }

  function detailValue(label: string, value: any) {
    if (value === undefined || value === null || value === '') return null
    return <div><span className="font-medium text-slate-950">{label}:</span> {String(value)}</div>
  }

  const requirement = detail?.requirement
  const institution = detail?.institution || requirement?.institutions
  const pipeline = detail?.pipelineExperts || detail?.pipeline || []
  const nativeApplications = detail?.nativeApplications || []
  const bookings = detail?.bookings || []
  const attendanceSummary = detail?.attendanceSummary || {}
  const counts = detail?.counts || {}
  const managePermissions: SuperAdminPermission[] = requirementType === 'freelance'
    ? ['requirements:candidates', 'freelance:write']
    : requirementType === 'internship'
      ? ['requirements:candidates', 'internships:write']
      : ['requirements:candidates']
  const canManagePipeline = canAccessAny(me, managePermissions)
  const bookingExpertIds = new Set(bookings.map((booking: any) => String(booking.expert_id || '')))
  const nativeExpertIds = new Set(nativeApplications.map((application: any) => String(application.expert_id || application.student_id || '')))
  const pendingRows = [
    ...nativeApplications.filter((row: any) => row.status === 'pending').map((row: any) => ({ kind: 'application', row })),
    ...pipeline
      .filter((row: any) => row.stage === 'added' && !nativeExpertIds.has(String(row.expert_id || '')))
      .map((row: any) => ({ kind: 'pipeline', row })),
  ]
  const interviewRows = [
    ...nativeApplications.filter((row: any) => row.status === 'interview').map((row: any) => ({ kind: 'application', row })),
    ...pipeline
      .filter((row: any) => row.stage === 'interview_scheduled' && !nativeExpertIds.has(String(row.expert_id || '')))
      .map((row: any) => ({ kind: 'pipeline', row })),
  ]
  const rejectedRows = [
    ...nativeApplications
      .filter((row: any) => ['rejected', 'rejected_corporate'].includes(row.status))
      .map((row: any) => ({ kind: 'application', row })),
    ...pipeline
      .filter((row: any) => row.stage === 'rejected' && !nativeExpertIds.has(String(row.expert_id || '')))
      .map((row: any) => ({ kind: 'pipeline', row })),
  ]
  const selectedRows = [
    ...bookings.map((row: any) => ({ kind: 'booking', row })),
    ...nativeApplications
      .filter((row: any) => ['accepted', 'shortlisted', 'shortlisted_corporate'].includes(row.status) && !bookingExpertIds.has(String(row.expert_id || '')))
      .map((row: any) => ({ kind: 'application', row })),
    ...pipeline
      .filter((row: any) => ['selected', 'completed'].includes(row.stage) && !nativeExpertIds.has(String(row.expert_id || '')))
      .map((row: any) => ({ kind: 'pipeline', row })),
  ]
  const rowsByStage: Record<string, any[]> = {
    pending: pendingRows,
    interview: interviewRows,
    rejected: rejectedRows,
    selected: selectedRows,
  }
  const activeRows = rowsByStage[activeStage] || []

  function getItemPerson(item: any) {
    if (item.kind === 'booking') return item.row.experts
    if (item.kind === 'pipeline') return item.row.experts
    return item.row.experts || item.row.site_students
  }

  function getItemStatus(item: any) {
    if (item.kind === 'booking') return item.row.status || 'selected'
    if (item.kind === 'pipeline') return stageLabel(item.row.stage)
    return item.row.status || '-'
  }

  function renderStatusActions(item: any) {
    if (!canManagePipeline) return null
    if (item.kind === 'booking') {
      return (
        <div className="flex flex-wrap gap-2">
          {item.row.status !== 'completed' ? (
            <Button type="button" size="sm" className="bg-[#008260] hover:bg-[#006d51]" disabled={workflowSaving} onClick={() => updateBooking(item.row, 'completed')}>Mark completed</Button>
          ) : null}
          {item.row.status !== 'cancelled' ? (
            <Button type="button" size="sm" variant="outline" className="text-red-600 hover:text-red-700" disabled={workflowSaving} onClick={() => updateBooking(item.row, 'cancelled')}>Cancel</Button>
          ) : null}
        </div>
      )
    }
    if (item.kind === 'pipeline') {
      return (
        <div className="flex flex-wrap gap-2">
          {item.row.stage === 'added' ? (
            <Button type="button" size="sm" variant="outline" disabled={workflowSaving} onClick={() => runCandidateAction(item.row, 'notify')}>Notify</Button>
          ) : null}
          {item.row.stage !== 'interview_scheduled' ? (
            <Button type="button" size="sm" variant="outline" disabled={workflowSaving} onClick={() => setInterviewDialog({ kind: 'pipeline', row: item.row, value: toDatetimeLocal(item.row.interview_scheduled_at) })}>Interview</Button>
          ) : null}
          <Button type="button" size="sm" className="bg-[#008260] hover:bg-[#006d51]" disabled={workflowSaving} onClick={() => runCandidateAction(item.row, 'select')}>Select</Button>
          <Button type="button" size="sm" variant="outline" className="text-red-600 hover:text-red-700" disabled={workflowSaving} onClick={() => runCandidateAction(item.row, 'reject')}>Reject</Button>
        </div>
      )
    }
    return nativeActions(item.row)
  }

  function renderStatusCard(item: any) {
    const person = getItemPerson(item)
    const booking = item.kind === 'booking' ? item.row : null
    const title = person?.name || item.row.expert_id || item.row.student_id || 'Unknown'
    return (
      <div key={`${item.kind}-${item.row.id}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-semibold text-slate-950">{title}</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">{getItemStatus(item)}</span>
              {item.kind === 'booking' ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-[#008260]">Booking</span> : null}
            </div>
            <p className="mt-1 text-sm text-slate-600">{person?.email || person?.phone || '-'}</p>
            {person?.bio ? <p className="mt-3 line-clamp-2 text-sm text-slate-700">{person.bio}</p> : null}
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div><span className="text-slate-500">Rate</span><p className="font-medium text-slate-950">{person?.hourly_rate ? `Rs. ${person.hourly_rate}/hr` : '-'}</p></div>
              <div><span className="text-slate-500">Experience</span><p className="font-medium text-slate-950">{person?.experience_years != null ? `${person.experience_years} years` : '-'}</p></div>
              <div><span className="text-slate-500">Domain</span><p className="font-medium text-slate-950">{Array.isArray(person?.domain_expertise) ? person.domain_expertise.join(', ') : person?.domain_expertise || '-'}</p></div>
              <div><span className="text-slate-500">Interview</span><p className="font-medium text-slate-950">{formatDate(item.row.interview_date || item.row.interview_scheduled_at)}</p></div>
              {booking ? <div><span className="text-slate-500">Booked Hours</span><p className="font-medium text-slate-950">{booking.hours_booked || 0}</p></div> : null}
              {booking ? <div><span className="text-slate-500">Approved Hours</span><p className="font-medium text-slate-950">{booking.approved_hours || 0}</p></div> : null}
              {booking ? <div><span className="text-slate-500">Payment</span><p className="font-medium text-slate-950">{booking.payment_status || '-'}</p></div> : null}
              {booking ? <div><span className="text-slate-500">Dates</span><p className="font-medium text-slate-950">{booking.start_date || '-'} to {booking.end_date || '-'}</p></div> : null}
            </div>
            {person?.subskills?.length ? <p className="mt-3 text-sm text-slate-600"><span className="font-medium text-slate-800">Skills:</span> {person.subskills.join(', ')}</p> : null}
            {booking ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {paymentSummaryCard('Expert payable', booking.finance_summary?.expert)}
                {paymentSummaryCard('Institute receivable', booking.finance_summary?.institution)}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col gap-2 lg:min-w-56">
            {renderStatusActions(item)}
          </div>
        </div>
        {booking && requirementType === 'project' ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <TrainingAttendancePanel
              bookingId={booking.id}
              startDate={booking.start_date}
              endDate={booking.end_date}
              hoursBooked={booking.hours_booked}
              bookingStatus={booking.status}
              expectedViewerRole="institution"
              defaultExpanded={booking.status === 'in_progress'}
            />
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Button asChild variant="outline" className="w-fit">
          <Link href="/superadmin/requirements">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to requirements
          </Link>
        </Button>
        <Button type="button" variant="outline" onClick={loadDetail} disabled={loading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {loading ? <SectionCard title="Loading">Loading requirement...</SectionCard> : null}
      {error ? <SectionCard title="Requirement"><p className="text-sm text-red-600">{error}</p></SectionCard> : null}

      {!loading && !error && requirement ? (
        <>
          <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-7">
            <StatCard label="Pending" value={pendingRows.length} />
            <StatCard label="Interview" value={interviewRows.length} tone="blue" />
            <StatCard label="Selected" value={selectedRows.length} tone="green" />
            <StatCard label="Rejected" value={rejectedRows.length} tone="amber" />
            <StatCard label="Applications" value={counts.applications_total || 0} tone="amber" />
            <StatCard label="Bookings" value={counts.bookings_total || 0} tone="blue" />
            <StatCard label="Approved Hours" value={counts.approved_hours || 0} tone="green" />
          </div>

          <SectionCard title={requirement.title || 'Requirement'} description={`${requirement.requirement_type} requirement`}>
            <div className="grid gap-4 text-sm md:grid-cols-3">
              {detailValue('Institution', institution?.name || '-')}
              {detailValue('Institution Email', institution?.email)}
              {detailValue('Status', requirement.status || requirement.call_status || '-')}
              {detailValue('Created', formatDate(requirement.created_at))}
              {detailValue('Project Type', requirement.type)}
              {detailValue('Domain', requirement.domain_expertise)}
              {detailValue('Required Expertise', Array.isArray(requirement.required_expertise) ? requirement.required_expertise.join(', ') : requirement.required_expertise)}
              {detailValue('Skills', Array.isArray(requirement.skills_required || requirement.required_skills) ? (requirement.skills_required || requirement.required_skills).join(', ') : requirement.skills_required || requirement.required_skills)}
              {detailValue('Subskills', Array.isArray(requirement.subskills) ? requirement.subskills.join(', ') : requirement.subskills)}
              {requirement.hourly_rate ? detailValue('Hourly', `Rs. ${requirement.hourly_rate}`) : null}
              {requirement.total_budget ? detailValue('Budget', `Rs. ${requirement.total_budget}`) : null}
              {requirement.budget_min || requirement.budget_max ? detailValue('Budget', [requirement.budget_min, requirement.budget_max].filter(Boolean).join(' - ')) : null}
              {requirement.stipend_min || requirement.stipend_max ? detailValue('Stipend', [requirement.stipend_min, requirement.stipend_max].filter(Boolean).join(' - ')) : null}
              {requirement.start_date ? detailValue('Start Date', new Date(requirement.start_date).toLocaleDateString()) : null}
              {requirement.end_date ? detailValue('End Date', new Date(requirement.end_date).toLocaleDateString()) : null}
              {requirement.deadline ? detailValue('Deadline', new Date(requirement.deadline).toLocaleDateString()) : null}
              {detailValue('Duration Hours', requirement.duration_hours)}
              {detailValue('Work Mode', requirement.work_mode || requirement.workplace_type)}
              {detailValue('Engagement', requirement.engagement || requirement.employment_type)}
              {detailValue('Openings', requirement.openings)}
              {detailValue('Location', requirement.location || requirement.job_location)}
            </div>
            {requirement.description || requirement.responsibilities ? (
              <p className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                {requirement.description || requirement.responsibilities}
              </p>
            ) : null}
          </SectionCard>

          {canManagePipeline ? (
            <SectionCard title="Add Expert" description="Add an expert into the same pending or interview flow used by the institute dashboard.">
              <form onSubmit={addExpert} className="grid gap-4 lg:grid-cols-2">
                <div className="relative space-y-2 lg:col-span-2">
                  <Label htmlFor="expertSearch">Expert</Label>
                  <Input
                    id="expertSearch"
                    value={expertSearch}
                    onChange={(e) => {
                      setExpertSearch(e.target.value)
                      setExpertId('')
                    }}
                    placeholder="Search and select expert by name or email"
                  />
                  {experts.length > 0 && !expertId ? (
                    <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                      {experts.map((expert) => (
                        <button
                          type="button"
                          key={expert.id}
                          className="block w-full border-b border-slate-100 px-3 py-3 text-left text-sm hover:bg-slate-50"
                          onClick={() => {
                            setExpertId(expert.id)
                            setExpertSearch(`${expert.name} (${expert.email})`)
                            setExperts([])
                          }}
                        >
                          <span className="font-medium text-slate-950">{expert.name}</span>
                          <span className="ml-2 text-slate-500">{expert.email}</span>
                          {expert.hourly_rate ? <span className="ml-2 text-slate-500">Rs. {expert.hourly_rate}/hr</span> : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {expertId ? <p className="text-xs font-medium text-[#008260]">Expert selected</p> : null}
                </div>
                <div className="space-y-2">
                  <Label>Initial action</Label>
                  <Select value={stage} onValueChange={setStage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ADD_STAGES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {stage === 'interview_scheduled' ? (
                  <div className="space-y-2">
                    <Label htmlFor="interviewAt">Interview time</Label>
                    <Input id="interviewAt" type="datetime-local" value={interviewAt} onChange={(e) => setInterviewAt(e.target.value)} />
                  </div>
                ) : null}
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="lg:col-span-2">
                  <Button type="submit" className="bg-[#008260] hover:bg-[#006d51]" disabled={saving}>
                    {saving ? 'Saving...' : stage === 'interview_scheduled' ? 'Schedule interview' : 'Add and notify'}
                  </Button>
                </div>
              </form>
            </SectionCard>
          ) : null}

          <SectionCard title="Applications And Expert Flow" description="Manage the same pending, interview, rejected, and selected flow visible in the institute dashboard.">
            <Tabs value={activeStage} onValueChange={setActiveStage} className="mb-4">
              <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-white p-1 shadow-sm md:grid-cols-4">
                {STAGES.map((item) => (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className="rounded-lg py-3 text-sm font-semibold data-[state=active]:bg-emerald-50 data-[state=active]:text-[#008260] data-[state=active]:shadow-none"
                  >
                    {item.label} ({rowsByStage[item.value]?.length || 0})
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {activeRows.length ? (
              <div className="space-y-4">
                {activeRows.map(renderStatusCard)}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                No records in {STAGES.find((item) => item.value === activeStage)?.label.toLowerCase()}.
              </div>
            )}
          </SectionCard>

        </>
      ) : null}

      <Dialog open={Boolean(interviewDialog)} onOpenChange={(open) => !open && setInterviewDialog(null)}>
        <DialogContent className="bg-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="workflowInterviewAt">Interview date and time</Label>
            <Input
              id="workflowInterviewAt"
              type="datetime-local"
              value={interviewDialog?.value || ''}
              onChange={(e) => setInterviewDialog((current) => current ? { ...current, value: e.target.value } : current)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setInterviewDialog(null)} disabled={workflowSaving}>Cancel</Button>
            <Button type="button" className="bg-[#008260] hover:bg-[#006d51]" onClick={confirmInterview} disabled={workflowSaving}>
              {workflowSaving ? 'Saving...' : 'Save interview'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
