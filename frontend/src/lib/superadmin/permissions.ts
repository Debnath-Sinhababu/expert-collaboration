import type { SuperAdminMe, SuperAdminPermission } from './types'

export const SUPER_ADMIN_PERMISSIONS: SuperAdminPermission[] = [
  'overview:read',
  'admins:read',
  'admins:write',
  'profiles:read',
  'profiles:write',
  'bulk_import:write',
  'calxbook_verification:write',
  'requirements:read',
  'requirements:write',
  'requirements:candidates',
  'freelance:read',
  'freelance:write',
  'internships:read',
  'internships:write',
  'finance:read',
  'finance:write',
  'finance:confirm',
]

export function canAccess(me: SuperAdminMe | null, permission?: SuperAdminPermission) {
  if (!permission) return true
  if (!me) return false
  if (me.access.isRoot) return true
  return me.access.permissions.includes(permission)
}

export function canAccessAny(me: SuperAdminMe | null, permissions: SuperAdminPermission[]) {
  if (permissions.length === 0) return true
  return permissions.some((permission) => canAccess(me, permission))
}

export function normalizeUiPermissions(permissions: SuperAdminPermission[]) {
  const out = new Set<SuperAdminPermission>(permissions)
  const implied: Partial<Record<SuperAdminPermission, SuperAdminPermission>> = {
    'admins:write': 'admins:read',
    'profiles:write': 'profiles:read',
    'bulk_import:write': 'profiles:read',
    'calxbook_verification:write': 'profiles:read',
    'requirements:write': 'requirements:read',
    'requirements:candidates': 'requirements:read',
    'freelance:write': 'freelance:read',
    'internships:write': 'internships:read',
    'finance:write': 'finance:read',
    'finance:confirm': 'finance:read',
  }
  for (const permission of [...out]) {
    const read = implied[permission]
    if (read) out.add(read)
  }
  return [...out]
}

export function requiredPermissionForSuperAdminPath(pathname: string | null): SuperAdminPermission | null {
  if (!pathname || pathname === '/superadmin' || pathname === '/superadmin/home') return null
  if (pathname.startsWith('/superadmin/admins/new')) return 'admins:write'
  if (pathname.startsWith('/superadmin/admins')) return 'admins:read'
  if (pathname.startsWith('/superadmin/create-')) return 'profiles:write'
  if (pathname.startsWith('/superadmin/profiles')) return 'profiles:read'
  if (pathname.startsWith('/superadmin/bulk-import')) return 'bulk_import:write'
  if (pathname.startsWith('/superadmin/calxbook-verification')) return 'calxbook_verification:write'
  if (pathname.startsWith('/superadmin/experts/interested')) return 'calxbook_verification:write'
  if (pathname.startsWith('/superadmin/requirements')) return 'requirements:read'
  if (pathname.startsWith('/superadmin/freelance')) return 'requirements:read'
  if (pathname.startsWith('/superadmin/internships')) return 'requirements:read'
  if (pathname.startsWith('/superadmin/finance')) return 'finance:read'
  if (pathname.startsWith('/superadmin/overview')) return 'overview:read'
  return null
}
