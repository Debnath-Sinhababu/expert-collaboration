'use client'

import { useEffect, useState } from 'react'
import { superAdminApi } from '@/lib/superadmin/api'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { DataTable } from '@/components/superadmin/common/DataTable'
import { PaginationControls } from '@/components/superadmin/common/PaginationControls'

const PAGE_SIZE = 20

export default function SuperAdminInternshipsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    superAdminApi.internships({ page, limit: PAGE_SIZE })
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
        setError(err instanceof Error ? err.message : 'Failed to load internships')
      })
      .finally(() => setLoading(false))
  }, [page])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Internships" value={rows.length} />
        <StatCard label="Open" value={rows.filter((r) => r.status === 'open').length} tone="blue" />
        <StatCard label="Paid" value={rows.filter((r) => r.paid).length} tone="green" />
      </div>
      <SectionCard title="Internships" description="Central view of internship opportunities and institute activity.">
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        <DataTable
          rows={rows}
          columns={[
            { key: 'title', header: 'Title', render: (row) => <span className="font-medium text-slate-950">{row.title}</span> },
            { key: 'institution', header: 'Institution', render: (row) => row.institutions?.name || '-' },
            { key: 'mode', header: 'Mode', render: (row) => row.work_mode || '-' },
            { key: 'status', header: 'Status', render: (row) => row.status || '-' },
            { key: 'stipend', header: 'Stipend', render: (row) => [row.stipend_min, row.stipend_max].filter(Boolean).join(' - ') || '-' },
          ]}
          emptyText="No internships found."
        />
        <PaginationControls page={page} limit={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage} />
      </SectionCard>
    </div>
  )
}
