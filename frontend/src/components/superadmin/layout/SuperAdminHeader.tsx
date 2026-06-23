'use client'

import { usePathname } from 'next/navigation'
import { CalendarDays, Menu, ShieldCheck } from 'lucide-react'
import { superAdminNavItems } from '@/lib/superadmin/nav'
import type { SuperAdminMe } from '@/lib/superadmin/types'

function titleFromPath(pathname: string | null) {
  if (!pathname || pathname === '/superadmin') return 'Overview'
  const item = superAdminNavItems.find((nav) => {
    const href = nav.href.split('?')[0]
    return pathname === href || pathname.startsWith(`${href}/`)
  })
  return item?.label || 'Super Admin'
}

export function SuperAdminHeader({
  me,
  onOpenNav,
}: {
  me: SuperAdminMe | null
  onOpenNav: () => void
}) {
  const pathname = usePathname()
  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-4 shadow-sm backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 shadow-sm hover:bg-slate-100 md:hidden" onClick={onOpenNav}>
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="hidden h-8 w-1 rounded-full bg-[#008260] sm:block" />
            <div>
              <h1 className="truncate text-xl font-bold text-slate-950">{titleFromPath(pathname)}</h1>
              <p className="hidden text-sm text-slate-500 sm:block">Manage CalxMap expert collaboration operations</p>
            </div>
          </div>
        </div>
      </div>
      <div className="hidden items-center gap-3 sm:flex">
        <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 lg:flex">
          <CalendarDays className="h-4 w-4 text-[#008260]" />
          {new Date().toLocaleDateString()}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-[#008260]/20 bg-[#008260]/5 px-3 py-2 text-xs font-semibold text-[#008260]">
          <ShieldCheck className="h-4 w-4" />
          {me?.access.isRoot ? 'Root access' : 'Limited access'}
        </div>
      </div>
    </header>
  )
}
