'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { superAdminApi } from '@/lib/superadmin/api'
import { canAccess, requiredPermissionForSuperAdminPath } from '@/lib/superadmin/permissions'
import { superAdminNavItems } from '@/lib/superadmin/nav'
import type { SuperAdminMe } from '@/lib/superadmin/types'
import { SuperAdminAccessContext } from './SuperAdminAccessContext'
import { SuperAdminHeader } from './SuperAdminHeader'
import { SuperAdminSidebar } from './SuperAdminSidebar'

export default function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [navOpen, setNavOpen] = useState(false)
  const [me, setMe] = useState<SuperAdminMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    superAdminApi.me()
      .then((data) => {
        if (mounted) setMe(data)
      })
      .catch((err) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Failed to load access')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!navOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [navOpen])

  useEffect(() => {
    if (!me) return
    const required = requiredPermissionForSuperAdminPath(pathname)
    if (required && canAccess(me, required)) return
    if (!required && pathname !== '/superadmin/overview') return
    if (pathname === '/superadmin/overview' && required && !canAccess(me, required)) {
      const firstAllowed = superAdminNavItems.find((item) => canAccess(me, item.permission))
      if (firstAllowed) router.replace(firstAllowed.href)
    }
  }, [me, pathname, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#008260] border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-slate-950">Access unavailable</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </div>
      </div>
    )
  }

  const requiredPermission = requiredPermissionForSuperAdminPath(pathname)
  const allowed = canAccess(me, requiredPermission || undefined)

  return (
    <SuperAdminAccessContext.Provider value={me}>
      <div className="flex h-[100dvh] max-h-[100dvh] w-full max-w-[100vw] overflow-hidden bg-slate-50">
        {navOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-label="Close navigation"
            onClick={() => setNavOpen(false)}
          />
        ) : null}
        <aside
          className={`fixed bottom-0 left-0 top-0 z-50 w-[min(286px,92vw)] border-r border-slate-200 bg-white shadow-xl transition-transform md:static md:z-0 md:w-[280px] md:shrink-0 md:translate-x-0 md:shadow-none ${
            navOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <SuperAdminSidebar me={me} onNavigate={() => setNavOpen(false)} onRequestClose={() => setNavOpen(false)} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <SuperAdminHeader me={me} onOpenNav={() => setNavOpen(true)} />
          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
              {allowed ? children : (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
                  <h1 className="text-lg font-semibold text-amber-950">Permission required</h1>
                  <p className="mt-2 text-sm text-amber-800">
                    Your admin account does not have access to this section.
                  </p>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SuperAdminAccessContext.Provider>
  )
}
