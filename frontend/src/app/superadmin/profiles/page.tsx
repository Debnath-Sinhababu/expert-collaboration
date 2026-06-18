'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { superAdminApi } from '@/lib/superadmin/api'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { DataTable } from '@/components/superadmin/common/DataTable'
import { PaginationControls } from '@/components/superadmin/common/PaginationControls'
import { PermissionGate } from '@/components/superadmin/common/PermissionGate'

type ProfileType = 'experts' | 'institutions' | 'students'
const PAGE_SIZE = 20

export default function SuperAdminProfilesPage() {
  const [type, setType] = useState<ProfileType>('experts')
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
    superAdminApi.profiles({ type, search: debouncedSearch, page, limit: PAGE_SIZE })
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
        setError(err instanceof Error ? err.message : 'Failed to load profiles')
      })
      .finally(() => setLoading(false))
  }, [type, debouncedSearch, page])

  const columns = type === 'experts'
    ? [
        { key: 'name', header: 'Name', render: (row: any) => <span className="font-medium text-slate-950">{row.name}</span> },
        { key: 'email', header: 'Email', render: (row: any) => row.email },
        { key: 'rate', header: 'Rate', render: (row: any) => row.hourly_rate ? `₹${row.hourly_rate}/hr` : '-' },
        { key: 'workspace', header: 'Workspace', render: (row: any) => (
          <PermissionGate permission="profiles:write" fallback={<span className="text-slate-400">No access</span>}>
            <Button asChild size="sm" className="bg-[#008260] hover:bg-[#006d51]">
              <Link href={`/superadmin/experts/${row.id}/home`}>
                Open workspace
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </PermissionGate>
        ) },
      ]
    : type === 'institutions'
      ? [
          { key: 'name', header: 'Name', render: (row: any) => <span className="font-medium text-slate-950">{row.name}</span> },
          { key: 'email', header: 'Email', render: (row: any) => row.email },
          { key: 'type', header: 'Type', render: (row: any) => row.type || '-' },
          { key: 'city', header: 'Location', render: (row: any) => [row.city, row.state].filter(Boolean).join(', ') || '-' },
          { key: 'workspace', header: 'Workspace', render: (row: any) => (
            <PermissionGate permission="profiles:write" fallback={<span className="text-slate-400">No access</span>}>
              <Button asChild size="sm" className="bg-[#008260] hover:bg-[#006d51]">
                <Link href={`/superadmin/institutions/${row.id}/home`}>
                  Open workspace
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </PermissionGate>
          ) },
        ]
      : [
          { key: 'name', header: 'Name', render: (row: any) => <span className="font-medium text-slate-950">{row.name}</span> },
          { key: 'email', header: 'Email', render: (row: any) => row.email },
          { key: 'degree', header: 'Degree', render: (row: any) => row.degree || '-' },
          { key: 'institution', header: 'Institution', render: (row: any) => row.institutions?.name || '-' },
        ]

  return (
    <SectionCard title="Profiles" description="Search and manage experts, institutions, students, and workspace access.">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={type} onValueChange={(value) => setType(value as ProfileType)}>
          <TabsList>
            <TabsTrigger value="experts">Experts</TabsTrigger>
            <TabsTrigger value="institutions">Institutions</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
          </TabsList>
        </Tabs>
        <Input className="md:max-w-xs" placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {loading ? <p className="mb-3 text-sm text-slate-600">Loading profiles...</p> : null}
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <DataTable rows={rows} columns={columns} emptyText="No profiles found." />
      <PaginationControls page={page} limit={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage} />
    </SectionCard>
  )
}
