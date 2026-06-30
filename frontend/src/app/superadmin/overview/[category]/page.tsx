'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Clock3, PlayCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { DataTable } from '@/components/superadmin/common/DataTable'
import { superAdminApi } from '@/lib/superadmin/api'

function MiniBars({ data }: { data: any[] }) {
  const max = Math.max(1, ...data.map((item) => Number(item.total || 0)))
  return (
    <div className="flex h-56 items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
      {data.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div className="w-full rounded-t bg-[#008260]" style={{ height: `${Math.max(8, (Number(item.total || 0) / max) * 180)}px` }} />
          <span className="w-full truncate text-center text-[11px] text-slate-500">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export default function OverviewCategoryPage() {
  const params = useParams()
  const category = String(params?.category || 'projects') as 'projects' | 'internships' | 'freelance'
  const [period, setPeriod] = useState('monthly')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const title = useMemo(() => category.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase()), [category])

  useEffect(() => {
    setLoading(true)
    superAdminApi.overviewCategory(category, { period })
      .then(setData)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load category'))
      .finally(() => setLoading(false))
  }, [category, period])

  if (loading) return <div className="text-sm text-slate-600">Loading category...</div>
  const summary = data?.summary || { total: 0, running: 0, pending: 0, closed: 0 }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" className="mb-2 px-0 text-slate-600">
            <Link href="/superadmin/overview"><ArrowLeft className="mr-2 h-4 w-4" />Back to overview</Link>
          </Button>
          <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">Category totals, running work, pending starts, closed items, and trend history.</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="yearly">Yearly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total" value={summary.total} icon={BriefcaseBusiness} />
        <StatCard label="Running" value={summary.running} icon={PlayCircle} tone="blue" />
        <StatCard label="Pending" value={summary.pending} icon={Clock3} tone="amber" />
        <StatCard label="Closed" value={summary.closed} icon={CheckCircle2} tone="slate" />
      </div>

      <SectionCard title="Trend" description={`${period} requirement creation trend.`} eyebrow="Graph">
        <MiniBars data={data?.trend || []} />
      </SectionCard>

      <SectionCard title="Recent Requirements" description="Most recent requirements in this category.">
        <DataTable<any>
          rows={data?.data || []}
          columns={[
            { key: 'title', header: 'Requirement', render: (row) => (
              <Link className="font-medium text-[#008260] hover:underline" href={`/superadmin/requirements/${row.requirement_type}:${row.id}`}>
                {row.title || 'Requirement'}
              </Link>
            ) },
            { key: 'status', header: 'Status', render: (row) => row.derived_status || '-' },
            { key: 'progress', header: 'Progress', render: (row) => row.progress_label || 'Unknown' },
            { key: 'owner', header: 'Owner', render: (row) => row.assignment?.admin?.email || '-' },
            { key: 'created', header: 'Created', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '-' },
          ]}
          emptyText="No requirements found."
        />
      </SectionCard>
    </div>
  )
}
