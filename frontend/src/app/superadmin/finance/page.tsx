'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { DataTable } from '@/components/superadmin/common/DataTable'
import { PermissionGate } from '@/components/superadmin/common/PermissionGate'
import { PaginationControls } from '@/components/superadmin/common/PaginationControls'
import { superAdminApi } from '@/lib/superadmin/api'

const PAGE_SIZE = 20

export default function SuperAdminFinancePage() {
  const [rows, setRows] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Record<string, { expert_amount: string; institution_amount: string }>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    superAdminApi.financeTrainings({ page, limit: PAGE_SIZE })
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
        setError(err instanceof Error ? err.message : 'Failed to load finance data')
      })
      .finally(() => setLoading(false))
  }, [page])

  const totals = useMemo(() => ({
    approvedHours: Math.round(rows.reduce((sum, row) => sum + Number(row.approved_hours || 0), 0) * 100) / 100,
    estimatedExpertAmount: Math.round(rows.reduce((sum, row) => sum + Number(row.estimated_expert_amount || 0), 0) * 100) / 100,
    confirmed: rows.filter((row) => row.finance_record?.confirmed_at).length,
  }), [rows])

  async function confirm(row: any) {
    const values = editing[row.id] || {}
    try {
      const record = await superAdminApi.confirmFinanceTraining(row.id, {
        approved_hours: row.approved_hours || 0,
        expert_amount: values.expert_amount || row.estimated_expert_amount || 0,
        institution_amount: values.institution_amount || 0,
        expert_payment_status: 'confirmed',
        institution_payment_status: 'confirmed',
      })
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, finance_record: record } : item))
      toast.success('Finance record confirmed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to confirm finance record')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Page Approved Hours" value={totals.approvedHours} />
        <StatCard label="Page Expert Amount" value={`₹${totals.estimatedExpertAmount}`} tone="blue" />
        <StatCard label="Page Confirmed Records" value={totals.confirmed} tone="green" />
      </div>

      <SectionCard title="Training Finance" description="Calculate payable expert time from approved training attendance and manually confirm payment status.">
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        <DataTable
          rows={rows}
          columns={[
            { key: 'training', header: 'Training', render: (row) => <span className="font-medium text-slate-950">{row.projects?.title || row.project_id}</span> },
            { key: 'expert', header: 'Expert', render: (row) => row.experts?.name || '-' },
            { key: 'institute', header: 'Institute', render: (row) => row.institutions?.name || '-' },
            { key: 'hours', header: 'Hours', render: (row) => row.approved_hours ?? 0 },
            { key: 'expert_amount', header: 'Expert Amount', render: (row) => (
              <Input
                className="h-9 w-28"
                value={editing[row.id]?.expert_amount ?? String(row.finance_record?.expert_amount ?? row.estimated_expert_amount ?? 0)}
                onChange={(e) => setEditing((current) => ({ ...current, [row.id]: { ...(current[row.id] || {}), expert_amount: e.target.value } }))}
              />
            ) },
            { key: 'institution_amount', header: 'Institute Amount', render: (row) => (
              <Input
                className="h-9 w-28"
                value={editing[row.id]?.institution_amount ?? String(row.finance_record?.institution_amount ?? 0)}
                onChange={(e) => setEditing((current) => ({ ...current, [row.id]: { ...(current[row.id] || {}), institution_amount: e.target.value } }))}
              />
            ) },
            { key: 'status', header: 'Status', render: (row) => row.finance_record?.confirmed_at ? 'Confirmed' : 'Pending' },
            { key: 'action', header: '', render: (row) => (
              <PermissionGate permission="finance:confirm" fallback={null}>
                <Button size="sm" variant="outline" onClick={() => confirm(row)}>Confirm</Button>
              </PermissionGate>
            ) },
          ]}
          emptyText="No training finance records found."
        />
        <PaginationControls page={page} limit={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage} />
      </SectionCard>
    </div>
  )
}
