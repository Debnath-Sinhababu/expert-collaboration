'use client'

import InstitutionProfileSetup from '@/app/institution/profile-setup/page'
import { InstitutionWorkspaceProvider } from '@/contexts/InstitutionWorkspaceContext'

export default function SuperAdminCreateInstitutionPage() {
  return (
    <InstitutionWorkspaceProvider viewer="super_admin">
      <InstitutionProfileSetup />
    </InstitutionWorkspaceProvider>
  )
}
