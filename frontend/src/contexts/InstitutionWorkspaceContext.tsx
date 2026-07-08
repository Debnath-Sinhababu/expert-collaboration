'use client'

import { createContext, useContext, useMemo, type ReactNode } from 'react'

export type InstitutionViewer = 'institution' | 'super_admin'

export type InstitutionWorkspaceValue = {
  viewer: InstitutionViewer
  actingInstitutionId: string | null
  basePath: string
}

const InstitutionWorkspaceContext = createContext<InstitutionWorkspaceValue>({
  viewer: 'institution',
  actingInstitutionId: null,
  basePath: '/institution'
})

export function InstitutionWorkspaceProvider({
  children,
  viewer,
  actingInstitutionId
}: {
  children: ReactNode
  viewer: InstitutionViewer
  actingInstitutionId?: string | null
}) {
  const value = useMemo(
    () => ({
      viewer,
      actingInstitutionId: actingInstitutionId ?? null,
      basePath:
        viewer === 'super_admin' && actingInstitutionId
          ? `/superadmin/institutions/${actingInstitutionId}`
          : '/institution'
    }),
    [viewer, actingInstitutionId]
  )

  return (
    <InstitutionWorkspaceContext.Provider value={value}>
      {children}
    </InstitutionWorkspaceContext.Provider>
  )
}

export function useInstitutionWorkspace() {
  return useContext(InstitutionWorkspaceContext)
}
