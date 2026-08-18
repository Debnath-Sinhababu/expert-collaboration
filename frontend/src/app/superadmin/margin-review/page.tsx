'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Percent, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { superAdminApi } from '@/lib/superadmin/api'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { DataTable } from '@/components/superadmin/common/DataTable'
import { moneyInr } from '@/lib/projectCompensation'

function formatDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

function requirementBudget(row: any): number {
  const total = Number(row.institution_gross_total)
  if (Number.isFinite(total) && total > 0) return total
  const fallback = Number(row.total_budget)
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 0
}

export default function SuperAdminMarginReviewPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    superAdminApi.pendingMarginRequirements({ limit: 100 })
      .then((res) => setRows(Array.isArray(res?.data) ? res.data : []))
      .catch((err) => {
        setRows([])
        setError(err instanceof Error ? err.message : 'Failed to load pending requirements')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => {
      const haystack = [row.title, row.institutions?.name, row.type].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    })
  }, [rows, search])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending Margin Review" value={rows.length} tone="amber" icon={Percent} />
      </div>

      <SectionCard
        title="Margin Review"
        description="Institutions post a requirement with only their budget. Open a requirement to set the platform's cut — it goes live to experts only after you approve it, the margin locks once approved, and it auto-approves at the default 30% if left unset for 15 minutes."
      >
        <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Search by requirement title or institution"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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

        {loading ? <p className="mb-3 text-sm text-slate-600">Loading pending requirements...</p> : null}
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        <DataTable
          rows={filteredRows}
          columns={[
            { key: 'title', header: 'Requirement', render: (row: any) => (
              <button
                type="button"
                className="min-w-0 max-w-[280px] text-left"
                onClick={() => router.push(`/superadmin/margin-review/${row.id}`)}
              >
                <p className="truncate font-medium text-[#008260] hover:underline">{row.title || '-'}</p>
                {row.type ? <p className="text-xs capitalize text-slate-500">{row.type.replace(/_/g, ' ')}</p> : null}
              </button>
            ) },
            { key: 'institution', header: 'Institution', render: (row: any) => (
              <span className="text-slate-800">{row.institutions?.name || '-'}</span>
            ) },
            { key: 'budget', header: 'Budget', render: (row: any) => (
              <span className="text-slate-800">{requirementBudget(row) > 0 ? moneyInr(requirementBudget(row)) : '-'}</span>
            ) },
            { key: 'submitted', header: 'Submitted', render: (row: any) => (
              <span className="text-slate-600">{formatDate(row.created_at)}</span>
            ) },
            { key: 'action', header: '', render: (row: any) => (
              <Button
                size="sm"
                className="bg-[#008260] hover:bg-[#006d51]"
                onClick={() => router.push(`/superadmin/margin-review/${row.id}`)}
              >
                Review
              </Button>
            ) },
          ]}
          emptyText={search.trim() ? 'No pending requirements match your search.' : 'No requirements awaiting margin review.'}
        />
      </SectionCard>
    </div>
  )
}
