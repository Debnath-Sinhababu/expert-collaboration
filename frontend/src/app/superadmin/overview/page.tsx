'use client'

import { useEffect, useState } from 'react'
import { Banknote, BriefcaseBusiness, Building2, Clock3, GraduationCap, ListChecks, Users } from 'lucide-react'
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Experts" value={stats.experts ?? 0} icon={Users} tone="green" />
        <StatCard label="CalxBook Verified" value={stats.verifiedExperts ?? 0} icon={ListChecks} tone="blue" />
        <StatCard label="Institutions" value={stats.institutions ?? 0} icon={Building2} tone="violet" />
        <StatCard label="Students" value={stats.students ?? 0} icon={GraduationCap} tone="amber" />
        <StatCard label="Projects" value={stats.projects ?? 0} icon={BriefcaseBusiness} tone="slate" />
        <StatCard label="Internships" value={stats.internships ?? 0} icon={BriefcaseBusiness} tone="blue" />
        <StatCard label="Freelance" value={stats.freelance ?? 0} icon={Banknote} tone="green" />
        <StatCard label="Pending Attendance" value={stats.pendingAttendance ?? 0} icon={Clock3} tone="amber" />
      </div>

      <SectionCard title="Operations Snapshot" description="Core portal metrics from profiles, requirements, bookings, and attendance.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Total work items</p>
            <p className="mt-2 text-2xl font-bold text-[#008260]">{(stats.projects ?? 0) + (stats.internships ?? 0) + (stats.freelance ?? 0)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Training bookings</p>
            <p className="mt-2 text-2xl font-bold text-[#008260]">{stats.bookings ?? 0}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Profile records</p>
            <p className="mt-2 text-2xl font-bold text-[#008260]">{(stats.experts ?? 0) + (stats.institutions ?? 0) + (stats.students ?? 0)}</p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}
