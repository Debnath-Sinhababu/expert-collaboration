'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarDays, ChevronDown, Clock3, UserRound } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { superAdminApi } from '@/lib/superadmin/api'
import { projectStatusLabel } from '@/lib/projectStatus'

const PAGE_LIMIT = 12

function dateLabel(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString()
}

function statusLabel(status?: string | null) {
  return projectStatusLabel(String(status || '').replace(/\s+/g, '_'))
}

function completionValue(row: any) {
  return row.completion_percent === null || row.completion_percent === undefined
    ? null
    : Math.max(0, Math.min(100, Number(row.completion_percent || 0)))
}

function CompletionBar({ row }: { row: any }) {
  const percent = completionValue(row)
  if (percent == null) return <p className="text-xs font-medium text-slate-500">Completion unavailable</p>
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium text-slate-600">Attendance completion</span>
        <span className="font-semibold text-slate-950">{percent}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-[#008260]" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export default function RunningProjectsPage() {
  const [rows, setRows] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    superAdminApi.runningProjects({ page, limit: PAGE_LIMIT })
      .then((res) => {
        setRows(res.data || [])
        setTotal(res.total || 0)
      })
      .catch((err) => toast.error(err instanceof Error ? err.message : 'Failed to load running projects'))
      .finally(() => setLoading(false))
  }, [page])

  const totalApprovedHours = rows.reduce((sum, row) => sum + Number(row.approved_hours || 0), 0)
  const totalBookedHours = rows.reduce((sum, row) => sum + Number(row.hours_booked || 0), 0)
  const totalExperts = rows.reduce((sum, row) => sum + Number(row.experts_count || row.bookings?.length || 0), 0)

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" className="mb-2 px-0 text-slate-600">
          <Link href="/superadmin/overview"><ArrowLeft className="mr-2 h-4 w-4" />Back to overview</Link>
        </Button>
        <h1 className="text-2xl font-bold text-slate-950">Running Projects</h1>
        <p className="mt-1 text-sm text-slate-600">Active project bookings with expert attendance completion.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Visible Projects" value={rows.length} icon={BriefcaseBusiness} helper={`Total ${total}`} />
        <StatCard label="Approved Hours" value={Math.round(totalApprovedHours * 100) / 100} icon={Clock3} tone="green" helper="Current page" />
        <StatCard label="Booked Hours" value={Math.round(totalBookedHours * 100) / 100} icon={CalendarDays} tone="blue" helper="Current page" />
        <StatCard label="Experts" value={totalExperts} icon={UserRound} tone="amber" helper="Current page" />
      </div>

      <SectionCard title="Project Work" description="Open a card to review that expert's project attendance.">
        {loading ? (
          <div className="text-sm text-slate-600">Loading running projects...</div>
        ) : rows.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {rows.map((row) => (
              <article key={row.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-[#008260]">
                        {statusLabel(row.project?.status)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">
                        {String(row.status || '').replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h2 className="mt-3 truncate text-base font-semibold text-slate-950">{row.project?.title || 'Project'}</h2>
                    <p className="mt-1 text-sm text-slate-600">{row.institution?.name || 'Institution unavailable'}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#008260]">
                    {row.experts_count || row.bookings?.length || 0} expert{Number(row.experts_count || row.bookings?.length || 0) === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Experts</p>
                    <p className="mt-1 truncate text-sm font-semibold text-slate-950">
                      {(row.bookings || []).map((booking: any) => booking.expert?.name).filter(Boolean).slice(0, 2).join(', ') || 'Experts unavailable'}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {Number(row.experts_count || row.bookings?.length || 0)} active booking{Number(row.experts_count || row.bookings?.length || 0) === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Schedule</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{dateLabel(row.start_date)} - {dateLabel(row.end_date)}</p>
                    <p className="text-xs text-slate-500">{row.approved_hours || 0} / {row.hours_booked || 0} approved hours</p>
                  </div>
                </div>

                <div className="mt-4">
                  <CompletionBar row={row} />
                </div>

                <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold text-slate-800">
                    Expert work
                    <ChevronDown className="h-4 w-4 text-slate-500" />
                  </summary>
                  <div className="divide-y divide-slate-200 border-t border-slate-200 bg-white">
                    {(row.bookings || []).map((booking: any) => (
                      <div key={booking.id} className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-950">{booking.expert?.name || 'Expert unavailable'}</p>
                          <p className="truncate text-xs text-slate-500">{booking.expert?.email || '-'}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {booking.approved_hours || 0} / {booking.hours_booked || 0} approved hours
                          </p>
                        </div>
                        <Button asChild size="sm" className="shrink-0 bg-[#008260] hover:bg-[#006d51]">
                          <Link href={`/superadmin/overview/running-projects/${booking.id}`}>
                            View work
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                </details>
              </article>
            ))}
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
            <Button type="button" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </Button>
            <Button type="button" variant="outline" disabled={page * PAGE_LIMIT >= total || loading} onClick={() => setPage((current) => current + 1)}>
              Next
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
