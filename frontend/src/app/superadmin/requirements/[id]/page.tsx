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
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { DataTable } from '@/components/superadmin/common/DataTable'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { useSuperAdminAccess } from '@/components/superadmin/layout/SuperAdminAccessContext'
import { superAdminApi } from '@/lib/superadmin/api'
import { canAccessAny } from '@/lib/superadmin/permissions'
import type { SuperAdminPermission } from '@/lib/superadmin/types'

const STAGES = [
  { value: 'added', label: 'Added' },
  { value: 'interview_scheduled', label: 'Interview' },
  { value: 'selected', label: 'Selected' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
]

function stageLabel(value: string) {
  return STAGES.find((stage) => stage.value === value)?.label || value
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-'
}

export default function SuperAdminRequirementDetailPage() {
  const params = useParams<{ id: string }>()
  const me = useSuperAdminAccess()
  const [detail, setDetail] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeStage, setActiveStage] = useState('added')
  const [expertSearch, setExpertSearch] = useState('')
  const [experts, setExperts] = useState<any[]>([])
  const [expertId, setExpertId] = useState('')
  const [stage, setStage] = useState('added')
  const [interviewAt, setInterviewAt] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

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
      await superAdminApi.addRequirementExpert(requirementId, {
        expert_id: expertId,
        requirement_type: requirementType,
        stage,
        interview_scheduled_at: interviewAt || null,
        notes,
      })
      setExpertId('')
      setStage('added')
      setInterviewAt('')
      setNotes('')
      toast.success('Expert added')
      await loadDetail()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add expert')
    } finally {
      setSaving(false)
    }
  }

  async function updateCandidate(row: any, nextStage: string) {
    try {
      await superAdminApi.updateRequirementExpert(requirementId, row.id, {
        stage: nextStage,
        interview_scheduled_at: row.interview_scheduled_at || null,
        notes: row.notes || null,
      })
      toast.success('Pipeline updated')
      await loadDetail()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update expert')
    }
  }

  async function runCandidateAction(row: any, action: string) {
    let interviewValue = row.interview_scheduled_at || null
    if (action === 'schedule_interview') {
      const typed = window.prompt('Interview date/time (YYYY-MM-DDTHH:mm)', interviewValue ? interviewValue.slice(0, 16) : '')
      if (typed === null) return
      interviewValue = typed || null
    }
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
    }
  }

  const requirement = detail?.requirement
  const pipeline = detail?.pipeline || []
  const stageRows = pipeline.filter((row: any) => row.stage === activeStage)
  const nativeApplications = detail?.nativeApplications || []
  const counts = detail?.counts || {}
  const managePermissions: SuperAdminPermission[] = requirementType === 'freelance'
    ? ['requirements:candidates', 'freelance:write']
    : requirementType === 'internship'
      ? ['requirements:candidates', 'internships:write']
      : ['requirements:candidates']
  const canManagePipeline = canAccessAny(me, managePermissions)

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
          <div className="grid gap-4 md:grid-cols-5">
            <StatCard label="Added" value={counts.added || 0} />
            <StatCard label="Interview" value={counts.interview_scheduled || 0} tone="blue" />
            <StatCard label="Selected" value={counts.selected || 0} tone="green" />
            <StatCard label="Completed" value={counts.completed || 0} tone="violet" />
            <StatCard label="Applications" value={counts.applications_total || 0} tone="amber" />
          </div>

          <SectionCard title={requirement.title || 'Requirement'} description={`${requirement.requirement_type} requirement`}>
            <div className="grid gap-4 text-sm md:grid-cols-3">
              <div><span className="font-medium text-slate-950">Institution:</span> {requirement.institutions?.name || '-'}</div>
              <div><span className="font-medium text-slate-950">Status:</span> {requirement.status || requirement.call_status || '-'}</div>
              <div><span className="font-medium text-slate-950">Created:</span> {formatDate(requirement.created_at)}</div>
              {requirement.hourly_rate ? <div><span className="font-medium text-slate-950">Hourly:</span> Rs. {requirement.hourly_rate}</div> : null}
              {requirement.total_budget ? <div><span className="font-medium text-slate-950">Budget:</span> Rs. {requirement.total_budget}</div> : null}
              {requirement.budget_min || requirement.budget_max ? <div><span className="font-medium text-slate-950">Budget:</span> {[requirement.budget_min, requirement.budget_max].filter(Boolean).join(' - ')}</div> : null}
              {requirement.stipend_min || requirement.stipend_max ? <div><span className="font-medium text-slate-950">Stipend:</span> {[requirement.stipend_min, requirement.stipend_max].filter(Boolean).join(' - ')}</div> : null}
              {requirement.deadline ? <div><span className="font-medium text-slate-950">Deadline:</span> {new Date(requirement.deadline).toLocaleDateString()}</div> : null}
              {requirement.work_mode ? <div><span className="font-medium text-slate-950">Mode:</span> {requirement.work_mode}</div> : null}
              {requirement.location ? <div><span className="font-medium text-slate-950">Location:</span> {requirement.location}</div> : null}
            </div>
            {requirement.description || requirement.responsibilities ? (
              <p className="mt-4 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                {requirement.description || requirement.responsibilities}
              </p>
            ) : null}
          </SectionCard>

          {canManagePipeline ? (
            <SectionCard title="Add Expert" description="Assign an expert directly to this requirement pipeline.">
              <form onSubmit={addExpert} className="grid gap-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="expertSearch">Search expert</Label>
                  <Input id="expertSearch" value={expertSearch} onChange={(e) => setExpertSearch(e.target.value)} placeholder="Search by name or email" />
                </div>
                <div className="space-y-2">
                  <Label>Expert</Label>
                  <Select value={expertId} onValueChange={setExpertId}>
                    <SelectTrigger><SelectValue placeholder="Select expert" /></SelectTrigger>
                    <SelectContent>
                      {experts.map((expert) => (
                        <SelectItem key={expert.id} value={expert.id}>{expert.name} ({expert.email})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select value={stage} onValueChange={setStage}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interviewAt">Interview time</Label>
                  <Input id="interviewAt" type="datetime-local" value={interviewAt} onChange={(e) => setInterviewAt(e.target.value)} />
                </div>
                <div className="space-y-2 lg:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
                <div className="lg:col-span-2">
                  <Button type="submit" className="bg-[#008260] hover:bg-[#006d51]" disabled={saving}>
                    {saving ? 'Adding...' : 'Add expert'}
                  </Button>
                </div>
              </form>
            </SectionCard>
          ) : null}

          <SectionCard title="Expert Pipeline" description="Manage experts through added, interview, selected, completed, and rejected stages.">
            <Tabs value={activeStage} onValueChange={setActiveStage} className="mb-4">
              <TabsList>
                {STAGES.map((item) => (
                  <TabsTrigger key={item.value} value={item.value}>{item.label} ({counts[item.value] || 0})</TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <DataTable
              rows={stageRows}
              columns={[
                { key: 'expert', header: 'Expert', render: (row) => <span className="font-medium text-slate-950">{row.experts?.name || row.expert_id}</span> },
                { key: 'email', header: 'Email', render: (row) => row.experts?.email || '-' },
                { key: 'rate', header: 'Rate', render: (row) => row.experts?.hourly_rate ? `Rs. ${row.experts.hourly_rate}/hr` : '-' },
                { key: 'completed', header: 'Completed', render: (row) => row.expert_stats?.completed_trainings || 0 },
                { key: 'hours', header: 'Approved Hours', render: (row) => row.expert_stats?.approved_hours || 0 },
                { key: 'interview', header: 'Interview', render: (row) => formatDate(row.interview_scheduled_at) },
                { key: 'notes', header: 'Notes', render: (row) => row.notes || '-' },
                {
                  key: 'stage',
                  header: 'Workflow',
                  render: (row) => canManagePipeline ? (
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => runCandidateAction(row, 'notify')}>Notify</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => runCandidateAction(row, 'schedule_interview')}>Interview</Button>
                      <Button type="button" size="sm" className="bg-[#008260] hover:bg-[#006d51]" onClick={() => runCandidateAction(row, 'select')}>Select</Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => runCandidateAction(row, 'complete')}>Complete</Button>
                      <Button type="button" size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => runCandidateAction(row, 'reject')}>Reject</Button>
                    </div>
                    ) : <span className="text-slate-400">{stageLabel(row.stage)}</span>,
                },
              ]}
              emptyText="No experts in this stage."
            />
          </SectionCard>

          <SectionCard title="Native Applications" description="Applications submitted through the existing student/expert workflows.">
            <DataTable
              rows={nativeApplications}
              columns={[
                { key: 'person', header: 'Applicant', render: (row) => row.experts?.name || row.site_students?.name || row.expert_id || row.student_id || '-' },
                { key: 'email', header: 'Email', render: (row) => row.experts?.email || row.site_students?.email || '-' },
                { key: 'status', header: 'Status', render: (row) => row.status || '-' },
                { key: 'created', header: 'Created', render: (row) => formatDate(row.created_at || row.applied_at) },
              ]}
              emptyText="No native applications found."
            />
          </SectionCard>
        </>
      ) : null}
    </div>
  )
}
