'use client'

import { useParams } from 'next/navigation'
import { useEffect } from 'react'
import { setSuperAdminActingExpertId } from '@/lib/superAdminActing'
import { ExpertWorkspaceProvider } from '@/contexts/ExpertWorkspaceContext'

export default function SuperAdminExpertLayout({
  children
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const expertId = params.expertId as string

  useEffect(() => {
    if (expertId) {
      setSuperAdminActingExpertId(expertId)
    }
    return () => setSuperAdminActingExpertId(null)
  }, [expertId])

  if (!expertId) {
    return null
  }

  return (
    <ExpertWorkspaceProvider viewer="super_admin" actingExpertId={expertId}>
      {children}
    </ExpertWorkspaceProvider>
  )
}
