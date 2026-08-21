'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, BriefcaseBusiness, CalendarDays, GraduationCap, Handshake, ListFilter, Plus, Search, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { superAdminApi } from '@/lib/superadmin/api'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { PaginationControls } from '@/components/superadmin/common/PaginationControls'
import { PermissionGate } from '@/components/superadmin/common/PermissionGate'
import { projectEngagementQuantityDisplay } from '@/lib/projectCompensation'
import { PROJECT_STATUSES, PROJECT_STATUS_LABELS, normalizeProjectStatus, projectStatusLabel } from '@/lib/projectStatus'

const PAGE_SIZE = 20

function requirementDurationLabel(row: any) {
  if (row.requirement_type === 'project') {
    return projectEngagementQuantityDisplay(row).value
  }
  if (row.requirement_type === 'internship') {
    const value = Number(row.duration_value)
    const unit = String(row.duration_unit || '').trim()
    if (value > 0 && unit) {
      const plural = value === 1 ? unit.replace(/s$/i, '') : /s$/i.test(unit) ? unit : `${unit}s`
      return `${value} ${plural}`
    }
    return '—'
  }
  return '—'
}

function selectedExpertsLabel(row: any) {
  const experts = Array.isArray(row?.metrics?.selected_experts) ? row.metrics.selected_experts : []
  if (!experts.length) return null
  return experts
    .map((expert: any) => {
      const name = expert?.name || 'Expert'
      return expert?.email ? `${name} (${expert.email})` : name
    })
    .join(', ')
}

