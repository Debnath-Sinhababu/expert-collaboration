'use client'

import { useParams } from 'next/navigation'
import { useEffect } from 'react'
import { setSuperAdminActingInstitutionId } from '@/lib/superAdminActing'
import { InstitutionWorkspaceProvider } from '@/contexts/InstitutionWorkspaceContext'

export default function SuperAdminInstitutionLayout({
  children
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const institutionId = params.institutionId as string

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
