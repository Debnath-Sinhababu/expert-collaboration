'use client'

import { InstitutionWorkspaceProvider } from '@/contexts/InstitutionWorkspaceContext'

export function InstitutionWorkspaceShell({ children }: { children: React.ReactNode }) {
  return <InstitutionWorkspaceProvider viewer="institution">{children}</InstitutionWorkspaceProvider>
}
