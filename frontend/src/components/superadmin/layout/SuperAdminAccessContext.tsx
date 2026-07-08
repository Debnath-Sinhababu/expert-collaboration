'use client'

import { createContext, useContext } from 'react'
import type { SuperAdminMe } from '@/lib/superadmin/types'

export const SuperAdminAccessContext = createContext<SuperAdminMe | null>(null)

export function useSuperAdminAccess() {
  return useContext(SuperAdminAccessContext)
}
