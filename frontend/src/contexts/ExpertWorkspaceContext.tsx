'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

export type ExpertViewer = 'expert' | 'super_admin'

export type ExpertWorkspaceValue = {
  viewer: ExpertViewer
  actingExpertId: string | null
  basePath: string
}

const ExpertWorkspaceContext = createContext<ExpertWorkspaceValue>({
  viewer: 'expert',
  actingExpertId: null,
  basePath: '/expert'
})

export function ExpertWorkspaceProvider({
  children,
  viewer,
  actingExpertId
}: {
  children: ReactNode
  viewer: ExpertViewer
  actingExpertId?: string | null
}) {
  const value = useMemo(
    () => ({
      viewer,
      actingExpertId: actingExpertId ?? null,
      basePath:
        viewer === 'super_admin' && actingExpertId
          ? `/superadmin/experts/${actingExpertId}`
          : '/expert'
    }),
    [viewer, actingExpertId]
  )

  return (
    <ExpertWorkspaceContext.Provider value={value}>
      {children}
    </ExpertWorkspaceContext.Provider>
  )
}

export function useExpertWorkspace() {
  return useContext(ExpertWorkspaceContext)
}
