'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Download, FileText, ListChecks, Shield, UserRound } from 'lucide-react'
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
        description="Filter and export this admin's portal actions."
        action={<Button type="button" variant="outline" onClick={exportActivity}><Download className="mr-2 h-4 w-4" />Export XLSX</Button>}
      >
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_180px_160px_160px_auto]">
          <Input placeholder="Action contains exact key" value={filters.action} onChange={(e) => setFilters((c) => ({ ...c, action: e.target.value }))} />
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
        <DataTable<any>
          rows={activity}
          columns={[
            { key: 'date', header: 'Date', render: (row) => row.created_at ? new Date(row.created_at).toLocaleString() : '-' },
            { key: 'action', header: 'Action', render: (row) => <span className="font-medium text-slate-900">{row.action}</span> },
            { key: 'entity', header: 'Entity', render: (row) => [row.entity_type, row.entity_id].filter(Boolean).join(' / ') || '-' },
            { key: 'requirement', header: 'Requirement', render: (row) => row.requirement_type ? `${row.requirement_type} / ${row.requirement_id || ''}` : '-' },
          ]}
          emptyText="No activity found."
        />
      </SectionCard>
    </div>
  )
}
