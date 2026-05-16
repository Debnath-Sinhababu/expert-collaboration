'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase'

import SuperAdminShell from '@/components/superadmin/SuperAdminShell'



export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {

  const router = useRouter()

  const [ready, setReady] = useState(false)



  useEffect(() => {

    const gate = async () => {

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {

        router.replace('/auth/login')

        return

      }

      if (user.user_metadata?.role !== 'super_admin') {

        router.replace('/')

        return

      }

      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {

        router.replace('/auth/login')

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



  return <SuperAdminShell>{children}</SuperAdminShell>

}

