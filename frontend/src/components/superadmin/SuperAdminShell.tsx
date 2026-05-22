'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'
import ProfileDropdown from '@/components/ProfileDropdown'
import {
  Building2,
  HeartHandshake,
  LayoutDashboard,
  Shield,
  Upload,
  UserPlus,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navClass = cn(
  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
  'text-white/95 hover:bg-white/15 hover:text-white',
)

const navActive = cn('bg-white text-[#008260] shadow-sm hover:bg-white hover:text-[#008260]')

export default function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [sessionUser, setSessionUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setSessionUser(user))
  }, [])

  const isHome = pathname === '/superadmin/home' || pathname === '/superadmin'

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#dfe8fb] via-[#ecf2ff] to-[#e4edf8]">
      <header className="sticky top-0 z-[100] border-b border-black/10 bg-[#008260] shadow-md">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6 lg:h-[4.25rem] lg:py-0">
            <div className="flex items-center justify-between gap-4 shrink-0">
              <Link
                href="/superadmin/home"
                className="flex items-center gap-3 group rounded-xl pr-3 py-1 -ml-1 transition-colors hover:bg-white/10"
              >
                <Logo size="header" />
                <div className="hidden sm:flex flex-col border-l border-white/35 pl-3 leading-tight">
                  <span className="text-white text-[15px] font-semibold tracking-tight">Super Admin</span>
                  <span className="text-[11px] text-white/80 uppercase tracking-wider font-medium">
                    Console
                  </span>
                </div>
              </Link>
              <div className="flex items-center gap-2 sm:hidden">
                {sessionUser && <ProfileDropdown user={sessionUser} userType="super_admin" />}
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1 justify-center lg:justify-start lg:overflow-x-auto lg:pb-0 pb-1">
              <Link
                href="/superadmin/home"
                className={cn(navClass, isHome && navActive)}
                title="Directory & workspaces"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0 opacity-90" />
                <span className="whitespace-nowrap">Directory</span>
              </Link>
              <Link
                href="/superadmin/create-expert"
                className={cn(navClass, pathname?.startsWith('/superadmin/create-expert') && navActive)}
              >
                <UserPlus className="h-4 w-4 shrink-0 opacity-90" />
                <span className="whitespace-nowrap">Expert</span>
              </Link>
              <Link
                href="/superadmin/create-institution"
                className={cn(navClass, pathname?.startsWith('/superadmin/create-institution') && navActive)}
              >
                <Building2 className="h-4 w-4 shrink-0 opacity-90" />
                <span className="whitespace-nowrap">Institution</span>
              </Link>
              <Link
                href="/superadmin/create-student"
                className={cn(navClass, pathname?.startsWith('/superadmin/create-student') && navActive)}
              >
                <Users className="h-4 w-4 shrink-0 opacity-90" />
                <span className="whitespace-nowrap">Student</span>
              </Link>
              <Link
                href="/superadmin/bulk-import"
                className={cn(navClass, pathname?.startsWith('/superadmin/bulk-import') && navActive)}
              >
                <Upload className="h-4 w-4 shrink-0 opacity-90" />
                <span className="whitespace-nowrap hidden md:inline">Bulk import</span>
              </Link>
              <Link
                href="/superadmin/experts/interested"
                className={cn(
                  navClass,
                  pathname?.startsWith('/superadmin/experts/interested') && navActive,
                )}
              >
                <HeartHandshake className="h-4 w-4 shrink-0 opacity-90" />
                <span className="whitespace-nowrap hidden lg:inline">Interested experts</span>
              </Link>
            </nav>

            <div className="hidden sm:flex items-center gap-3 shrink-0">
              <div className="hidden xl:flex items-center gap-2 text-white/95 text-xs font-medium bg-black/15 rounded-full px-3 py-1.5 border border-white/10">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                Elevated access
              </div>
              {sessionUser && <ProfileDropdown user={sessionUser} userType="super_admin" />}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  )
}
