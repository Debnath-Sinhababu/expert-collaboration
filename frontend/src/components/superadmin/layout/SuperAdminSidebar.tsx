'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, LogOut } from 'lucide-react'
import Logo from '@/components/Logo'
import { supabase } from '@/lib/supabase'
import { canAccess } from '@/lib/superadmin/permissions'
import { superAdminNavItems } from '@/lib/superadmin/nav'
import type { SuperAdminMe } from '@/lib/superadmin/types'
import { cn } from '@/lib/utils'

export function SuperAdminSidebar({
  me,
  onNavigate,
  onRequestClose,
}: {
  me: SuperAdminMe | null
  onNavigate?: () => void
  onRequestClose?: () => void
}) {
  const pathname = usePathname()
  const visibleItems = superAdminNavItems.filter((item) => canAccess(me, item.permission))

  async function handleSignOut() {
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="shrink-0 flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-5">
        <Link href="/superadmin/overview" className="flex min-w-0 items-center gap-3" onClick={onNavigate}>
          <span className="flex h-11 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#008260]/20 bg-[#008260] shadow-sm">
            <Logo size="header" className="brightness-0 invert" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-950">Super Admin</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#008260]">Console</p>
          </div>
        </Link>
        {onRequestClose ? (
          <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden" onClick={onRequestClose}>
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1.5 px-3 py-4">
        {visibleItems.map((item) => {
          const active = item.href.includes('?')
            ? pathname === item.href.split('?')[0]
            : pathname === item.href || pathname?.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition',
                active
                  ? 'bg-[#008260] text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
              )}
            >
              <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg transition', active ? 'bg-white/15 text-white' : 'bg-slate-50 group-hover:bg-white')}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="shrink-0 border-t border-slate-200 p-3">
        <div className="mb-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
          <p className="truncate text-sm font-semibold text-slate-900">{me?.user.name || 'Super admin'}</p>
          <p className="truncate text-xs text-slate-500">{me?.user.email || 'Loading...'}</p>
          <p className="mt-2 inline-flex rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[#008260]">
            {me?.access.isRoot ? 'Full control' : `${me?.access.permissions.length || 0} permissions`}
          </p>
        </div>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  )
}
