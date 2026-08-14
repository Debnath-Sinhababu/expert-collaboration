'use client'

import { useEffect, use } from 'react'
import { setSuperAdminActingInstitutionId } from '@/lib/superAdminActing'
import { InstitutionWorkspaceProvider } from '@/contexts/InstitutionWorkspaceContext'

export default function SuperAdminInstitutionLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ institutionId: string }>
}) {
  const { institutionId } = use(params)

  useEffect(() => {
    if (institutionId) {
      setSuperAdminActingInstitutionId(institutionId)
    }
    return () => setSuperAdminActingInstitutionId(null)
  }, [institutionId])

  if (!institutionId) {
    return null
  }

  return (
    <InstitutionWorkspaceProvider viewer="super_admin" actingInstitutionId={institutionId}>
      {children}
    </InstitutionWorkspaceProvider>
  )
}
