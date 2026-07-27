'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, CalendarDays, Clock3, ExternalLink, FileText, Filter, MoreHorizontal, UserRound, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { superAdminApi } from '@/lib/superadmin/api'
import { api } from '@/lib/api'

const PAGE_LIMIT = 20

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

function statusClass(status?: string | null) {
  const value = String(status || '').toLowerCase()
  if (value === 'approved') return 'bg-emerald-50 text-[#008260]'
  if (value === 'pending_review') return 'bg-amber-50 text-amber-700'
  if (value === 'disputed') return 'bg-rose-50 text-rose-700'
  return 'bg-slate-100 text-slate-700'
}

function formatList(value: unknown) {
  if (Array.isArray(value)) return value.filter(Boolean).join(', ') || '-'
  return value ? String(value) : '-'
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

function CompletionBar({ percent }: { percent?: number | null }) {
  const value = percent === null || percent === undefined ? null : Math.max(0, Math.min(100, Number(percent || 0)))
  if (value == null) return <p className="text-sm font-medium text-slate-500">Completion unavailable</p>
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">Approved attendance completion</span>
        <span className="font-semibold text-slate-950">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-[#008260]" style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

export default function RunningProjectWorkPage() {
  const params = useParams()
  const bookingId = String(params?.bookingId || '')
  const [detail, setDetail] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ date_from: '', date_to: '' })
  const [appliedFilters, setAppliedFilters] = useState({ date_from: '', date_to: '' })
  const [refreshKey, setRefreshKey] = useState(0)
  const [busyDayId, setBusyDayId] = useState('')
  const [editingDay, setEditingDay] = useState<any>(null)
  const [editTimes, setEditTimes] = useState({ entry: '', exit: '' })

  useEffect(() => {
    if (!bookingId) return
    setLoading(true)
    superAdminApi.runningProjectDetail(bookingId, { page, limit: PAGE_LIMIT, ...appliedFilters })
      .then(setDetail)
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load project work'))
      .finally(() => setLoading(false))
  }, [bookingId, page, appliedFilters, refreshKey])

  const attendance = detail?.attendance || { data: [], total: 0 }
  const booking = detail?.booking || {}
  const project = detail?.project || {}
  const expert = detail?.expert || {}
  const institution = detail?.institution || {}
  const summary = detail?.summary || {}
  const rangeSummary = detail?.rangeSummary || {}
  const hasAttendanceFilter = Boolean(appliedFilters.date_from || appliedFilters.date_to)

  const dateRangeText = useMemo(() => {
    const start = booking.start_date || project.start_date
    const end = booking.end_date || project.end_date
    return `${dateLabel(start)} - ${dateLabel(end)}`
  }, [booking.start_date, booking.end_date, project.start_date, project.end_date])

  function applyFilters() {
    setPage(1)
    setAppliedFilters(filters)
  }

  function clearFilters() {
    const empty = { date_from: '', date_to: '' }
    setFilters(empty)
    setAppliedFilters(empty)
    setPage(1)
  }

  async function runDayAction(dayId: string, action: () => Promise<unknown>, success: string) {
    setBusyDayId(dayId)
    try {
      await action()
      toast.success(success)
      setRefreshKey((current) => current + 1)
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
    if (!editingDay) return
    if (!editTimes.entry || !editTimes.exit) {
      toast.error('Entry and exit are required')
      return
    }
    await runDayAction(
      editingDay.id,
      () => api.trainingAttendance.editTimes(bookingId, editingDay.id, {
        effective_entry_at: fromDatetimeLocal(editTimes.entry),
        effective_exit_at: fromDatetimeLocal(editTimes.exit),
        approve: true,
      }),
      'Attendance times saved',
    )
    setEditingDay(null)
  }

  if (loading && !detail) return <div className="text-sm text-slate-600">Loading project work...</div>

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" className="px-0 text-slate-600">
            <Link href="/superadmin/overview/running-projects"><ArrowLeft className="mr-2 h-4 w-4" />Back to running projects</Link>
          </Button>
          {project.id ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/superadmin/requirements/project:${project.id}`}>Open requirement detail</Link>
            </Button>
          ) : null}
        </div>
        <h1 className="text-2xl font-bold text-slate-950">{project.title || 'Running project work'}</h1>
        <p className="mt-1 text-sm text-slate-600">{expert.name || 'Expert'} at {institution.name || 'institution'}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Completion" value={`${booking.completion_percent ?? 0}%`} icon={Clock3} tone="green" helper="Approved attendance" />
        <StatCard label="Approved Hours" value={summary.totalHoursApproved ?? 0} icon={Clock3} tone="blue" helper={`${summary.hoursBooked ?? 0} booked`} />
        <StatCard label="Approved Days" value={summary.daysApproved ?? 0} icon={CalendarDays} tone="amber" helper={`${summary.daysPending ?? 0} pending review`} />
        <StatCard label="Attendance Rows" value={attendance.total ?? 0} icon={FileText} helper="Current filter" />
      </div>

      <div className="grid gap-4">
        <SectionCard title="Expert Work" description="Project and expert details for this active booking.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start gap-3">
                {expert.photo_url ? (
                  <img src={expert.photo_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-[#008260]">
                    <UserRound className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-950">{expert.name || '-'}</p>
                  <p className="truncate text-xs text-slate-500">{expert.email || '-'}</p>
                  <p className="truncate text-xs text-slate-500">{expert.phone || '-'}</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 text-sm">
                <div><span className="text-slate-500">Domain</span><p className="font-medium text-slate-950">{formatList(expert.domain_expertise)}</p></div>
                <div><span className="text-slate-500">Experience</span><p className="font-medium text-slate-950">{expert.experience_years ?? '-'} years</p></div>
                <div><span className="text-slate-500">Location</span><p className="font-medium text-slate-950">{[expert.city, expert.state].filter(Boolean).join(', ') || '-'}</p></div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Project</p>
              <p className="mt-1 text-sm font-semibold text-slate-950">{project.title || '-'}</p>
              <div className="mt-4 grid gap-3 text-sm">
                <div><span className="text-slate-500">Institution</span><p className="font-medium text-slate-950">{institution.name || '-'}</p></div>
                <div><span className="text-slate-500">Schedule</span><p className="font-medium text-slate-950">{dateRangeText}</p></div>
                <div><span className="text-slate-500">Booking status</span><p className="font-medium capitalize text-slate-950">{String(booking.status || '-').replace(/_/g, ' ')}</p></div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <CompletionBar percent={booking.completion_percent} />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Attendance List"
        description="Entry, exit, review status, and submitted attachments."
        action={
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
                  <Button type="button" variant="ghost" size="sm" onClick={clearFilters} disabled={loading}>
                    Clear
                  </Button>
                  <Button type="button" size="sm" className="bg-[#008260] hover:bg-[#006d51]" onClick={applyFilters} disabled={loading}>
                    Apply
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        }
      >
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-slate-900">Current range</span>
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-600">
              {appliedFilters.date_from || 'All start'} - {appliedFilters.date_to || 'All end'}
            </span>
            {hasAttendanceFilter ? (
              <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-[#008260]">
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
            ) : null}
          </div>
          <div className="flex gap-4 text-sm">
            <div><span className="text-slate-500">Range hours</span><p className="font-semibold text-slate-950">{rangeSummary.totalHoursApproved ?? 0}</p></div>
            <div><span className="text-slate-500">Approved days</span><p className="font-semibold text-slate-950">{rangeSummary.daysApproved ?? 0}</p></div>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Entry</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Exit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Effective Entry</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Effective Exit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Attachments</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Note</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {attendance.data?.length ? attendance.data.map((day: any) => (
                  <tr key={day.id} className="hover:bg-emerald-50/40">
                    <td className="whitespace-nowrap px-4 py-4 text-slate-700">{dateLabel(day.session_date)}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(day.status)}`}>
                        {String(day.status || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-700">{dateTimeLabel(day.expert_entry_at)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-700">{dateTimeLabel(day.expert_exit_at)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-700">{dateTimeLabel(day.effective_entry_at)}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-slate-700">{dateTimeLabel(day.effective_exit_at)}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex gap-3">
                        <AttachmentLink href={day.entry_attachment_url} label="Entry" />
                        <AttachmentLink href={day.exit_attachment_url} label="Exit" />
                      </div>
                    </td>
                    <td className="max-w-xs truncate px-4 py-4 text-slate-600">{day.dispute_reason || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {day.status === 'pending_review' ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={busyDayId === day.id}
                            onClick={() => runDayAction(day.id, () => api.trainingAttendance.approve(bookingId, day.id), 'Attendance approved')}
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
                            onClick={() => runDayAction(day.id, () => api.trainingAttendance.markExit(bookingId, day.id), 'Exit marked')}
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
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                      No attendance found for this range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {page} of {Math.max(1, Math.ceil((attendance.total || 0) / PAGE_LIMIT))}</p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </Button>
            <Button type="button" variant="outline" disabled={page * PAGE_LIMIT >= (attendance.total || 0) || loading} onClick={() => setPage((current) => current + 1)}>
              Next
            </Button>
          </div>
        </div>
      </SectionCard>

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
              <Button type="button" variant="outline" onClick={() => setEditingDay(null)} disabled={busyDayId === editingDay.id}>
                Cancel
              </Button>
              <Button type="button" className="bg-[#008260] hover:bg-[#006d51]" onClick={saveEditTimes} disabled={busyDayId === editingDay.id}>
                Save & approve
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
