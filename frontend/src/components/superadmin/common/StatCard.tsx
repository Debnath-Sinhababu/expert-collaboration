'use client'

import type { ElementType } from 'react'
import { ArrowUpRight } from 'lucide-react'

type StatCardProps = {
  label: string
  value: string | number
  icon?: ElementType
  tone?: 'green' | 'blue' | 'amber' | 'violet' | 'slate'
  helper?: string
  trend?: string
}

const tones = {
  green: {
    panel: 'from-emerald-50 to-white',
    icon: 'bg-[#008260] text-white shadow-emerald-200',
    accent: 'text-[#008260]',
  },
  blue: {
    panel: 'from-sky-50 to-white',
    icon: 'bg-sky-600 text-white shadow-sky-200',
    accent: 'text-sky-700',
  },
  amber: {
    panel: 'from-amber-50 to-white',
    icon: 'bg-amber-500 text-white shadow-amber-200',
    accent: 'text-amber-700',
  },
  violet: {
    panel: 'from-violet-50 to-white',
    icon: 'bg-violet-600 text-white shadow-violet-200',
    accent: 'text-violet-700',
  },
  slate: {
    panel: 'from-slate-100 to-white',
    icon: 'bg-slate-800 text-white shadow-slate-200',
    accent: 'text-slate-700',
  },
}

export function StatCard({ label, value, icon: Icon, tone = 'green', helper, trend }: StatCardProps) {
  const styles = tones[tone]
  return (
    <article className={`group relative overflow-hidden rounded-lg border border-slate-200 bg-gradient-to-br ${styles.panel} p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#008260]/30 hover:shadow-md`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 truncate text-3xl font-bold tracking-tight text-slate-950">{value}</p>
          {helper ? <p className="mt-2 text-sm text-slate-600">{helper}</p> : null}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg shadow-sm ${styles.icon}`}>
          {Icon ? <Icon className="h-5 w-5" /> : <ArrowUpRight className="h-5 w-5" />}
        </div>
      </div>
      {trend ? (
        <div className={`mt-4 inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold ${styles.accent}`}>
          <ArrowUpRight className="h-3.5 w-3.5" />
          {trend}
        </div>
      ) : null}
    </article>
  )
}
