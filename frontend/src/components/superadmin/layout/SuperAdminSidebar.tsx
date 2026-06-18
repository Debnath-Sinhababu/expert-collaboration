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
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <Link href="/superadmin/overview" className="flex min-w-0 items-center gap-3" onClick={onNavigate}>
          <Logo size="header" />
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

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
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
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors',
                active
                  ? 'bg-[#008260]/10 text-[#008260]'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
              )}
            >
              <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', active ? 'bg-[#008260]/15' : 'group-hover:bg-white')}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="mb-2 rounded-lg bg-slate-50 px-3 py-2">
          <p className="truncate text-sm font-semibold text-slate-900">{me?.user.name || 'Super admin'}</p>
          <p className="truncate text-xs text-slate-500">{me?.user.email || 'Loading...'}</p>
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
