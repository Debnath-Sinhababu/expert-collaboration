'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { superAdminApi } from '@/lib/superadmin/api'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { DataTable } from '@/components/superadmin/common/DataTable'
import { PermissionGate } from '@/components/superadmin/common/PermissionGate'
import { PaginationControls } from '@/components/superadmin/common/PaginationControls'

const PAGE_SIZE = 20

export default function SuperAdminAdminsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    superAdminApi.admins({ page, limit: PAGE_SIZE })
      .then((res) => {
        const nextRows = res.data || []
        if (nextRows.length === 0 && page > 1 && (res.total || 0) > 0) {
          setPage((current) => Math.max(1, current - 1))
          return
        }
        setRows(nextRows)
        setTotal(res.total || 0)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load admins'))
      .finally(() => setLoading(false))
  }, [page])

  return (
    <SectionCard
      title="Admins"
      description="Create and review limited-access admins for the super-admin portal."
      action={
        <PermissionGate permission="admins:write">
          <Button asChild className="bg-[#008260] hover:bg-[#006d51]">
            <Link href="/superadmin/admins/new">
              <Plus className="mr-2 h-4 w-4" />
              New admin
            </Link>
          </Button>
        </PermissionGate>
      }
    >
      {loading ? <p className="text-sm text-slate-600">Loading admins...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {!loading && !error ? (
        <>
          <DataTable
            rows={rows}
            columns={[
              { key: 'name', header: 'Name', render: (row) => <span className="font-medium text-slate-950">{row.name}</span> },
              { key: 'email', header: 'Email', render: (row) => row.email },
              { key: 'status', header: 'Status', render: (row) => <span className="capitalize">{row.status}</span> },
              { key: 'permissions', header: 'Permissions', render: (row) => Array.isArray(row.permissions) ? row.permissions.length : 0 },
              { key: 'created', header: 'Created', render: (row) => row.created_at ? new Date(row.created_at).toLocaleDateString() : '-' },
            ]}
            emptyText="No created admins yet."
          />
          <PaginationControls page={page} limit={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage} />
        </>
      ) : null}
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
        <Shield className="h-4 w-4 text-[#008260]" />
        Root super admins are not required to exist in this table and keep full access.
      </div>
    </SectionCard>
  )
}
