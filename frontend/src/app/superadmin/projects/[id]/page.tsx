'use client'

import { useEffect, useMemo, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Hash, RefreshCw } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { superAdminApi } from '@/lib/superadmin/api'
import { normalizeProjectStatus, projectStatusLabel } from '@/lib/projectStatus'

const STAGES = [
  { value: 'pending', label: 'Pending' },
  { value: 'interview', label: 'Interview' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'selected', label: 'Selected' },
]

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-'
}

function derivedStatusLabel(status: string) {
  const normalized = normalizeProjectStatus(status)
  if (normalized === 'pending') return 'Open'
  return projectStatusLabel(normalized)
}

export default function SuperAdminProjectDetailPage({
  params: routeParams,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(routeParams)
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeStage, setActiveStage] = useState('pending')

  const decoded = decodeURIComponent(resolvedParams.id)
  const { requirementType, requirementId } = useMemo(() => {
    const [type, ...rest] = decoded.split(':')
    return { requirementType: type || 'project', requirementId: rest.join(':') || decoded }
  }, [decoded])

  async function loadDetail() {
    setLoading(true)
    setError('')
    try {
      const res = await superAdminApi.projectDetail(requirementType, requirementId)
      setDetail(res)
    } catch (err) {
      setDetail(null)
      setError(err instanceof Error ? err.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDetail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirementType, requirementId])

  const requirement = detail?.requirement
  const institution = detail?.institution || requirement?.institutions
  const nativeApplications = detail?.nativeApplications || []
  const bookings = detail?.bookings || []

  const bookingExpertIds = new Set(bookings.map((booking: any) => String(booking.expert_id || '')))
  const pendingRows = nativeApplications
    .filter((row: any) => row.status === 'pending')
    .map((row: any) => ({ kind: 'application', row }))
  const interviewRows = nativeApplications
    .filter((row: any) => row.status === 'interview')
    .map((row: any) => ({ kind: 'application', row }))
  const rejectedRows = nativeApplications
    .filter((row: any) => ['rejected', 'rejected_corporate'].includes(row.status))
    .map((row: any) => ({ kind: 'application', row }))
  const selectedRows = [
    ...bookings.map((row: any) => ({ kind: 'booking', row })),
    ...nativeApplications
      .filter((row: any) => ['accepted', 'shortlisted', 'shortlisted_corporate'].includes(row.status) && !bookingExpertIds.has(String(row.expert_id || '')))
      .map((row: any) => ({ kind: 'application', row })),
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
    return item.row.experts || item.row.site_students
  }

  function getItemStatus(item: any) {
    if (item.kind === 'booking') return item.row.status || 'selected'
    return item.row.status || '-'
  }

  if (loading) {
    return <p className="text-sm text-slate-600">Loading project...</p>
  }
  if (error || !requirement) {
    return (
      <div className="space-y-3">
        <Link href="/superadmin/projects" className="inline-flex items-center gap-2 text-sm font-medium text-[#008260]">
          <ArrowLeft className="h-4 w-4" /> Back to projects
        </Link>
        <p className="text-sm text-red-600">{error || 'Project not found'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/superadmin/projects" className="inline-flex items-center gap-2 text-sm font-medium text-[#008260]">
          <ArrowLeft className="h-4 w-4" /> Back to projects
        </Link>
        <button
          type="button"
          onClick={loadDetail}
          className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:border-[#008260]/40 hover:text-[#008260]"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <SectionCard
        title={requirement.title}
        description={institution?.name ? `Posted by ${institution.name}` : undefined}
        eyebrow={requirementType === 'project' ? 'Training project' : requirementType === 'freelance' ? 'Freelance project' : 'Internship'}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#008260]/10 px-3 py-1 text-sm font-semibold text-[#008260]">
            <Hash className="h-4 w-4" />
            {requirement.unique_code || '—'}
          </span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {derivedStatusLabel(requirement.derived_status || requirement.status)}
          </span>
        </div>
        <div className="mt-4 grid gap-4 text-sm text-slate-700 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Institution</p>
            <p className="mt-1 font-medium text-slate-900">{institution?.name || '-'}</p>
            <p className="text-slate-500">{institution?.email || ''}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Created</p>
            <p className="mt-1 font-medium text-slate-900">{formatDate(requirement.created_at)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Description</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-700">{requirement.description || 'No description'}</p>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending" value={pendingRows.length} tone="amber" />
        <StatCard label="Interview" value={interviewRows.length} tone="blue" />
        <StatCard label="Rejected" value={rejectedRows.length} tone="slate" />
        <StatCard label="Selected" value={selectedRows.length} tone="green" />
      </div>

      <SectionCard title="Applicant pipeline" description="Pending, interview, rejected, and selected applicants for this project.">
        <Tabs value={activeStage} onValueChange={setActiveStage} className="mb-4">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-white p-1 shadow-sm md:grid-cols-4">
            {STAGES.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                {item.label} ({rowsByStage[item.value]?.length || 0})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {activeRows.length ? (
          <div className="space-y-2">
            {activeRows.map((item, index) => {
              const person = getItemPerson(item)
              return (
                <div key={`${item.kind}-${item.row.id || index}`} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                  <div>
                    <p className="font-medium text-slate-900">{person?.name || 'Unknown'}</p>
                    <p className="text-sm text-slate-500">{person?.email || '-'}{person?.phone ? ` · ${person.phone}` : ''}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                    {String(getItemStatus(item)).replace(/_/g, ' ')}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            No records in {STAGES.find((item) => item.value === activeStage)?.label.toLowerCase()}.
          </div>
        )}
      </SectionCard>
    </div>
  )
}
