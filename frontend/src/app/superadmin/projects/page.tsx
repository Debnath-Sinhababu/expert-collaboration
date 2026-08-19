'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Hash, ListFilter, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { superAdminApi } from '@/lib/superadmin/api'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { PaginationControls } from '@/components/superadmin/common/PaginationControls'
import { normalizeProjectStatus, projectStatusLabel } from '@/lib/projectStatus'

const PAGE_SIZE = 20

function derivedStatusLabel(status: string) {
  const normalized = normalizeProjectStatus(status)
  if (normalized === 'pending') return 'Open'
  return projectStatusLabel(normalized)
}

function derivedStatusClass(status: string) {
  const normalized = normalizeProjectStatus(status)
  if (normalized === 'running') return 'bg-sky-50 text-sky-700'
  if (normalized === 'completed') return 'bg-emerald-50 text-emerald-700'
  if (normalized === 'closed' || normalized === 'closed_incomplete') return 'bg-slate-100 text-slate-700'
  if (normalized === 'open' || normalized === 'pending') return 'bg-amber-50 text-amber-700'
  return 'bg-slate-100 text-slate-700'
}

function stageCounts(row: any) {
  return row?.metrics?.stage_counts || { pending: 0, interview: 0, rejected: 0, selected: 0 }
}

export default function SuperAdminProjectsPage() {
  const [type, setType] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [type, debouncedSearch])

  useEffect(() => {
    setLoading(true)
    setError('')
    superAdminApi.projects({ type, search: debouncedSearch, page, limit: PAGE_SIZE })
      .then((res) => {
        const nextRows = res.data || []
        if (nextRows.length === 0 && page > 1 && (res.total || 0) > 0) {
          setPage((current) => Math.max(1, current - 1))
          return
        }
        setRows(nextRows)
        setTotal(res.total || 0)
      })
      .catch((err) => {
        setRows([])
        setTotal(0)
        setError(err instanceof Error ? err.message : 'Failed to load projects')
      })
      .finally(() => setLoading(false))
  }, [type, debouncedSearch, page])

  const totals = rows.reduce(
    (acc, row) => {
      const counts = stageCounts(row)
      acc.pending += counts.pending || 0
      acc.interview += counts.interview || 0
      acc.rejected += counts.rejected || 0
      acc.selected += counts.selected || 0
      return acc
    },
    { pending: 0, interview: 0, rejected: 0, selected: 0 },
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="All Projects" value={total || rows.length} icon={ListFilter} helper="Across all institutions" />
        <StatCard label="Pending" value={totals.pending} icon={ListFilter} tone="amber" helper="Current page" />
        <StatCard label="Interview" value={totals.interview} icon={ListFilter} tone="blue" helper="Current page" />
        <StatCard label="Selected" value={totals.selected} icon={ListFilter} tone="green" helper="Current page" />
      </div>

      <SectionCard
        title="Projects"
        description="Search any training, freelance, or internship project by its unique ID and see its expert pipeline at a glance."
        eyebrow="Project directory"
      >
        <div className="mb-5 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <Tabs value={type} onValueChange={setType}>
            <TabsList className="grid h-auto w-full grid-cols-2 bg-white p-1 md:w-fit md:grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="project">Training</TabsTrigger>
              <TabsTrigger value="freelance">Freelance</TabsTrigger>
              <TabsTrigger value="internship">Internship</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full min-w-0">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input className="pl-9" placeholder="Search by unique ID (e.g. PROJAAA1), title, or institution" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        {loading ? <p className="mb-3 text-sm text-slate-600">Loading projects...</p> : null}
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        <div className="space-y-3">
          {rows.length ? rows.map((row) => {
            const counts = stageCounts(row)
            return (
              <article key={`${row.requirement_type}:${row.id}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#008260]/30 hover:shadow-md">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#008260]/10 px-2.5 py-1 text-xs font-semibold text-[#008260]">
                        <Hash className="h-3 w-3" />
                        {row.unique_code || '—'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                        {row.requirement_type === 'project' ? 'Training' : row.requirement_type}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${derivedStatusClass(row.derived_status || row.status)}`}>
                        {derivedStatusLabel(row.derived_status || row.status)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-base font-semibold text-slate-950">{row.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{row.institutions?.name || 'No institution'}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-700 sm:grid-cols-4">
                      <div className="rounded-md bg-amber-50 p-2 text-center">
                        <p className="font-semibold text-amber-700">{counts.pending}</p>
                        <p className="text-amber-600">Pending</p>
                      </div>
                      <div className="rounded-md bg-sky-50 p-2 text-center">
                        <p className="font-semibold text-sky-700">{counts.interview}</p>
                        <p className="text-sky-600">Interview</p>
                      </div>
                      <div className="rounded-md bg-red-50 p-2 text-center">
                        <p className="font-semibold text-red-700">{counts.rejected}</p>
                        <p className="text-red-600">Rejected</p>
                      </div>
                      <div className="rounded-md bg-emerald-50 p-2 text-center">
                        <p className="font-semibold text-emerald-700">{counts.selected}</p>
                        <p className="text-emerald-600">Selected</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full flex-col items-stretch gap-2 xl:w-[200px]">
                    <Link
                      href={`/superadmin/projects/${row.requirement_type}:${row.id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:border-[#008260]/40 hover:text-[#008260]"
                    >
                      View details
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </article>
            )
          }) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">No projects found.</div>
          )}
        </div>
        <PaginationControls page={page} limit={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage} />
      </SectionCard>
    </div>
  )
}
