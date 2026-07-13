'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { superAdminApi } from '@/lib/superadmin/api'
import { EXPERTISE_DOMAINS, EXPERT_SERVICES, EXPERT_TYPES, INDIAN_STATES } from '@/lib/constants'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { DataTable } from '@/components/superadmin/common/DataTable'
import { PaginationControls } from '@/components/superadmin/common/PaginationControls'
import { PermissionGate } from '@/components/superadmin/common/PermissionGate'

type ProfileType = 'experts' | 'institutions' | 'students'
type FilterValue = string
type ProfileFilters = Record<string, FilterValue>

const PAGE_SIZE = 20
const EMPTY_FILTERS: ProfileFilters = {}
const FILTER_CONFIG: Record<ProfileType, string[]> = {
  experts: ['domain_expertise', 'skill', 'expert_type', 'expert_service', 'designation', 'experience_min', 'experience_max', 'city', 'state', 'is_verified', 'kyc_status', 'calxbook_verified'],
  institutions: ['institution_type', 'city', 'state', 'is_verified', 'student_count_min', 'student_count_max'],
  students: ['skill', 'degree', 'specialization', 'city', 'state', 'year', 'availability', 'currently_studying'],
}
const KYC_STATUS_OPTIONS = ['pending', 'approved', 'rejected'] as const

function normalizeFilters(filters: ProfileFilters) {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([key, value]) => [key, String(value || '').trim()])
      .filter(([, value]) => value && value !== 'all'),
  ) as ProfileFilters
}

function chipLabel(key: string, value: string) {
  const labels: Record<string, string> = {
    domain_expertise: 'Domain',
    skill: 'Skill',
    expert_type: 'Role',
    expert_service: 'Service',
    designation: 'Designation',
    experience_min: 'Min exp',
    experience_max: 'Max exp',
    hourly_rate_min: 'Min rate',
    hourly_rate_max: 'Max rate',
    is_verified: 'Verified',
    kyc_status: 'KYC',
    calxbook_verified: 'CalxBook',
    interested: 'Interested',
    institution_type: 'Type',
    city: 'City',
    state: 'State',
    student_count_min: 'Min students',
    student_count_max: 'Max students',
    established_year_min: 'Established after',
    established_year_max: 'Established before',
    institution_id: 'Institution',
    degree: 'Degree',
    specialization: 'Specialization',
    year: 'Year',
    availability: 'Availability',
    preferred_engagement: 'Engagement',
    preferred_work_mode: 'Work mode',
    currently_studying: 'Studying',
  }
  return `${labels[key] || key}: ${value}`
}

