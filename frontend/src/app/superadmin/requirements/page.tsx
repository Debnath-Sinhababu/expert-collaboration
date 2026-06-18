'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { superAdminApi } from '@/lib/superadmin/api'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { DataTable } from '@/components/superadmin/common/DataTable'
import { PaginationControls } from '@/components/superadmin/common/PaginationControls'

const PAGE_SIZE = 20

export default function SuperAdminRequirementsPage() {
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
  }, [type, search])

  useEffect(() => {
    setLoading(true)
    setError('')
    superAdminApi.requirements({ type, search: debouncedSearch, page, limit: PAGE_SIZE })
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
        setError(err instanceof Error ? err.message : 'Failed to load requirements')
      })
      .finally(() => setLoading(false))
  }, [type, debouncedSearch, page])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="All Requirements" value={rows.length} />
        <StatCard label="Projects" value={rows.filter((r) => r.requirement_type === 'project').length} tone="blue" />
        <StatCard label="Internships" value={rows.filter((r) => r.requirement_type === 'internship').length} tone="amber" />
        <StatCard label="Freelance" value={rows.filter((r) => r.requirement_type === 'freelance').length} tone="violet" />
      </div>
      <SectionCard title="Requirements" description="Manage requirements across institutions without entering each workspace.">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Tabs value={type} onValueChange={setType}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="project">Projects</TabsTrigger>
              <TabsTrigger value="internship">Internships</TabsTrigger>
              <TabsTrigger value="freelance">Freelance</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input className="md:max-w-xs" placeholder="Search requirements" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? <p className="mb-3 text-sm text-slate-600">Loading requirements...</p> : null}
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        <DataTable
          rows={rows}
          columns={[
            { key: 'title', header: 'Title', render: (row) => <span className="font-medium text-slate-950">{row.title}</span> },
            { key: 'type', header: 'Type', render: (row) => <span className="capitalize">{row.requirement_type}</span> },
            { key: 'institution', header: 'Institute', render: (row) => row.institutions?.name || '-' },
            { key: 'status', header: 'Status', render: (row) => row.status || row.call_status || '-' },
            { key: 'created', header: 'Created', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '-' },
            { key: 'action', header: '', render: (row) => (
              <Button asChild size="sm" variant="outline">
                <Link href={`/superadmin/requirements/${row.requirement_type}:${row.id}`}>
                  Manage
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) },
          ]}
          emptyText="No requirements found."
        />
        <PaginationControls page={page} limit={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage} />
      </SectionCard>
    </div>
  )
}
