'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Plus } from 'lucide-react'
import { superAdminApi } from '@/lib/superadmin/api'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { DataTable } from '@/components/superadmin/common/DataTable'
import { PaginationControls } from '@/components/superadmin/common/PaginationControls'
import { PermissionGate } from '@/components/superadmin/common/PermissionGate'

const PAGE_SIZE = 20

export default function SuperAdminFreelancePage() {
  const [rows, setRows] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    superAdminApi.freelance({ page, limit: PAGE_SIZE })
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
        setError(err instanceof Error ? err.message : 'Failed to load freelance projects')
      })
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Freelance Projects" value={rows.length} />
        <StatCard label="Open" value={rows.filter((r) => r.status === 'open').length} tone="blue" />
        <StatCard label="Ongoing" value={rows.filter((r) => r.status === 'ongoing').length} tone="amber" />
      </div>
      <SectionCard
        title="Freelancing"
        description="Open each project to manage details, expert pipeline, interviews, selections, and completions."
        action={
          <PermissionGate permission="requirements:write">
            <Button asChild className="bg-[#008260] hover:bg-[#006d51]">
              <Link href="/superadmin/requirements">
                <Plus className="mr-2 h-4 w-4" />
                New freelance
              </Link>
            </Button>
          </PermissionGate>
        }
      >
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        <DataTable
          rows={rows}
          columns={[
            { key: 'title', header: 'Title', render: (row) => <span className="font-medium text-slate-950">{row.title}</span> },
            { key: 'institution', header: 'Institution', render: (row) => row.institutions?.name || '-' },
            { key: 'budget', header: 'Budget', render: (row) => [row.budget_min, row.budget_max].filter(Boolean).join(' - ') || '-' },
            { key: 'status', header: 'Status', render: (row) => row.status || '-' },
            { key: 'deadline', header: 'Deadline', render: (row) => row.deadline ? new Date(row.deadline).toLocaleDateString() : '-' },
            { key: 'action', header: '', render: (row) => (
              <Button asChild size="sm" variant="outline">
                <Link href={`/superadmin/requirements/freelance:${row.id}`}>
                  Manage
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) },
          ]}
          emptyText="No freelance projects found."
        />
        <PaginationControls page={page} limit={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage} />
      </SectionCard>
    </div>
  )
}
