'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, Banknote, BriefcaseBusiness, Building2, Download, GraduationCap, ListChecks, TrendingUp, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SectionCard } from '@/components/superadmin/common/SectionCard'
import { StatCard } from '@/components/superadmin/common/StatCard'
import { superAdminApi } from '@/lib/superadmin/api'

function statusValue(stats: any, key: string) {
  return stats?.requirements?.[key] ?? 0
}

function category(stats: any, key: 'projects' | 'internships' | 'freelance') {
  return stats?.requirements?.categories?.[key] || { total: 0, running: 0, pending: 0, closed: 0 }
}

export default function SuperAdminOverviewPage() {
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exportFilters, setExportFilters] = useState({ date_from: '', date_to: '', month: '', year: '' })
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    superAdminApi.overviewStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load overview'))
      .finally(() => setLoading(false))
  }, [])

  async function exportOverview() {
    setExporting(true)
    try {
      await superAdminApi.exportOverview(exportFilters)
      toast.success('Business overview exported')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <div className="text-sm text-slate-600">Loading overview...</div>
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>

  const categories = [
    { key: 'projects', label: 'Projects', icon: BriefcaseBusiness, tone: 'blue' as const },
    { key: 'internships', label: 'Internships', icon: GraduationCap, tone: 'amber' as const },
    { key: 'freelance', label: 'Freelance', icon: Banknote, tone: 'violet' as const },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-[#008260]">Operations overview</p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950">Business performance dashboard</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Track requirement health, profile growth, attendance review, and finance readiness from one place.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[140px_140px_120px_120px_auto]">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input type="date" value={exportFilters.date_from} onChange={(e) => setExportFilters((c) => ({ ...c, date_from: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input type="date" value={exportFilters.date_to} onChange={(e) => setExportFilters((c) => ({ ...c, date_to: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Month</Label>
              <Input placeholder="06" value={exportFilters.month} onChange={(e) => setExportFilters((c) => ({ ...c, month: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Year</Label>
              <Input placeholder="2026" value={exportFilters.year} onChange={(e) => setExportFilters((c) => ({ ...c, year: e.target.value }))} />
            </div>
            <Button type="button" className="self-end bg-[#008260] hover:bg-[#006d51]" onClick={exportOverview} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Requirements" value={statusValue(stats, 'total')} icon={ListChecks} helper="All business work items" />
        <StatCard label="Running / Live" value={statusValue(stats, 'running')} icon={Activity} tone="blue" helper="Expert or worker selected" />
        <StatCard label="Pending Start" value={statusValue(stats, 'pending')} icon={TrendingUp} tone="amber" helper="Open and not started" />
        <StatCard label="Closed" value={statusValue(stats, 'closed')} icon={BriefcaseBusiness} tone="slate" helper="Completed or closed" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Experts" value={stats.experts ?? 0} icon={Users} tone="green" helper="Trainer profiles" />
        <StatCard label="Verified Experts" value={stats.verifiedExperts ?? 0} icon={ListChecks} tone="blue" helper="CalxBook visible" />
        <StatCard label="Institutions" value={stats.institutions ?? 0} icon={Building2} tone="violet" helper="Client accounts" />
        <StatCard label="Students" value={stats.students ?? 0} icon={GraduationCap} tone="amber" helper="Student records" />
      </div>

      <SectionCard title="Requirement Categories" description="Open a category to review totals, running work, pending requirements, closed work, and trend graphs.">
        <div className="grid gap-4 lg:grid-cols-3">
          {categories.map((item) => {
            const values = category(stats, item.key as any)
            const Icon = item.icon
            return (
              <Link key={item.key} href={`/superadmin/overview/${item.key}`} className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-[#008260]/40 hover:bg-white hover:shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{item.label}</p>
                    <p className="mt-1 text-xs text-slate-500">Total, running, pending, closed</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#008260] shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  {['total', 'running', 'pending', 'closed'].map((key) => (
                    <div key={key} className="rounded-md bg-white px-2 py-2">
                      <p className="text-lg font-bold text-slate-950">{values[key] || 0}</p>
                      <p className="text-[11px] capitalize text-slate-500">{key}</p>
                    </div>
                  ))}
                </div>
              </Link>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}
