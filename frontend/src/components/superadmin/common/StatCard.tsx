'use client'

import type { ElementType } from 'react'

type StatCardProps = {
  label: string
  value: string | number
  icon?: ElementType
  tone?: 'green' | 'blue' | 'amber' | 'violet' | 'slate'
}

const tones = {
  green: 'bg-emerald-50 text-[#008260]',
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  slate: 'bg-slate-100 text-slate-700',
}

export function StatCard({ label, value, icon: Icon, tone = 'green' }: StatCardProps) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p>
        </div>
        {Icon ? (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </div>
    </article>
  )
}
