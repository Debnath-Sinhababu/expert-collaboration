import type { SuperAdminMe, SuperAdminPermission } from './types'

export const SUPER_ADMIN_PERMISSIONS: SuperAdminPermission[] = [
  'overview:read',
  'admins:read',
  'admins:write',
  'activity:read',
  'profiles:read',
  'profiles:write',
  'bulk_import:write',
  'calxbook_verification:write',
  'requirements:read',
  'requirements:write',
  'requirements:candidates',
  'assignments:read',
  'assignments:write',
  'daily_reports:read',
  'daily_reports:write',
  'freelance:read',
  'freelance:write',
  'internships:read',
  'internships:write',
  'finance:read',
  'finance:write',
  'finance:confirm',
  'exports:download',
]

export const SUPER_ADMIN_PERMISSION_DETAILS: Record<SuperAdminPermission, {
  label: string
  description: string
  group: 'Dashboard' | 'Admin Team' | 'Profiles' | 'Requirements' | 'Finance' | 'Exports'
}> = {
  'overview:read': {
    label: 'View overview dashboard',
    description: 'Can see business metrics, profile counts, requirement status cards, and category dashboards.',
    group: 'Dashboard',
  },
  'admins:read': {
    label: 'View admins',
    description: 'Can open the admin list and review admin access, status, assignments, and profile details.',
    group: 'Admin Team',
  },
  'admins:write': {
    label: 'Manage admins',
    description: 'Can create admins, change permissions, activate/block admins, and update block messages.',
    group: 'Admin Team',
  },
  'activity:read': {
    label: 'View admin activity',
    description: 'Can review activity timelines and performance history for admins.',
    group: 'Admin Team',
  },
  'profiles:read': {
    label: 'View profiles',
    description: 'Can browse expert, institution, and student profiles in the super admin portal.',
    group: 'Profiles',
  },
  'profiles:write': {
    label: 'Create and edit profiles',
    description: 'Can create profiles from Create Profiles and update profile-related super admin data.',
    group: 'Profiles',
  },
  'bulk_import:write': {
    label: 'Bulk import profiles',
    description: 'Can import experts or students from spreadsheets.',
    group: 'Profiles',
  },
  'calxbook_verification:write': {
    label: 'Manage CalxBook verification',
    description: 'Can approve or remove expert visibility for CalxBook verification workflows.',
    group: 'Profiles',
  },
  'requirements:read': {
    label: 'View requirements',
    description: 'Can browse project, internship, and freelance requirements and open requirement details.',
    group: 'Requirements',
  },
  'requirements:write': {
    label: 'Create and update requirements',
    description: 'Can create requirements and change requirement-level operational data.',
    group: 'Requirements',
  },
  'requirements:candidates': {
    label: 'Manage candidates and experts',
    description: 'Can add experts, move applications through interview/selected/rejected flows, and manage candidate actions.',
    group: 'Requirements',
  },
  'assignments:read': {
    label: 'View requirement assignments',
    description: 'Can see which admin owns each requirement and access assigned requirement views.',
    group: 'Requirements',
  },
  'assignments:write': {
    label: 'Assign requirements',
    description: 'Can assign, reassign, or unassign requirement owners.',
    group: 'Requirements',
  },
  'daily_reports:read': {
    label: 'View daily reports',
    description: 'Can review documents and daily updates uploaded by assigned admins.',
    group: 'Requirements',
  },
  'daily_reports:write': {
    label: 'Upload daily reports',
    description: 'Can upload daily report documents for requirements assigned to their admin account.',
    group: 'Requirements',
  },
  'freelance:read': {
    label: 'View freelance work',
    description: 'Can open freelance-specific work lists and details.',
    group: 'Requirements',
  },
  'freelance:write': {
    label: 'Manage freelance work',
    description: 'Can update freelance project/application workflows where supported.',
    group: 'Requirements',
  },
  'internships:read': {
    label: 'View internships',
    description: 'Can open internship-specific work lists and details.',
    group: 'Requirements',
  },
  'internships:write': {
    label: 'Manage internships',
    description: 'Can update internship application workflows where supported.',
    group: 'Requirements',
  },
  'finance:read': {
    label: 'View finance',
    description: 'Can view finance summaries, payments, invoices, and training finance records.',
    group: 'Finance',
  },
  'finance:write': {
    label: 'Update finance records',
    description: 'Can edit finance-related operational records where enabled.',
    group: 'Finance',
  },
  'finance:confirm': {
    label: 'Confirm payments and invoices',
    description: 'Can confirm training finance, send invoices, and mark payments as paid.',
    group: 'Finance',
  },
  'exports:download': {
    label: 'Download exports',
    description: 'Can download heavy Excel reports such as admin activity and business overview exports.',
    group: 'Exports',
  },
}

export const SUPER_ADMIN_PERMISSION_GROUPS = [
  'Dashboard',
  'Admin Team',
  'Profiles',
  'Requirements',
  'Finance',
  'Exports',
] as const

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
    'activity:read': 'admins:read',
    'profiles:write': 'profiles:read',
    'bulk_import:write': 'profiles:read',
    'calxbook_verification:write': 'profiles:read',
    'requirements:write': 'requirements:read',
    'requirements:candidates': 'requirements:read',
    'assignments:write': 'assignments:read',
    'assignments:read': 'requirements:read',
    'daily_reports:write': 'daily_reports:read',
    'daily_reports:read': 'assignments:read',
    'freelance:write': 'freelance:read',
    'internships:write': 'internships:read',
    'finance:write': 'finance:read',
    'finance:confirm': 'finance:read',
    'exports:download': 'overview:read',
  }
  let changed = true
  while (changed) {
    changed = false
    for (const permission of [...out]) {
      const read = implied[permission]
      if (read && !out.has(read)) {
        out.add(read)
        changed = true
      }
    }
  }
  return [...out]
}

export function requiredPermissionForSuperAdminPath(pathname: string | null): SuperAdminPermission | null {
  if (!pathname || pathname === '/superadmin' || pathname === '/superadmin/home') return null
  if (pathname.startsWith('/superadmin/admins/new')) return 'admins:write'
  if (pathname.startsWith('/superadmin/admins')) return 'admins:read'
  if (pathname.startsWith('/superadmin/my-requirements')) return 'assignments:read'
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
