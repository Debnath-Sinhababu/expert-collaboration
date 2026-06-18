'use client'

import { usePathname } from 'next/navigation'
import { Menu, ShieldCheck } from 'lucide-react'
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
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" onClick={onOpenNav}>
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold text-slate-950">{titleFromPath(pathname)}</h1>
          <p className="hidden text-sm text-slate-500 sm:block">Manage CalxMap expert collaboration operations</p>
        </div>
      </div>
      <div className="hidden items-center gap-2 rounded-full border border-[#008260]/20 bg-[#008260]/5 px-3 py-1.5 text-xs font-semibold text-[#008260] sm:flex">
        <ShieldCheck className="h-4 w-4" />
        {me?.access.isRoot ? 'Root access' : 'Limited access'}
      </div>
    </header>
  )
}
