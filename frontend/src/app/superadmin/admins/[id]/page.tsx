'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, Clock3, Download, FileText, ListChecks, Shield, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { DataTable } from '@/components/superadmin/common/DataTable'
import { superAdminApi } from '@/lib/superadmin/api'

const PAGE_SIZE = 20

const ACTIVITY_COPY: Record<string, { label: string; description: string; tone: string }> = {
  'admin.created': {
    label: 'Created an admin account',
    description: 'Added a new admin user to the super admin portal.',
    tone: 'bg-sky-50 text-sky-700 border-sky-100',
  },
  'admin.updated': {
    label: 'Updated admin access',
    description: 'Changed an admin profile, status, or permission set.',
    tone: 'bg-slate-50 text-slate-700 border-slate-200',
  },
  'admin.disabled': {
    label: 'Blocked an admin',
    description: 'Disabled an admin account from accessing the portal.',
    tone: 'bg-red-50 text-red-700 border-red-100',
  },
  'bulk_import.experts': {
    label: 'Imported experts',
    description: 'Ran a bulk import for expert profiles.',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  'bulk_import.students': {
    label: 'Imported students',
    description: 'Ran a bulk import for student profiles.',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  'expert.calxbook_verification.updated': {
    label: 'Updated CalxBook verification',
    description: 'Changed an expert visibility or verification setting.',
    tone: 'bg-violet-50 text-violet-700 border-violet-100',
  },
  'requirement.created': {
    label: 'Created a requirement',
    description: 'Added a new project, internship, or freelance requirement.',
    tone: 'bg-sky-50 text-sky-700 border-sky-100',
  },
  'requirement.assigned': {
    label: 'Assigned a requirement',
    description: 'Made an admin responsible for handling a requirement.',
    tone: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  'requirement.unassigned': {
    label: 'Unassigned a requirement',
    description: 'Removed the current admin owner from a requirement.',
    tone: 'bg-amber-50 text-amber-700 border-amber-100',
  },
  'daily_report.uploaded': {
    label: 'Uploaded a daily report',
    description: 'Submitted a daily progress document for an assigned requirement.',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  'requirement.expert_added': {
    label: 'Added an expert to a requirement',
    description: 'Added or notified an expert for a project requirement.',
    tone: 'bg-sky-50 text-sky-700 border-sky-100',
  },
  'requirement.application_updated': {
    label: 'Updated an application',
    description: 'Changed a candidate/application status in the requirement flow.',
    tone: 'bg-violet-50 text-violet-700 border-violet-100',
  },
  'requirement.booking_updated': {
    label: 'Updated a booking',
    description: 'Changed booking status or booking-level requirement progress.',
    tone: 'bg-violet-50 text-violet-700 border-violet-100',
  },
  'finance.invoice_sent': {
    label: 'Sent a finance invoice',
    description: 'Generated and sent an invoice for a finance payment record.',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  'finance.payment_marked_paid': {
    label: 'Marked a payment as paid',
    description: 'Recorded payment completion for a finance record.',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  'finance.training_confirmed': {
    label: 'Confirmed training finance',
    description: 'Confirmed approved hours and finance amounts for a booking.',
    tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  },
  'export.admin_activity': {
    label: 'Downloaded admin activity',
    description: 'Exported an admin activity workbook.',
    tone: 'bg-slate-50 text-slate-700 border-slate-200',
  },
  'export.business_overview': {
    label: 'Downloaded business overview',
    description: 'Exported the business overview workbook.',
    tone: 'bg-slate-50 text-slate-700 border-slate-200',
  },
}

function activityCopy(action: string) {
  return ACTIVITY_COPY[action] || {
    label: action.split('.').map((part) => part.replace(/_/g, ' ')).join(' '),
    description: 'Portal action recorded for this admin.',
    tone: 'bg-slate-50 text-slate-700 border-slate-200',
  }
}

function formatMetaValue(value: unknown) {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function activityHighlights(row: any) {
  const metadata = row?.metadata && typeof row.metadata === 'object' ? row.metadata : {}
  const keys = [
    'email',
    'assigned_admin_email',
    'status',
    'stage',
    'report_date',
    'filename',
    'amount',
    'approved_hours',
    'successful',
    'failed',
    'total',
  ]
  return keys
    .map((key) => ({ key, value: formatMetaValue(metadata[key]) }))
    .filter((item) => item.value)
}

function activityTarget(row: any) {
  if (row.requirement_type && row.requirement_id) return `${row.requirement_type} requirement`
  if (row.entity_type) return row.entity_type.replace(/_/g, ' ')
  return 'Portal'
}

function activityTargetId(row: any) {
  return row.requirement_id || row.entity_id || ''
}

export default function SuperAdminAdminDetailPage() {
  const params = useParams()
  const id = String(params?.id || '')
  const [detail, setDetail] = useState<any>(null)
  const [activity, setActivity] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ action: '', requirement_type: 'all', date_from: '', date_to: '' })

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      superAdminApi.adminDetail(id),
      superAdminApi.adminActivity(id, { page: 1, limit: PAGE_SIZE }),
    ])
      .then(([detailRes, activityRes]) => {
        setDetail(detailRes)
        setActivity(activityRes.data || [])
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load admin'))
      .finally(() => setLoading(false))
  }, [id])

  async function loadActivity() {
    try {
      const res = await superAdminApi.adminActivity(id, {
        page: 1,
        limit: PAGE_SIZE,
        action: filters.action,
        requirement_type: filters.requirement_type === 'all' ? '' : filters.requirement_type,
        date_from: filters.date_from,
        date_to: filters.date_to,
      })
      setActivity(res.data || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load activity')
    }
  }

  async function exportActivity() {
    try {
      await superAdminApi.exportAdminActivity(id, {
        action: filters.action,
        requirement_type: filters.requirement_type === 'all' ? '' : filters.requirement_type,
        date_from: filters.date_from,
        date_to: filters.date_to,
      })
      toast.success('Export started')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    }
  }

  const admin = detail?.admin
  if (loading) return <div className="text-sm text-slate-600">Loading admin...</div>
  if (!admin) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">Admin not found.</div>

  return (
    <div className="space-y-6">
      <SectionCard title={admin.name || admin.email} description={admin.email} eyebrow="Admin detail">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Status" value={admin.status === 'disabled' ? 'Blocked' : 'Active'} icon={Shield} helper="Current access" />
          <StatCard label="Permissions" value={Array.isArray(admin.permissions) ? admin.permissions.length : 0} icon={UserRound} tone="blue" helper="Granted keys" />
          <StatCard label="Assignments" value={detail.assignmentSummary?.active || 0} icon={ListChecks} tone="amber" helper="Active requirements" />
          <StatCard label="Reports" value={detail.recentReports?.length || 0} icon={FileText} tone="violet" helper="Recent uploads" />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {(admin.permissions || []).map((permission: string) => (
            <Badge key={permission} variant="outline" className="bg-slate-50">{permission}</Badge>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Assigned Requirements" description="Current requirements owned by this admin.">
        <DataTable<any>
          rows={detail.assignmentSummary?.recent || []}
          columns={[
            { key: 'title', header: 'Requirement', render: (row) => (
              <Link className="font-medium text-[#008260] hover:underline" href={`/superadmin/requirements/${row.requirement_type}:${row.requirement_id}`}>
                {row.requirement?.title || row.requirement_id}
              </Link>
            ) },
            { key: 'type', header: 'Type', render: (row) => <span className="capitalize">{row.requirement_type}</span> },
            { key: 'status', header: 'Status', render: (row) => row.requirement?.derived_status || '-' },
            { key: 'assigned', header: 'Assigned', render: (row) => row.assigned_at ? new Date(row.assigned_at).toLocaleDateString() : '-' },
          ]}
          emptyText="No active assignments."
        />
      </SectionCard>

      <SectionCard title="Daily Reports" description="Recent reports uploaded by this admin.">
        <DataTable<any>
          rows={detail.recentReports || []}
          columns={[
            { key: 'date', header: 'Date', render: (row) => row.report_date ? new Date(row.report_date).toLocaleDateString() : '-' },
            { key: 'requirement', header: 'Requirement', render: (row) => `${row.requirement_type} / ${row.requirement_id}` },
            { key: 'summary', header: 'Summary', render: (row) => row.summary || '-' },
            { key: 'file', header: 'File', render: (row) => row.file_url ? <a className="font-medium text-[#008260] hover:underline" href={row.file_url} target="_blank" rel="noreferrer">{row.original_filename || 'Download'}</a> : '-' },
          ]}
          emptyText="No reports uploaded."
        />
      </SectionCard>

      <SectionCard
        title="Activity"
        description="Review what this admin did in the portal, shown as readable operational actions."
        action={<Button type="button" variant="outline" onClick={exportActivity}><Download className="mr-2 h-4 w-4" />Export XLSX</Button>}
      >
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_180px_160px_160px_auto]">
          <Input placeholder="Filter by action key, e.g. requirement.assigned" value={filters.action} onChange={(e) => setFilters((c) => ({ ...c, action: e.target.value }))} />
          <Select value={filters.requirement_type} onValueChange={(value) => setFilters((c) => ({ ...c, requirement_type: value }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="project">Projects</SelectItem>
              <SelectItem value="internship">Internships</SelectItem>
              <SelectItem value="freelance">Freelance</SelectItem>
            </SelectContent>
          </Select>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input type="date" value={filters.date_from} onChange={(e) => setFilters((c) => ({ ...c, date_from: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input type="date" value={filters.date_to} onChange={(e) => setFilters((c) => ({ ...c, date_to: e.target.value }))} />
          </div>
          <Button type="button" onClick={loadActivity} className="self-end bg-[#008260] hover:bg-[#006d51]">Apply</Button>
        </div>
        {activity.length ? (
          <div className="space-y-3">
            {activity.map((row) => {
              const copy = activityCopy(row.action || '')
              const highlights = activityHighlights(row)
              const targetId = activityTargetId(row)
              return (
                <article key={row.id || `${row.action}-${row.created_at}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${copy.tone}`}>
                          {copy.label}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">{row.action}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{copy.description}</p>
                      <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                        <div className="rounded-md bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-400">Target</p>
                          <p className="mt-1 font-medium capitalize text-slate-900">{activityTarget(row)}</p>
                          {targetId ? <p className="mt-1 truncate font-mono text-[11px] text-slate-500">{targetId}</p> : null}
                        </div>
                        <div className="rounded-md bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-400">Requirement</p>
                          {row.requirement_type ? (
                            <Link className="mt-1 block font-medium capitalize text-[#008260] hover:underline" href={`/superadmin/requirements/${row.requirement_type}:${row.requirement_id}`}>
                              {row.requirement_type} requirement
                            </Link>
                          ) : (
                            <p className="mt-1 font-medium text-slate-900">Not requirement-specific</p>
                          )}
                        </div>
                        <div className="rounded-md bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase text-slate-400">When</p>
                          <p className="mt-1 flex items-center gap-2 font-medium text-slate-900">
                            <Clock3 className="h-4 w-4 text-[#008260]" />
                            {row.created_at ? new Date(row.created_at).toLocaleString() : '-'}
                          </p>
                        </div>
                      </div>
                      {highlights.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {highlights.map((item) => (
                            <span key={item.key} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                              <span className="font-semibold capitalize">{item.key.replace(/_/g, ' ')}:</span> {item.value}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-[#008260]">
                      <CheckCircle2 className="h-4 w-4" />
                      Recorded
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-sm font-medium text-slate-700">No activity found.</p>
            <p className="mt-1 text-xs text-slate-500">Try changing the date, action, or requirement type filters.</p>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
