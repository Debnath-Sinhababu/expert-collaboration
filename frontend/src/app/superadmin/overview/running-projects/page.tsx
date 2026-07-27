'use client'

import { type FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Filter,
  MoreHorizontal,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Drawer } from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { superAdminApi } from '@/lib/superadmin/api'
import { api } from '@/lib/api'
import { projectStatusLabel } from '@/lib/projectStatus'

const PROJECT_PAGE_LIMIT = 12
const ATTENDANCE_PAGE_LIMIT = 20

function dateLabel(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString()
}

function dateTimeLabel(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString()
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDatetimeLocal(value: string) {
  return value ? new Date(value).toISOString() : ''
}

function statusLabel(status?: string | null) {
  return projectStatusLabel(String(status || '').replace(/\s+/g, '_'))
}

function statusClass(status?: string | null) {
  const value = String(status || '').toLowerCase()
  if (value === 'approved') return 'bg-emerald-50 text-[#008260]'
  if (value === 'pending_review') return 'bg-amber-50 text-amber-700'
  if (value === 'disputed') return 'bg-rose-50 text-rose-700'
  return 'bg-slate-100 text-slate-700'
}

function percentValue(value: unknown) {
  if (value === null || value === undefined) return null
  return Math.max(0, Math.min(100, Number(value || 0)))
}

function CompletionBar({ value, label = 'Completion' }: { value?: number | null; label?: string }) {
  const percent = percentValue(value)
  if (percent == null) return <span className="text-xs font-medium text-slate-500">Unknown</span>
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-semibold text-slate-950">{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-[#008260]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function AttachmentLink({ href, label }: { href?: string | null; label: string }) {
  if (!href) return <span className="text-xs text-slate-400">-</span>
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#008260] hover:underline">
      <ExternalLink className="h-3.5 w-3.5" />
      {label}
    </a>
  )
}

