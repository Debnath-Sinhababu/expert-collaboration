'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, GraduationCap, Handshake, ListFilter, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
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
import { DataTable } from '@/components/superadmin/common/DataTable'
import { PaginationControls } from '@/components/superadmin/common/PaginationControls'
import { PermissionGate } from '@/components/superadmin/common/PermissionGate'

const PAGE_SIZE = 20

export default function SuperAdminRequirementsPage() {
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [filterInstitutionSearch, setFilterInstitutionSearch] = useState('')
  const [filterInstitutionOptions, setFilterInstitutionOptions] = useState<any[]>([])
  const [selectedInstitution, setSelectedInstitution] = useState<any | null>(null)
  const [institutionSearch, setInstitutionSearch] = useState('')
  const [institutions, setInstitutions] = useState<any[]>([])
  const [creating, setCreating] = useState(false)
  const [requirementPdf, setRequirementPdf] = useState<File | null>(null)
  const [draftFile, setDraftFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    requirement_type: 'project',
    institution_id: '',
    title: '',
    description: '',
    project_type: 'guest_lecture',
    required_expertise: '',
    domain_expertise: '',
    subskills: '',
    job_location: '',
    workplace_type: '',
    employment_type: '',
    screening_questions: '',
    budget_min: '',
    budget_max: '',
    hourly_rate: '',
    total_budget: '',
    start_date: '',
    end_date: '',
    duration_hours: '',
    deadline: '',
    skills: '',
    work_mode: 'Remote',
    engagement: 'Part-time',
    openings: '',
    start_timing: 'immediately',
    duration_value: '',
    duration_unit: 'months',
    paid: 'Paid',
    stipend_min: '',
    stipend_max: '',
    stipend_unit: 'month',
    incentives_min: '',
    incentives_max: '',
    incentives_unit: 'month',
    ppo: 'false',
    perks: '',
    alt_phone: '',
    location: '',
  })

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [type, status, debouncedSearch, selectedInstitution?.id])

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

  async function createRequirement(e: React.FormEvent) {
    e.preventDefault()
    if (!form.institution_id || !form.title.trim()) {
      toast.error('Institution and title are required')
      return
    }
    setCreating(true)
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        required_expertise: form.required_expertise,
        subskills: form.subskills,
        screening_questions: form.screening_questions,
        skills_required: form.skills,
        required_skills: form.skills,
        hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : undefined,
        total_budget: form.total_budget ? Number(form.total_budget) : undefined,
        duration_hours: form.duration_hours ? Number(form.duration_hours) : undefined,
        budget_min: form.budget_min ? Number(form.budget_min) : undefined,
        budget_max: form.budget_max ? Number(form.budget_max) : undefined,
        openings: form.openings ? Number(form.openings) : undefined,
        duration_value: form.duration_value ? Number(form.duration_value) : undefined,
        paid: form.paid === 'Paid',
        stipend_min: form.stipend_min ? Number(form.stipend_min) : undefined,
        stipend_max: form.stipend_max ? Number(form.stipend_max) : undefined,
        incentives_min: form.incentives_min ? Number(form.incentives_min) : undefined,
        incentives_max: form.incentives_max ? Number(form.incentives_max) : undefined,
        ppo: form.ppo === 'true',
        perks: form.perks,
      }
      const fd = new FormData()
      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return
        fd.append(key, String(value))
      })
      if (requirementPdf && form.requirement_type === 'project') fd.append('requirement_pdf', requirementPdf)
      if (draftFile && form.requirement_type === 'freelance') fd.append('draft', draftFile)
      await superAdminApi.createRequirement(fd)
      toast.success('Requirement created')
      setCreateOpen(false)
      setForm((current) => ({ ...current, title: '', description: '', institution_id: '' }))
      setRequirementPdf(null)
      setDraftFile(null)
      setPage(1)
      setType(form.requirement_type)
      setRefreshKey((current) => current + 1)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create requirement')
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    setLoading(true)
    setError('')
    superAdminApi.requirements({
      type,
      status,
      search: debouncedSearch,
      institution_id: selectedInstitution?.id || '',
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
  }, [type, status, debouncedSearch, selectedInstitution?.id, page, refreshKey])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="All Requirements" value={total || rows.length} icon={ListFilter} helper="Across all institutes" />
        <StatCard label="Projects" value={rows.filter((r) => r.requirement_type === 'project').length} icon={BriefcaseBusiness} tone="blue" helper="Current page" />
        <StatCard label="Internships" value={rows.filter((r) => r.requirement_type === 'internship').length} icon={GraduationCap} tone="amber" helper="Current page" />
        <StatCard label="Freelance" value={rows.filter((r) => r.requirement_type === 'freelance').length} icon={Handshake} tone="violet" helper="Current page" />
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
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_320px]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input className="pl-9" placeholder="Search title, description, or responsibilities" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
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
        {loading ? <p className="mb-3 text-sm text-slate-600">Loading requirements...</p> : null}
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        <DataTable
          rows={rows}
          columns={[
            { key: 'title', header: 'Title', render: (row) => (
              <div>
                <p className="font-semibold text-slate-950">{row.title}</p>
                <p className="mt-1 max-w-md truncate text-xs text-slate-500">{row.description || row.responsibilities || 'No description'}</p>
              </div>
            ) },
            { key: 'type', header: 'Type', render: (row) => <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">{row.requirement_type}</span> },
            { key: 'institution', header: 'Institute', render: (row) => (
              <div>
                <p className="font-medium text-slate-900">{row.institutions?.name || '-'}</p>
                <p className="text-xs text-slate-500">{row.institutions?.email || ''}</p>
              </div>
            ) },
            { key: 'status', header: 'Status', render: (row) => <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-[#008260]">{row.status || row.call_status || '-'}</span> },
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto bg-white sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create Requirement</DialogTitle>
            <DialogDescription>Create a project, internship, or freelance requirement directly from the portal.</DialogDescription>
          </DialogHeader>
          <form onSubmit={createRequirement} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.requirement_type} onValueChange={(value) => setForm((current) => ({ ...current, requirement_type: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Training / Project</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="institutionSearch">Search institution</Label>
                <Input
                  id="institutionSearch"
                  value={institutionSearch}
                  onChange={(e) => {
                    setInstitutionSearch(e.target.value)
                    setForm((current) => ({ ...current, institution_id: '' }))
                  }}
                  placeholder="Type institution name or email"
                />
                {institutions.length > 0 && !form.institution_id ? (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                    {institutions.map((institution) => (
                      <button
                        type="button"
                        key={institution.id}
                        className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50"
                        onClick={() => {
                          setForm((current) => ({ ...current, institution_id: institution.id }))
                          setInstitutionSearch(`${institution.name} (${institution.email})`)
                        }}
                      >
                        <span className="font-medium text-slate-950">{institution.name}</span>
                        <span className="ml-2 text-slate-500">{institution.email}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {form.institution_id ? <p className="text-xs font-medium text-[#008260]">Institution selected</p> : null}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))} required />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" rows={4} value={form.description} onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))} />
              </div>

              {form.requirement_type === 'project' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="projectType">Project type</Label>
                    <Select value={form.project_type || 'training'} onValueChange={(value) => setForm((current: any) => ({ ...current, project_type: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="guest_lecture">Guest Lecture</SelectItem>
                        <SelectItem value="fdp">Faculty Development Program</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="curriculum_dev">Curriculum Development</SelectItem>
                        <SelectItem value="research_collaboration">Research Collaboration</SelectItem>
                        <SelectItem value="training_program">Training Program</SelectItem>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="domainExpertise">Domain expertise</Label>
                    <Input id="domainExpertise" value={form.domain_expertise} onChange={(e) => setForm((current) => ({ ...current, domain_expertise: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="subskills">Required specializations</Label>
                    <Input id="subskills" placeholder="Comma-separated" value={form.subskills} onChange={(e) => setForm((current) => ({ ...current, subskills: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="requiredExpertise">Required expertise</Label>
                    <Input id="requiredExpertise" placeholder="Comma-separated" value={form.required_expertise} onChange={(e) => setForm((current) => ({ ...current, required_expertise: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hourlyRate">Hourly rate</Label>
                    <Input id="hourlyRate" type="number" value={form.hourly_rate} onChange={(e) => setForm((current) => ({ ...current, hourly_rate: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="totalBudget">Total budget</Label>
                    <Input id="totalBudget" type="number" value={form.total_budget} onChange={(e) => setForm((current) => ({ ...current, total_budget: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start date</Label>
                    <Input id="startDate" type="date" value={form.start_date} onChange={(e) => setForm((current) => ({ ...current, start_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End date</Label>
                    <Input id="endDate" type="date" value={form.end_date} onChange={(e) => setForm((current) => ({ ...current, end_date: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="durationHours">Duration hours</Label>
                    <Input id="durationHours" type="number" value={form.duration_hours} onChange={(e) => setForm((current) => ({ ...current, duration_hours: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobLocation">Job location</Label>
                    <Input id="jobLocation" value={form.job_location} onChange={(e) => setForm((current) => ({ ...current, job_location: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Workplace type</Label>
                    <Select value={form.workplace_type} onValueChange={(value) => setForm((current) => ({ ...current, workplace_type: value }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="on_site">On-site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Employment type</Label>
                    <Select value={form.employment_type} onValueChange={(value) => setForm((current) => ({ ...current, employment_type: value }))}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="part_time">Part-time</SelectItem>
                        <SelectItem value="full_time">Full-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="requirementPdf">Requirement PDF</Label>
                    <Input id="requirementPdf" type="file" accept="application/pdf" onChange={(e) => setRequirementPdf(e.target.files?.[0] || null)} />
                  </div>
                </>
              ) : null}

              {form.requirement_type === 'freelance' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="budgetMin">Budget min</Label>
                    <Input id="budgetMin" type="number" value={form.budget_min} onChange={(e) => setForm((current) => ({ ...current, budget_min: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budgetMax">Budget max</Label>
                    <Input id="budgetMax" type="number" value={form.budget_max} onChange={(e) => setForm((current) => ({ ...current, budget_max: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="freelanceSkills">Required skills</Label>
                    <Input id="freelanceSkills" placeholder="Comma-separated" value={form.skills} onChange={(e) => setForm((current) => ({ ...current, skills: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input id="deadline" type="date" value={form.deadline} onChange={(e) => setForm((current) => ({ ...current, deadline: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="draft">Draft attachment</Label>
                    <Input id="draft" type="file" accept="application/pdf" onChange={(e) => setDraftFile(e.target.files?.[0] || null)} />
                  </div>
                </>
              ) : null}

              {form.requirement_type === 'internship' ? (
                <>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="internshipSkills">Skills required</Label>
                    <Input id="internshipSkills" placeholder="Comma-separated" value={form.skills} onChange={(e) => setForm((current) => ({ ...current, skills: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Work mode</Label>
                    <Select value={form.work_mode} onValueChange={(value) => setForm((current) => ({ ...current, work_mode: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Remote">Remote</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="In office">In office</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Engagement</Label>
                    <Select value={form.engagement} onValueChange={(value) => setForm((current) => ({ ...current, engagement: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Part-time">Part-time</SelectItem>
                        <SelectItem value="Full-time">Full-time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openings">Openings</Label>
                    <Input id="openings" type="number" value={form.openings} onChange={(e) => setForm((current) => ({ ...current, openings: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Start timing</Label>
                    <Select value={form.start_timing} onValueChange={(value) => setForm((current) => ({ ...current, start_timing: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediately">Immediately</SelectItem>
                        <SelectItem value="later">Later</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.start_timing === 'later' ? (
                    <div className="space-y-2">
                      <Label htmlFor="internshipStartDate">Start date</Label>
                      <Input id="internshipStartDate" type="date" value={form.start_date} onChange={(e) => setForm((current) => ({ ...current, start_date: e.target.value }))} />
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="durationValue">Duration</Label>
                    <Input id="durationValue" type="number" value={form.duration_value} onChange={(e) => setForm((current) => ({ ...current, duration_value: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Duration unit</Label>
                    <Select value={form.duration_unit} onValueChange={(value) => setForm((current) => ({ ...current, duration_unit: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weeks">Weeks</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Stipend</Label>
                    <Select value={form.paid} onValueChange={(value) => setForm((current) => ({ ...current, paid: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Unpaid">Unpaid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.paid === 'Paid' ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="stipendMin">Stipend min</Label>
                        <Input id="stipendMin" type="number" value={form.stipend_min} onChange={(e) => setForm((current) => ({ ...current, stipend_min: e.target.value }))} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="stipendMax">Stipend max</Label>
                        <Input id="stipendMax" type="number" value={form.stipend_max} onChange={(e) => setForm((current) => ({ ...current, stipend_max: e.target.value }))} />
                      </div>
                    </>
                  ) : null}
                  <div className="space-y-2">
                    <Label htmlFor="incentivesMin">Incentives min</Label>
                    <Input id="incentivesMin" type="number" value={form.incentives_min} onChange={(e) => setForm((current) => ({ ...current, incentives_min: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="incentivesMax">Incentives max</Label>
                    <Input id="incentivesMax" type="number" value={form.incentives_max} onChange={(e) => setForm((current) => ({ ...current, incentives_max: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>PPO</Label>
                    <Select value={form.ppo} onValueChange={(value) => setForm((current) => ({ ...current, ppo: value }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">No</SelectItem>
                        <SelectItem value="true">Yes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="altPhone">Alternate phone</Label>
                    <Input id="altPhone" value={form.alt_phone} onChange={(e) => setForm((current) => ({ ...current, alt_phone: e.target.value.replace(/[^0-9]/g, '') }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="perks">Perks</Label>
                    <Input id="perks" placeholder="Comma-separated" value={form.perks} onChange={(e) => setForm((current) => ({ ...current, perks: e.target.value }))} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" value={form.location} onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))} />
                  </div>
                </>
              ) : null}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="screeningQuestions">Screening questions</Label>
                <Textarea id="screeningQuestions" rows={3} placeholder="One question per line or comma-separated" value={form.screening_questions} onChange={(e) => setForm((current) => ({ ...current, screening_questions: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
              <Button type="submit" className="bg-[#008260] hover:bg-[#006d51]" disabled={creating}>
                {creating ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
