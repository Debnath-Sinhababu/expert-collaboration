'use client'

import { useParams } from 'next/navigation'
import { InstitutionProjectDetailsClient } from '@/components/institution/InstitutionProjectDetailsClient'

export default function SuperAdminInstitutionProjectDetailsPage() {
  const params = useParams()
  const institutionId = params.institutionId as string
  const projectId = params.projectId as string

  if (!institutionId || !projectId) {
    return null
  }

  return (
    <InstitutionProjectDetailsClient
      viewer="super_admin"
      actingInstitutionId={institutionId}
      projectId={projectId}
    />
  )
}