export default function RunningProjectsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [expandedProjectId, setExpandedProjectId] = useState('')
  const [expandedBookingId, setExpandedBookingId] = useState('')
  const [attendanceDrawerOpen, setAttendanceDrawerOpen] = useState(false)
  const [attendanceDetail, setAttendanceDetail] = useState<any>(null)
  const [attendanceLoading, setAttendanceLoading] = useState(false)
  const [projectRefreshKey, setProjectRefreshKey] = useState(0)
  const [attendancePage, setAttendancePage] = useState(1)
  const [projectFilters, setProjectFilters] = useState({ search: '', attendance_status: 'all' })
  const [appliedProjectFilters, setAppliedProjectFilters] = useState({ search: '', attendance_status: 'all' })
  const [filters, setFilters] = useState({ date_from: '', date_to: '' })
  const [appliedFilters, setAppliedFilters] = useState({ date_from: '', date_to: '' })
  const [refreshKey, setRefreshKey] = useState(0)
  const [busyDayId, setBusyDayId] = useState('')
  const [editingDay, setEditingDay] = useState<any>(null)
  const [editTimes, setEditTimes] = useState({ entry: '', exit: '' })

  useEffect(() => {
    setLoadingProjects(true)
    superAdminApi.runningProjects({
      page,
      limit: PROJECT_PAGE_LIMIT,
      search: appliedProjectFilters.search,
      attendance_status: appliedProjectFilters.attendance_status,
    })
      .then((res) => {
        setRows(res.data || [])
        setTotal(res.total || 0)
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load running projects'))
      .finally(() => setLoadingProjects(false))
  }, [page, projectRefreshKey, appliedProjectFilters])

  useEffect(() => {
    if (!expandedBookingId) return
    setAttendanceLoading(true)
    superAdminApi.runningProjectDetail(expandedBookingId, {
      page: attendancePage,
      limit: ATTENDANCE_PAGE_LIMIT,
      ...appliedFilters,
    })
      .then(setAttendanceDetail)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load attendance'))
      .finally(() => setAttendanceLoading(false))
  }, [expandedBookingId, attendancePage, appliedFilters, refreshKey])

  const selectedProjectRow = rows.find((row) => (row.bookings || []).some((booking: any) => booking.id === expandedBookingId))
  const selectedBooking = selectedProjectRow?.bookings?.find((booking: any) => booking.id === expandedBookingId) || null

  function applyProjectFilters(event?: FormEvent) {
    event?.preventDefault()
    setPage(1)
    setExpandedProjectId('')
    setAppliedProjectFilters({
      search: projectFilters.search.trim(),
      attendance_status: projectFilters.attendance_status,
    })
  }

  function clearProjectFilters() {
    const empty = { search: '', attendance_status: 'all' }
    setProjectFilters(empty)
    setAppliedProjectFilters(empty)
    setPage(1)
    setExpandedProjectId('')
  }

  function toggleProject(projectId: string) {
    setExpandedProjectId((current) => (current === projectId ? '' : projectId))
  }

  function openAttendance(bookingId: string) {
    if (expandedBookingId !== bookingId) {
      setExpandedBookingId(bookingId)
      setAttendanceDetail(null)
      setAttendancePage(1)
      setFilters({ date_from: '', date_to: '' })
      setAppliedFilters({ date_from: '', date_to: '' })
    }
    setAttendanceDrawerOpen(true)
  }

  function handleAttendanceDrawerOpenChange(open: boolean) {
    setAttendanceDrawerOpen(open)
    if (!open) setEditingDay(null)
  }

  function applyFilters() {
    setAttendancePage(1)
    setAppliedFilters(filters)
  }

  function clearFilters() {
    const empty = { date_from: '', date_to: '' }
    setFilters(empty)
    setAppliedFilters(empty)
    setAttendancePage(1)
  }

  async function runDayAction(dayId: string, action: () => Promise<unknown>, success: string) {
    setBusyDayId(dayId)
    try {
      await action()
      toast.success(success)
      setRefreshKey((current) => current + 1)
      setProjectRefreshKey((current) => current + 1)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusyDayId('')
    }
  }

  function openEditTimes(day: any) {
    setEditingDay(day)
    setEditTimes({
      entry: toDatetimeLocal(day.effective_entry_at || day.expert_entry_at),
      exit: toDatetimeLocal(day.effective_exit_at || day.expert_exit_at),
    })
  }

  async function saveEditTimes() {
    if (!editingDay || !expandedBookingId) return
    if (!editTimes.entry || !editTimes.exit) {
      toast.error('Entry and exit are required')
      return
    }
    await runDayAction(
      editingDay.id,
      () => api.trainingAttendance.editTimes(expandedBookingId, editingDay.id, {
        effective_entry_at: fromDatetimeLocal(editTimes.entry),
        effective_exit_at: fromDatetimeLocal(editTimes.exit),
        approve: true,
      }),
      'Attendance times saved',
    )
    setEditingDay(null)
  }

  function AttendancePanel({ booking }: { booking: any }) {
    const attendance = attendanceDetail?.attendance || { data: [], total: 0 }
    const rangeSummary = attendanceDetail?.rangeSummary || {}
    const hasAttendanceFilter = Boolean(appliedFilters.date_from || appliedFilters.date_to)

    if (attendanceLoading && !attendanceDetail) {
      return <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">Loading attendance...</div>
    }

    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Attendance for {booking.expert?.name || 'expert'}</p>
            <p className="mt-1 text-xs text-slate-500">
              {appliedFilters.date_from || 'All start'} - {appliedFilters.date_to || 'All end'} / {rangeSummary.totalHoursApproved ?? 0} approved hours / {rangeSummary.daysApproved ?? 0} approved days
            </p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="icon" className="relative h-9 w-9">
                <MoreHorizontal className="h-4 w-4" />
                {hasAttendanceFilter ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#008260]" /> : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 border-slate-200 p-0">
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-[#008260]" />
                  <p className="text-sm font-semibold text-slate-950">Filter attendance</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">Use session date range.</p>
              </div>
              <div className="space-y-3 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input type="date" value={filters.date_from} onChange={(event) => setFilters((current) => ({ ...current, date_from: event.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input type="date" value={filters.date_to} onChange={(event) => setFilters((current) => ({ ...current, date_to: event.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={clearFilters} disabled={attendanceLoading}>Clear</Button>
                  <Button type="button" size="sm" className="bg-[#008260] hover:bg-[#006d51]" onClick={applyFilters} disabled={attendanceLoading}>Apply</Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {hasAttendanceFilter ? (
          <button type="button" onClick={clearFilters} className="mb-3 inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-[#008260]">
            <X className="h-3.5 w-3.5" />
            Clear date filter
          </button>
        ) : null}

        {attendance.data?.length ? (
          <div className="grid gap-3">
            {attendance.data.map((day: any) => (
              <article key={day.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-950">{dateLabel(day.session_date)}</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(day.status)}`}>
                        {String(day.status || '').replace(/_/g, ' ')}
                      </span>
                    </div>
                    {day.dispute_reason ? <p className="mt-2 text-sm text-rose-700">{day.dispute_reason}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {day.status === 'pending_review' ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyDayId === day.id}
                        onClick={() => runDayAction(day.id, () => api.trainingAttendance.approve(booking.id, day.id), 'Attendance approved')}
                        className="bg-[#008260] hover:bg-[#006d51]"
                      >
                        Approve
                      </Button>
                    ) : null}
                    {day.status === 'open' && day.expert_entry_at && !day.expert_exit_at ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busyDayId === day.id}
                        onClick={() => runDayAction(day.id, () => api.trainingAttendance.markExit(booking.id, day.id), 'Exit marked')}
                        className="bg-[#FF6A00] hover:bg-[#E55F00]"
                      >
                        Mark exit
                      </Button>
                    ) : null}
                    {(day.status === 'pending_review' || day.status === 'approved') ? (
                      <Button type="button" size="sm" variant="outline" disabled={busyDayId === day.id} onClick={() => openEditTimes(day)}>
                        Edit times
                      </Button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Entry</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{dateTimeLabel(day.expert_entry_at)}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Exit</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{dateTimeLabel(day.expert_exit_at)}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Effective Entry</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{dateTimeLabel(day.effective_entry_at)}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Effective Exit</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{dateTimeLabel(day.effective_exit_at)}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-white px-3 py-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Attachments</span>
                  <AttachmentLink href={day.entry_attachment_url} label="Entry" />
                  <AttachmentLink href={day.exit_attachment_url} label="Exit" />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
            No attendance found for this range.
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {attendancePage} of {Math.max(1, Math.ceil((attendance.total || 0) / ATTENDANCE_PAGE_LIMIT))}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={attendancePage <= 1 || attendanceLoading} onClick={() => setAttendancePage((current) => Math.max(1, current - 1))}>Previous</Button>
            <Button type="button" variant="outline" disabled={attendancePage * ATTENDANCE_PAGE_LIMIT >= (attendance.total || 0) || attendanceLoading} onClick={() => setAttendancePage((current) => current + 1)}>Next</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" className="mb-2 px-0 text-slate-600">
          <Link href="/superadmin/overview"><ArrowLeft className="mr-2 h-4 w-4" />Back to overview</Link>
        </Button>
        <h1 className="text-2xl font-bold text-slate-950">Running Projects</h1>
        <p className="mt-1 text-sm text-slate-600">Project, institution, expert, and attendance review in one place.</p>
      </div>

      <SectionCard title="Project Work" description="Expand a project, then open an expert attendance drawer when review is needed.">
        <form onSubmit={applyProjectFilters} className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1 space-y-1">
            <Label className="text-xs">Search</Label>
            <Input
              value={projectFilters.search}
              onChange={(event) => setProjectFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Project, institution, expert, or email"
            />
          </div>
          <div className="space-y-1 lg:w-52">
            <Label className="text-xs">Attendance status</Label>
            <Select
              value={projectFilters.attendance_status}
              onValueChange={(value) => setProjectFilters((current) => ({ ...current, attendance_status: value }))}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="All attendance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All attendance</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="disputed">Disputed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" className="bg-[#008260] hover:bg-[#006d51]">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button type="button" variant="outline" onClick={clearProjectFilters}>
              Clear
            </Button>
          </div>
        </form>

        {loadingProjects ? (
          <div className="text-sm text-slate-600">Loading running projects...</div>
        ) : rows.length ? (
          <div className="space-y-4">
            {rows.map((row) => {
              const projectOpen = expandedProjectId === row.id
              return (
                <article key={row.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="flex w-full flex-col gap-4 bg-slate-50 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 gap-3">
                      <button
                        type="button"
                        onClick={() => toggleProject(row.id)}
                        className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#008260] shadow-sm hover:bg-emerald-50"
                        aria-label={projectOpen ? 'Collapse project' : 'Expand project'}
                      >
                        {projectOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                      </button>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-[#008260]">{statusLabel(row.project?.status)}</span>
                          <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">{row.experts_count || row.bookings?.length || 0} experts</span>
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">{row.pending_days || 0} pending</span>
                          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">{row.disputed_days || 0} disputed</span>
                        </div>
                        <button type="button" onClick={() => toggleProject(row.id)} className="mt-2 block max-w-full truncate text-left text-base font-semibold text-slate-950 hover:text-[#008260]">
                          {row.project?.title || 'Project'}
                        </button>
                        <p className="mt-1 text-sm text-slate-600">{row.institution?.name || 'Institution unavailable'} / {dateLabel(row.start_date)} - {dateLabel(row.end_date)}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[160px_150px_auto] sm:items-center">
                      <CompletionBar value={row.completion_percent} label="Project attendance" />
                      <div className="text-sm">
                        <p className="font-semibold text-slate-950">{row.approved_hours || 0} / {row.hours_booked || 0}h</p>
                        <p className="text-xs text-slate-500">approved / booked</p>
                      </div>
                      {row.project?.id ? (
                        <Link
                          href={`/superadmin/requirements/project:${row.project.id}`}
                          onClick={(event) => event.stopPropagation()}
                          className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-[#008260] hover:text-[#008260]"
                        >
                          Requirement detail
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  {projectOpen ? (
                    <div className="border-t border-slate-200 p-4">
                      <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
                        {(row.bookings || []).map((booking: any) => (
                          <div key={booking.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-950">{booking.expert?.name || 'Expert unavailable'}</p>
                              <p className="truncate text-xs text-slate-500">{booking.expert?.email || '-'}</p>
                            </div>
                            <div className="flex shrink-0 items-center gap-3">
                              <span className="min-w-12 text-right text-sm font-semibold text-slate-950">
                                {percentValue(booking.completion_percent) == null ? '-' : `${percentValue(booking.completion_percent)}%`}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                className="gap-2 bg-[#008260] hover:bg-[#006d51]"
                                onClick={() => openAttendance(booking.id)}
                                aria-label={`Open attendance for ${booking.expert?.name || 'expert'}`}
                              >
                                <CalendarDays className="h-4 w-4" />
                                <span>Attendance</span>
                                {Number(booking.pending_days || 0) > 0 ? (
                                  <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold text-white">
                                    {booking.pending_days}
                                  </span>
                                ) : null}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">No running project bookings found.</p>
            <p className="mt-1 text-xs text-slate-500">Running project work will appear here after a project has an active booking.</p>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {page}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={page <= 1 || loadingProjects} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
            <Button type="button" variant="outline" disabled={page * PROJECT_PAGE_LIMIT >= total || loadingProjects} onClick={() => setPage((current) => current + 1)}>Next</Button>
          </div>
        </div>
      </SectionCard>

      <Drawer
        open={attendanceDrawerOpen}
        onOpenChange={handleAttendanceDrawerOpenChange}
        title={selectedBooking?.expert?.name ? `${selectedBooking.expert.name} attendance` : 'Attendance'}
        className="bottom-0 left-0 right-0 top-auto h-[88vh] w-full rounded-t-2xl sm:w-full lg:w-full"
      >
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
          {selectedBooking ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{selectedProjectRow?.project?.title || selectedBooking.project?.title || 'Project'}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedProjectRow?.institution?.name || selectedBooking.institution?.name || 'Institution unavailable'} / {dateLabel(selectedProjectRow?.start_date || selectedBooking.start_date)} - {dateLabel(selectedProjectRow?.end_date || selectedBooking.end_date)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                      {String(selectedBooking.status || '-').replace(/_/g, ' ')}
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                      {selectedBooking.pending_days || 0} pending
                    </span>
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
                      {selectedBooking.disputed_days || 0} disputed
                    </span>
                  </div>
                </div>
              </div>
              <AttendancePanel booking={selectedBooking} />
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">Select an expert to review attendance.</div>
          )}
        </div>
      </Drawer>

      {editingDay ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-5 shadow-xl">
            <h2 className="text-base font-semibold text-slate-950">Edit attendance times</h2>
            <p className="mt-1 text-sm text-slate-600">Saving will approve this attendance row with the effective entry and exit times.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Effective entry</Label>
                <Input type="datetime-local" value={editTimes.entry} onChange={(event) => setEditTimes((current) => ({ ...current, entry: event.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Effective exit</Label>
                <Input type="datetime-local" value={editTimes.exit} onChange={(event) => setEditTimes((current) => ({ ...current, exit: event.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingDay(null)} disabled={busyDayId === editingDay.id}>Cancel</Button>
              <Button type="button" className="bg-[#008260] hover:bg-[#006d51]" onClick={saveEditTimes} disabled={busyDayId === editingDay.id}>Save & approve</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
