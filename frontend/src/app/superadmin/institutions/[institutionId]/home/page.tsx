'use client'

import { useParams } from 'next/navigation'
import { InstitutionHomeClient } from '@/components/institution/InstitutionHomeClient'

export default function SuperAdminInstitutionHomePage() {
  const params = useParams()
  const institutionId = params.institutionId as string

  if (!institutionId) {
    return null
  }

  return (
    <InstitutionHomeClient
      viewer="super_admin"
      actingInstitutionId={institutionId}
    />
  )
}
