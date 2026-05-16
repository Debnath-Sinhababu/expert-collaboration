'use client'

import ExpertProfileSetup from '@/app/expert/profile-setup/page'
import { ExpertWorkspaceProvider } from '@/contexts/ExpertWorkspaceContext'

export default function SuperAdminCreateExpertPage() {
  return (
    <ExpertWorkspaceProvider viewer="super_admin">
      <ExpertProfileSetup />
    </ExpertWorkspaceProvider>
  )
}