function FilterField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500">{label}</Label>
      <Input type={type} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500">{label}</Label>
      <Select value={value || 'all'} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default function SuperAdminProfilesPage() {
  const [type, setType] = useState<ProfileType>('experts')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filters, setFilters] = useState<ProfileFilters>(EMPTY_FILTERS)
  const [draftFilters, setDraftFilters] = useState<ProfileFilters>(EMPTY_FILTERS)
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const normalizedFilters = useMemo(() => normalizeFilters(filters), [filters])
  const filterKey = useMemo(() => JSON.stringify(normalizedFilters), [normalizedFilters])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setFilters(EMPTY_FILTERS)
    setDraftFilters(EMPTY_FILTERS)
    setSearch('')
    setPage(1)
    setFilterOpen(false)
  }, [type])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, filterKey])

  function setDraftFilter(key: string, value: string) {
    setDraftFilters((current) => ({ ...current, [key]: value }))
  }

  function clearFilter(key: string) {
    setFilters((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setDraftFilters((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })
    setPage(1)
  }

  function applyFilters() {
    const allowed = new Set(FILTER_CONFIG[type])
    const next = Object.fromEntries(Object.entries(draftFilters).filter(([key]) => allowed.has(key))) as ProfileFilters
    setFilters(next)
    setPage(1)
    setFilterOpen(false)
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS)
    setDraftFilters(EMPTY_FILTERS)
    setPage(1)
    setFilterOpen(false)
  }

  const expertSkillOptions = useMemo(() => {
    const selectedDomain = EXPERTISE_DOMAINS.find((domain) => domain.name === draftFilters.domain_expertise)
    const skills = selectedDomain
      ? selectedDomain.subskills
      : EXPERTISE_DOMAINS.flatMap((domain) => domain.subskills)
    return Array.from(new Set(skills)).sort((a, b) => a.localeCompare(b))
  }, [draftFilters.domain_expertise])

  useEffect(() => {
    setLoading(true)
    setError('')
    superAdminApi.profiles({ type, search: debouncedSearch, ...normalizedFilters, page, limit: PAGE_SIZE })
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
  }, [type, debouncedSearch, filterKey, page, normalizedFilters])

  const columns = type === 'experts'
    ? [
        { key: 'name', header: 'Name', render: (row: any) => (
          <div>
            <p className="font-medium text-slate-950">{row.name}</p>
            <p className="text-xs text-slate-500">{row.current_designation || 'No role added'}</p>
          </div>
        ) },
        { key: 'email', header: 'Email', render: (row: any) => row.email },
        { key: 'expertise', header: 'Expertise', render: (row: any) => (
          <span className="text-sm text-slate-700">{[...(row.domain_expertise || []), ...(row.subskills || [])].slice(0, 3).join(', ') || '-'}</span>
        ) },
        { key: 'experience', header: 'Exp / Rate', render: (row: any) => (
          <span>{row.experience_years ? `${row.experience_years} yrs` : '-'}{row.hourly_rate ? ` / Rs.${row.hourly_rate}/hr` : ''}</span>
        ) },
        { key: 'status', header: 'Status', render: (row: any) => (
          <span className="text-sm">{row.is_verified ? 'Verified' : 'Unverified'}{row.kyc_status ? `, ${row.kyc_status}` : ''}</span>
        ) },
        { key: 'workspace', header: 'Workspace', render: (row: any) => (
          <PermissionGate permission="profiles:write" fallback={<span className="text-slate-400">No access</span>}>
            <Button asChild size="sm" className="bg-[#008260] hover:bg-[#006d51]">
              <Link href={`/superadmin/experts/${row.id}/home`} target="_blank" rel="noopener noreferrer">
                Open
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
          { key: 'size', header: 'Size', render: (row: any) => row.student_count ? `${row.student_count} students` : '-' },
          { key: 'workspace', header: 'Workspace', render: (row: any) => (
            <PermissionGate permission="profiles:write" fallback={<span className="text-slate-400">No access</span>}>
              <Button asChild size="sm" className="bg-[#008260] hover:bg-[#006d51]">
                <Link href={`/superadmin/institutions/${row.id}/home`} target="_blank" rel="noopener noreferrer">
                  Open
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </PermissionGate>
          ) },
        ]
      : [
          { key: 'name', header: 'Name', render: (row: any) => <span className="font-medium text-slate-950">{row.name}</span> },
          { key: 'email', header: 'Email', render: (row: any) => row.email },
          { key: 'degree', header: 'Education', render: (row: any) => [row.degree, row.specialization, row.year].filter(Boolean).join(' / ') || '-' },
          { key: 'skills', header: 'Skills', render: (row: any) => Array.isArray(row.skills) && row.skills.length ? row.skills.slice(0, 3).join(', ') : '-' },
          { key: 'availability', header: 'Availability', render: (row: any) => row.availability || row.preferred_engagement || '-' },
          { key: 'institution', header: 'Institution', render: (row: any) => row.institutions?.name || '-' },
        ]

  const activeFilterEntries = Object.entries(normalizedFilters)
  const draftActiveCount = Object.keys(normalizeFilters(draftFilters)).length

  return (
    <SectionCard title="Profiles" description="Search and manage experts, institutions, students, and workspace access.">
      <div className="mb-5 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs value={type} onValueChange={(value) => setType(value as ProfileType)}>
            <TabsList className="grid h-auto w-full grid-cols-3 bg-white p-1 lg:w-fit">
              <TabsTrigger value="experts">Experts</TabsTrigger>
              <TabsTrigger value="institutions">Institutions</TabsTrigger>
              <TabsTrigger value="students">Students</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input className="pl-9" placeholder={type === 'experts' ? 'Search any expert data' : 'Search name or email'} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Button
              type="button"
              variant="outline"
              className="justify-center bg-white"
              onClick={() => {
                setDraftFilters(filters)
                setFilterOpen(true)
              }}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
              {activeFilterEntries.length ? (
                <span className="ml-2 rounded-full bg-[#008260] px-2 py-0.5 text-xs font-semibold text-white">{activeFilterEntries.length}</span>
              ) : null}
            </Button>
          </div>
        </div>

        {activeFilterEntries.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilterEntries.map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() => clearFilter(key)}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-[#008260]"
              >
                {chipLabel(key, value)}
                <X className="h-3 w-3" />
              </button>
            ))}
            <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>Clear all</Button>
          </div>
        ) : null}
      </div>
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden bg-white p-0 sm:max-w-3xl">
          <DialogHeader className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center justify-between gap-3 pr-7">
              <div>
                <DialogTitle>Filter {type}</DialogTitle>
                <p className="mt-1 text-xs text-slate-500">Set fields first, then apply all filters together.</p>
              </div>
              {draftActiveCount ? <span className="text-xs font-medium text-[#008260]">{draftActiveCount} selected</span> : null}
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {type === 'experts' ? (
              <div className="grid gap-3 md:grid-cols-2">
                <FilterSelect
                  label="Domain expertise"
                  value={draftFilters.domain_expertise}
                  onChange={(v) => {
                    setDraftFilters((current) => ({ ...current, domain_expertise: v, skill: '' }))
                  }}
                  options={EXPERTISE_DOMAINS.map((domain) => ({ value: domain.name, label: domain.name }))}
                />
                <FilterSelect
                  label="Skill / subskill"
                  value={draftFilters.skill}
                  onChange={(v) => setDraftFilter('skill', v)}
                  options={expertSkillOptions.map((skill) => ({ value: skill, label: skill }))}
                />
                <FilterSelect
                  label="Expert type"
                  value={draftFilters.expert_type}
                  onChange={(v) => setDraftFilter('expert_type', v)}
                  options={EXPERT_TYPES.map((item) => ({ value: item, label: item }))}
                />
                <FilterSelect
                  label="Expert service"
                  value={draftFilters.expert_service}
                  onChange={(v) => setDraftFilter('expert_service', v)}
                  options={EXPERT_SERVICES.map((item) => ({ value: item, label: item }))}
                />
                <FilterField label="Current designation" value={draftFilters.designation} onChange={(v) => setDraftFilter('designation', v)} placeholder="Trainer, CA, Data Scientist" />
                <FilterField label="City" value={draftFilters.city} onChange={(v) => setDraftFilter('city', v)} />
                <FilterSelect label="State" value={draftFilters.state} onChange={(v) => setDraftFilter('state', v)} options={INDIAN_STATES.map((state) => ({ value: state, label: state }))} />
                <FilterSelect label="Verified profile" value={draftFilters.is_verified} onChange={(v) => setDraftFilter('is_verified', v)} options={[{ value: 'true', label: 'Verified' }, { value: 'false', label: 'Unverified' }]} />
                <FilterField label="Min experience" type="number" value={draftFilters.experience_min} onChange={(v) => setDraftFilter('experience_min', v)} />
                <FilterField label="Max experience" type="number" value={draftFilters.experience_max} onChange={(v) => setDraftFilter('experience_max', v)} />
                <FilterSelect label="KYC status" value={draftFilters.kyc_status} onChange={(v) => setDraftFilter('kyc_status', v)} options={KYC_STATUS_OPTIONS.map((item) => ({ value: item, label: item }))} />
                <FilterSelect label="CalxBook visibility" value={draftFilters.calxbook_verified} onChange={(v) => setDraftFilter('calxbook_verified', v)} options={[{ value: 'true', label: 'Visible' }, { value: 'false', label: 'Hidden' }]} />
              </div>
            ) : null}

            {type === 'institutions' ? (
              <div className="grid gap-3 md:grid-cols-2">
                <FilterField label="Institution type" value={draftFilters.institution_type} onChange={(v) => setDraftFilter('institution_type', v)} placeholder="University, College" />
                <FilterField label="City" value={draftFilters.city} onChange={(v) => setDraftFilter('city', v)} />
                <FilterSelect label="State" value={draftFilters.state} onChange={(v) => setDraftFilter('state', v)} options={INDIAN_STATES.map((state) => ({ value: state, label: state }))} />
                <FilterSelect label="Verified profile" value={draftFilters.is_verified} onChange={(v) => setDraftFilter('is_verified', v)} options={[{ value: 'true', label: 'Verified' }, { value: 'false', label: 'Unverified' }]} />
                <FilterField label="Min students" type="number" value={draftFilters.student_count_min} onChange={(v) => setDraftFilter('student_count_min', v)} />
                <FilterField label="Max students" type="number" value={draftFilters.student_count_max} onChange={(v) => setDraftFilter('student_count_max', v)} />
              </div>
            ) : null}

            {type === 'students' ? (
              <div className="grid gap-3 md:grid-cols-2">
                <FilterField label="Skill" value={draftFilters.skill} onChange={(v) => setDraftFilter('skill', v)} placeholder="React, SQL, Excel" />
                <FilterField label="Degree" value={draftFilters.degree} onChange={(v) => setDraftFilter('degree', v)} placeholder="B.Tech, MBA" />
                <FilterField label="Specialization" value={draftFilters.specialization} onChange={(v) => setDraftFilter('specialization', v)} placeholder="Computer Science" />
                <FilterField label="Year" value={draftFilters.year} onChange={(v) => setDraftFilter('year', v)} placeholder="2nd Year, Final Year" />
                <FilterField label="City" value={draftFilters.city} onChange={(v) => setDraftFilter('city', v)} />
                <FilterSelect label="State" value={draftFilters.state} onChange={(v) => setDraftFilter('state', v)} options={INDIAN_STATES.map((state) => ({ value: state, label: state }))} />
                <FilterField label="Availability" value={draftFilters.availability} onChange={(v) => setDraftFilter('availability', v)} placeholder="immediate, 1 month" />
                <FilterSelect label="Currently studying" value={draftFilters.currently_studying} onChange={(v) => setDraftFilter('currently_studying', v)} options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} />
              </div>
            ) : null}
          </div>
          <DialogFooter className="border-t border-slate-200 px-5 py-4">
            <Button type="button" variant="ghost" onClick={resetFilters}>Reset</Button>
            <Button type="button" variant="outline" onClick={() => setFilterOpen(false)}>Cancel</Button>
            <Button type="button" className="bg-[#008260] hover:bg-[#006d51]" onClick={applyFilters}>Apply filters</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {loading ? <p className="mb-3 text-sm text-slate-600">Loading profiles...</p> : null}
      {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
      <DataTable rows={rows} columns={columns} emptyText="No profiles found." />
      <PaginationControls page={page} limit={PAGE_SIZE} total={total} loading={loading} onPageChange={setPage} />
    </SectionCard>
  )
}
