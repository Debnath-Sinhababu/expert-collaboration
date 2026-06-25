'use client'

import { useEffect, useState } from 'react'
import { Activity, Banknote, BriefcaseBusiness, Building2, Clock3, GraduationCap, ListChecks, TrendingUp, Users } from 'lucide-react'
import { superAdminApi } from '@/lib/superadmin/api'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { SectionCard } from '@/components/superadmin/common/SectionCard'

export default function SuperAdminOverviewPage() {
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    superAdminApi.overviewStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load overview'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-sm text-slate-600">Loading overview...</div>
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#008260]">Operations overview</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">CalxMap activity at a glance</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Monitor profiles, requirements, training bookings, and pending attendance from one control surface.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-[#008260]">Work items</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{(stats.projects ?? 0) + (stats.internships ?? 0) + (stats.freelance ?? 0)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-slate-500">Profiles</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{(stats.experts ?? 0) + (stats.institutions ?? 0) + (stats.students ?? 0)}</p>
            </div>
            <div className="rounded-lg bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase text-amber-700">Action</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{stats.pendingAttendance ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Experts" value={stats.experts ?? 0} icon={Users} tone="green" helper="Trainer profiles" />
        <StatCard label="CalxBook Verified" value={stats.verifiedExperts ?? 0} icon={ListChecks} tone="blue" helper="Visible experts" />
        <StatCard label="Institutions" value={stats.institutions ?? 0} icon={Building2} tone="violet" helper="Client accounts" />
        <StatCard label="Students" value={stats.students ?? 0} icon={GraduationCap} tone="amber" helper="Student records" />
        <StatCard label="Projects" value={stats.projects ?? 0} icon={BriefcaseBusiness} tone="slate" helper="Training requirements" />
        <StatCard label="Internships" value={stats.internships ?? 0} icon={Activity} tone="blue" helper="Active internship flow" />
        <StatCard label="Freelance" value={stats.freelance ?? 0} icon={Banknote} tone="green" helper="Freelance projects" />
        <StatCard label="Pending Attendance" value={stats.pendingAttendance ?? 0} icon={Clock3} tone="amber" helper="Needs review" />
      </div>

      <SectionCard title="Operations Snapshot" description="Core portal metrics from profiles, requirements, bookings, and attendance." eyebrow="Live metrics">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <TrendingUp className="mb-3 h-5 w-5 text-[#008260]" />
            <p className="text-sm font-semibold text-slate-900">Total work items</p>
            <p className="mt-2 text-2xl font-bold text-[#008260]">{(stats.projects ?? 0) + (stats.internships ?? 0) + (stats.freelance ?? 0)}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <BriefcaseBusiness className="mb-3 h-5 w-5 text-[#008260]" />
            <p className="text-sm font-semibold text-slate-900">Training bookings</p>
            <p className="mt-2 text-2xl font-bold text-[#008260]">{stats.bookings ?? 0}</p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <Users className="mb-3 h-5 w-5 text-[#008260]" />
            <p className="text-sm font-semibold text-slate-900">Profile records</p>
            <p className="mt-2 text-2xl font-bold text-[#008260]">{(stats.experts ?? 0) + (stats.institutions ?? 0) + (stats.students ?? 0)}</p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
