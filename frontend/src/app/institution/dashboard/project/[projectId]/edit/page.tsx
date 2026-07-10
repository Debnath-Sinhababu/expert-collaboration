'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import NotificationBell from '@/components/NotificationBell'
import ProfileDropdown from '@/components/ProfileDropdown'
import Logo from '@/components/Logo'
import ContractForm from '@/app/institution/post-requirement/sections/ContractForm'
import { useInstitutionWorkspace } from '@/contexts/InstitutionWorkspaceContext'
import { fetchInstitutionForWorkspace, profileSetupPath } from '@/lib/institutionWorkspace'
import { Alert, AlertDescription } from '@/components/ui/alert'

function EditProjectContent() {
  const params = useParams()
  const projectId = params.projectId as string
  const router = useRouter()
  const { viewer, actingInstitutionId, basePath } = useInstitutionWorkspace()
  const [user, setUser] = useState<any>(null)
  const [institution, setInstitution] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login')
          return
        }
        if (viewer === 'super_admin' && user.user_metadata?.role !== 'super_admin') {
          router.push('/')
          return
        }
        setUser(user)
        const inst = await fetchInstitutionForWorkspace(user.id, viewer, actingInstitutionId)
        if (!inst) {
          router.push(profileSetupPath(viewer))
          return
        }
        setInstitution(inst)
      } catch (e: any) {
        setError(e.message || 'Failed to initialize')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [router, viewer, actingInstitutionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260] mx-auto mb-4" />
          <p className="text-[#6A6A6A]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#ECF2FF]">
      <header className="bg-[#008260] backdrop-blur-sm sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`${basePath}/home`} className="flex items-center gap-2">
            <Logo size="header" />
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <ProfileDropdown
              user={user}
              institution={institution}
              userType={viewer === 'super_admin' ? 'super_admin' : 'institution'}
            />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <ContractForm mode="edit" projectId={projectId} />
      </main>
    </div>
  )
}

export default function EditProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#ECF2FF] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#008260]" />
        </div>
      }
    >
      <EditProjectContent />
    </Suspense>
  )
}