function derivedStatusLabel(status: string) {
  const normalized = normalizeProjectStatus(status)
  if (normalized === 'pending') return PROJECT_STATUS_LABELS.open
  if (normalized === 'closed_incomplete') return PROJECT_STATUS_LABELS.closed
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

const NEW_REQUIREMENT_PATH: Record<string, string> = {
  project: 'post-requirement?tab=contract',
  internship: 'internships/create',
  freelance: 'freelance/create',
}

export default function SuperAdminRequirementsPage() {
  const router = useRouter()
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [derivedStatus, setDerivedStatus] = useState('all')
  const [assignedAdminId, setAssignedAdminId] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [admins, setAdmins] = useState<any[]>([])
  const [assignmentSaving, setAssignmentSaving] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [filterInstitutionSearch, setFilterInstitutionSearch] = useState('')
  const [filterInstitutionOptions, setFilterInstitutionOptions] = useState<any[]>([])
  const [selectedInstitution, setSelectedInstitution] = useState<any | null>(null)
  const [institutionSearch, setInstitutionSearch] = useState('')
  const [institutions, setInstitutions] = useState<any[]>([])
  const [newRequirementType, setNewRequirementType] = useState('project')
  const [newRequirementInstitution, setNewRequirementInstitution] = useState<any | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [type, status, derivedStatus, assignedAdminId, debouncedSearch, selectedInstitution?.id])

  useEffect(() => {
    superAdminApi.admins({ page: 1, limit: 100 })
      .then((res) => setAdmins(res.data || []))
      .catch(() => setAdmins([]))
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      if (!filterInstitutionSearch.trim() || selectedInstitution) {
        setFilterInstitutionOptions([])
        return
      }
      superAdminApi.profiles({ type: 'institutions', search: filterInstitutionSearch, page: 1, limit: 10 })
        .then((res) => setFilterInstitutionOptions(res.data || []))
        .catch(() => setFilterInstitutionOptions([]))
    }, 250)
    return () => clearTimeout(t)
  }, [filterInstitutionSearch, selectedInstitution])

  useEffect(() => {
    const t = setTimeout(() => {
      if (!institutionSearch.trim()) {
        setInstitutions([])
        return
      }
      superAdminApi.profiles({ type: 'institutions', search: institutionSearch, page: 1, limit: 10 })
        .then((res) => setInstitutions(res.data || []))
        .catch(() => setInstitutions([]))
    }, 250)
    return () => clearTimeout(t)
  }, [institutionSearch])

  function goToCreateRequirement() {
    if (!newRequirementInstitution) {
      toast.error('Select an institution first')
      return
    }
    setCreateOpen(false)
    router.push(`/superadmin/institutions/${newRequirementInstitution.id}/${NEW_REQUIREMENT_PATH[newRequirementType]}`)
  }

  useEffect(() => {
    setLoading(true)
    setError('')
    superAdminApi.requirements({
      type,
      status,
      derived_status: derivedStatus === 'all' ? '' : derivedStatus,
      search: debouncedSearch,
      institution_id: selectedInstitution?.id || '',
      assigned_admin_id: assignedAdminId === 'all' ? '' : assignedAdminId,
      page,
      limit: PAGE_SIZE,
    })
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
  }, [type, status, derivedStatus, assignedAdminId, debouncedSearch, selectedInstitution?.id, page, refreshKey])

  async function assignRequirement(row: any, adminId: string) {
    setAssignmentSaving(`${row.requirement_type}:${row.id}`)
    try {
      if (adminId === 'unassigned') {
        await superAdminApi.unassignRequirement(row.requirement_type, row.id)
        toast.success('Requirement unassigned')
      } else {
        await superAdminApi.assignRequirement(row.requirement_type, row.id, { admin_id: adminId })
        toast.success('Requirement assigned')
      }
      setRefreshKey((current) => current + 1)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update assignment')
    } finally {
      setAssignmentSaving('')
    }
  }

  function progressBar(row: any) {
    if (row.progress_percent === null || row.progress_percent === undefined) {
      return <span className="text-xs font-medium text-slate-500">Progress unknown</span>
    }
    return (
      <div className="w-full">
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-600">Completion</span>
          <span className="font-semibold text-slate-900">{row.progress_percent}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-[#008260]" style={{ width: `${Math.max(0, Math.min(100, Number(row.progress_percent || 0)))}%` }} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="All Requirements" value={total || rows.length} icon={ListFilter} helper="Across all institutes" />
        <StatCard label="Projects" value={rows.filter((r) => r.requirement_type === 'project').length} icon={BriefcaseBusiness} tone="blue" helper="Current page" />
        <StatCard label="Internships" value={rows.filter((r) => r.requirement_type === 'internship').length} icon={GraduationCap} tone="amber" helper="Current page" />
        <StatCard label="Freelance" value={rows.filter((r) => r.requirement_type === 'freelance').length} icon={Handshake} tone="violet" helper="Current page" />
        <StatCard label="Completed" value={rows.filter((r) => r.derived_status === 'completed').length} icon={ListFilter} tone="green" helper="Current page" />
      </div>

      <SectionCard
        title="Requirements"
        description="Manage requirements across institutions without entering each workspace."
        eyebrow="Requirement hub"
        action={
          <PermissionGate permission="requirements:write">
            <Button type="button" className="bg-[#008260] hover:bg-[#006d51]" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New requirement
            </Button>
          </PermissionGate>
        }
      >
        <div className="mb-5 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <Tabs value={type} onValueChange={setType}>
            <TabsList className="grid h-auto w-full grid-cols-2 bg-white p-1 md:w-fit md:grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="project">Projects</TabsTrigger>
              <TabsTrigger value="internship">Internships</TabsTrigger>
              <TabsTrigger value="freelance">Freelance</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="grid gap-3">
            <div className="relative w-full min-w-0">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input className="pl-9" placeholder="Search by unique ID, requirement name, or institution" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="call_now">Call now</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={derivedStatus} onValueChange={setDerivedStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All project statuses</SelectItem>
                {PROJECT_STATUSES.map((value) => (
                  <SelectItem key={value} value={value}>{PROJECT_STATUS_LABELS[value]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={assignedAdminId} onValueChange={setAssignedAdminId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {admins.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>{admin.name || admin.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Input
                placeholder="Filter by institution"
                value={selectedInstitution ? `${selectedInstitution.name} (${selectedInstitution.email})` : filterInstitutionSearch}
                onChange={(e) => {
                  setSelectedInstitution(null)
                  setFilterInstitutionSearch(e.target.value)
                }}
              />
              {selectedInstitution ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1 h-8 w-8"
                  onClick={() => {
                    setSelectedInstitution(null)
                    setFilterInstitutionSearch('')
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
              {filterInstitutionOptions.length > 0 ? (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {filterInstitutionOptions.map((institution) => (
                    <button
                      type="button"
                      key={institution.id}
                      className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        setSelectedInstitution(institution)
                        setFilterInstitutionSearch('')
                        setFilterInstitutionOptions([])
                      }}
                    >
                      <span className="font-medium text-slate-950">{institution.name}</span>
                      <span className="ml-2 text-slate-500">{institution.email}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            </div>
          </div>
        </div>
        {loading ? <p className="mb-3 text-sm text-slate-600">Loading requirements...</p> : null}
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        <div className="space-y-3">
          {rows.length ? rows.map((row) => (
            <article key={`${row.requirement_type}:${row.id}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#008260]/30 hover:shadow-md">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {row.unique_code ? (
                      <span className="rounded-full bg-[#008260]/10 px-2.5 py-1 text-xs font-semibold text-[#008260]">{row.unique_code}</span>
                    ) : null}
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">{row.requirement_type}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${derivedStatusClass(row.derived_status || row.status)}`}>
                      {derivedStatusLabel(row.derived_status || row.status)}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-semibold text-slate-950">{row.title}</h3>
                  <p className="mt-1 max-h-10 overflow-hidden text-sm text-slate-600">{row.description || row.responsibilities || 'No description'}</p>
                  <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2 xl:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Institution</p>
                      <p className="mt-1 font-medium text-slate-800">{row.institutions?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Owner</p>
                      <p className="mt-1 font-medium text-slate-800">{row.assignment?.admin?.name || row.assignment?.admin?.email || 'Unassigned'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Duration</p>
                      <p className="mt-1 font-medium text-slate-800">{requirementDurationLabel(row)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-slate-400">Counts</p>
                      <p className="mt-1 font-medium text-slate-800">
                        {(row.metrics?.applications_total || 0)} applications
                        {row.metrics?.bookings_total ? `, ${row.metrics.bookings_total} bookings` : ''}
                      </p>
                    </div>
                    {selectedExpertsLabel(row) ? (
                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold uppercase text-slate-400">Selected expert</p>
                        <p className="mt-1 font-medium text-slate-800 break-words">{selectedExpertsLabel(row)}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="grid w-full gap-3 xl:w-[360px]">
                  {progressBar(row)}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="rounded-md bg-slate-50 p-2">
                      <CalendarDays className="mb-1 h-4 w-4 text-[#008260]" />
                      {row.created_at ? new Date(row.created_at).toLocaleDateString() : '-'}
                    </div>
                    <div className="rounded-md bg-slate-50 p-2">
                      <UserRound className="mb-1 h-4 w-4 text-[#008260]" />
                      {row.assignment?.admin?.email || 'No owner'}
                    </div>
                  </div>
                  <PermissionGate permission="assignments:write">
                    <Select
                      value={row.assignment?.admin_record_id || 'unassigned'}
                      onValueChange={(value) => assignRequirement(row, value)}
                      disabled={assignmentSaving === `${row.requirement_type}:${row.id}`}
                    >
                      <SelectTrigger><SelectValue placeholder="Assign admin" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {admins.map((admin) => (
                          <SelectItem key={admin.id} value={admin.id}>{admin.name || admin.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PermissionGate>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/superadmin/requirements/${row.requirement_type}:${row.id}`}>
                      Manage
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </article>
          )) : (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">No requirements found.</div>
          )}
        </div>
        <PaginationControls page={page} limit={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage} />
      </SectionCard>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Requirement</DialogTitle>
            <DialogDescription>
              Pick the type and institution — you&apos;ll fill in the requirement on the same form the institution itself uses,
              so nothing is out of sync between the two.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={newRequirementType} onValueChange={setNewRequirementType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="project">Training / Project</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newRequirementInstitutionSearch">Search institution</Label>
              <Input
                id="newRequirementInstitutionSearch"
                value={newRequirementInstitution ? `${newRequirementInstitution.name} (${newRequirementInstitution.email})` : institutionSearch}
                onChange={(e) => {
                  setNewRequirementInstitution(null)
                  setInstitutionSearch(e.target.value)
                }}
                placeholder="Type institution name or email"
              />
              {institutions.length > 0 && !newRequirementInstitution ? (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                  {institutions.map((institution) => (
                    <button
                      type="button"
                      key={institution.id}
                      className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => {
                        setNewRequirementInstitution(institution)
                        setInstitutionSearch('')
                        setInstitutions([])
                      }}
                    >
                      <span className="font-medium text-slate-950">{institution.name}</span>
                      <span className="ml-2 text-slate-500">{institution.email}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {newRequirementInstitution ? <p className="text-xs font-medium text-[#008260]">Institution selected</p> : null}
            </div>
            {newRequirementType === 'project' ? (
              <p className="text-xs text-slate-500">
                Training/project requirements need a platform margin before they go live to experts — you&apos;ll be taken
                to set that right after creating it.
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="button" className="bg-[#008260] hover:bg-[#006d51]" onClick={goToCreateRequirement}>
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
