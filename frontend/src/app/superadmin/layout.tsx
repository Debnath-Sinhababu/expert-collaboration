'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SuperAdminShell from '@/components/superadmin/layout/SuperAdminShell'
import { superAdminApi } from '@/lib/superadmin/api'

/** Acting workspace routes use expert/institution UI headers — no console nav. */
function isActingWorkspacePath(pathname: string | null): boolean {
  if (!pathname) return false
  if (pathname.startsWith('/superadmin/institutions/')) return true
  if (!pathname.startsWith('/superadmin/experts/')) return false
  if (pathname === '/superadmin/experts/interested' || pathname.startsWith('/superadmin/experts/interested/')) {
    return false
  }
  return true
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const gate = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth/login')
        return
      }
      const role = user.user_metadata?.role
      if (role !== 'super_admin' && role !== 'superadmin') {
        router.replace('/')
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        router.replace('/auth/login')
        return
      }
      try {
        await superAdminApi.me()
      } catch (error) {
        await supabase.auth.signOut()
        const message = encodeURIComponent(error instanceof Error ? error.message : 'Your admin account cannot sign in.')
        router.replace(`/auth/login?message=${message}`)
        return
      }
      setReady(true)
    }
    gate()
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4" />
          <p className="text-[#6A6A6A] text-sm">Verifying access…</p>
        </div>
      </div>
    )
  }

  if (isActingWorkspacePath(pathname)) {
    return <>{children}</>
  }

  return <SuperAdminShell>{children}</SuperAdminShell>
}
