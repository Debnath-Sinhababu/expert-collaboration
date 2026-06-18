'use client'

import type { ReactNode } from 'react'
import { canAccess } from '@/lib/superadmin/permissions'
import type { SuperAdminPermission } from '@/lib/superadmin/types'
import { useSuperAdminAccess } from '../layout/SuperAdminAccessContext'

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: SuperAdminPermission
  children: ReactNode
  fallback?: ReactNode
}) {
  const me = useSuperAdminAccess()
  return canAccess(me, permission) ? <>{children}</> : <>{fallback}</>
}
