'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { BadgeCheck, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { superAdminApi } from '@/lib/superadmin/api'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { DataTable } from '@/components/superadmin/common/DataTable'
import { PaginationControls } from '@/components/superadmin/common/PaginationControls'

const PAGE_SIZE = 20

export default function SuperAdminCalxbookVerificationPage() {
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
  }, [debouncedSearch])

  useEffect(() => {
    setLoading(true)
    setError('')
    superAdminApi.profiles({ type: 'experts', interested: true, search: debouncedSearch, page, limit: PAGE_SIZE })
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
        setError(err instanceof Error ? err.message : 'Failed to load CalxBook experts')
      })
      .finally(() => setLoading(false))
  }, [debouncedSearch, page])

  async function toggle(row: any) {
    try {
      const updated = await superAdminApi.setCalxbookVerification(row.id, !row.calxbook_verified)
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, calxbook_verified: updated.calxbook_verified } : item))
      toast.success(updated.calxbook_verified ? 'Expert verified for CalxBook' : 'Expert removed from CalxBook')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update CalxBook status')
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Interested Experts" value={rows.length} />
        <StatCard label="Verified" value={rows.filter((row) => row.calxbook_verified).length} tone="green" />
        <StatCard label="With Course Video" value={rows.filter((row) => row.course_video_url).length} tone="blue" />
      </div>

      <SectionCard
        title="CalxBook Verification"
        description="Only experts who opted into course/services listing appear here."
        action={<Input className="w-full sm:w-72" placeholder="Search interested experts" value={search} onChange={(e) => setSearch(e.target.value)} />}
      >
        {loading ? <p className="mb-3 text-sm text-slate-600">Loading experts...</p> : null}
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        <DataTable
          rows={rows}
          columns={[
            { key: 'name', header: 'Expert', render: (row) => <span className="font-medium text-slate-950">{row.name}</span> },
            { key: 'email', header: 'Email', render: (row) => row.email },
            { key: 'services', header: 'Services', render: (row) => Array.isArray(row.expert_services) && row.expert_services.length ? row.expert_services.join(', ') : '-' },
            { key: 'price', header: 'Price', render: (row) => row.service_price != null ? `₹${row.service_price}` : '-' },
            { key: 'course', header: 'Course', render: (row) => row.course_video_url ? (
              <a href={row.course_video_url} target="_blank" rel="noreferrer" className="inline-flex items-center text-[#008260] hover:underline">
                <Video className="mr-1 h-4 w-4" />
                View
              </a>
            ) : '-' },
            { key: 'status', header: 'Status', render: (row) => row.calxbook_verified ? 'Verified' : 'Pending' },
            { key: 'verify', header: '', render: (row) => (
              <Button size="sm" variant={row.calxbook_verified ? 'outline' : 'default'} className={row.calxbook_verified ? '' : 'bg-[#008260] hover:bg-[#006d51]'} onClick={() => toggle(row)}>
                <BadgeCheck className="mr-2 h-4 w-4" />
                {row.calxbook_verified ? 'Unverify' : 'Verify'}
              </Button>
            ) },
          ]}
          emptyText="No experts have opted into CalxBook course/services listing."
        />
        <PaginationControls page={page} limit={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage} />
      </SectionCard>
    </div>
  )
}
