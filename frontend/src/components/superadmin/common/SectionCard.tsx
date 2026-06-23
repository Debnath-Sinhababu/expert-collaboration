'use client'

import type { ReactNode } from 'react'
import { MoreHorizontal } from 'lucide-react'

type SectionCardProps = {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  eyebrow?: string
}

export function SectionCard({ title, description, action, children, eyebrow }: SectionCardProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-gradient-to-r from-white to-emerald-50/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#008260]">{eyebrow}</p> : null}
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#008260]" />
            <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          </div>
          {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : (
          <div className="hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 sm:flex">
            <MoreHorizontal className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}
