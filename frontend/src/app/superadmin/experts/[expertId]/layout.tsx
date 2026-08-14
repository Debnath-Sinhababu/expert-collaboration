'use client'

import { useEffect, use } from 'react'
import { setSuperAdminActingExpertId } from '@/lib/superAdminActing'
import { ExpertWorkspaceProvider } from '@/contexts/ExpertWorkspaceContext'

export default function SuperAdminExpertLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ expertId: string }>
}) {
  const { expertId } = use(params)

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
