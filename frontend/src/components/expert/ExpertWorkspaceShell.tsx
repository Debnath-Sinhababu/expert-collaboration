'use client'

import { ExpertWorkspaceProvider } from '@/contexts/ExpertWorkspaceContext'

export function ExpertWorkspaceShell({ children }: { children: React.ReactNode }) {
  return <ExpertWorkspaceProvider viewer="expert">{children}</ExpertWorkspaceProvider>
}
