'use client'

import { useParams } from 'next/navigation'
import { InstitutionDashboardClient } from '@/components/institution/InstitutionDashboardClient'

export default function SuperAdminInstitutionDashboardPage() {
  const params = useParams()
  const institutionId = params.institutionId as string

  if (!institutionId) {
    return null
  }

  return (
    <InstitutionDashboardClient
      viewer="super_admin"
      actingInstitutionId={institutionId}
    />
  )
}
