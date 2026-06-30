import {
  BadgeCheck,
  Banknote,
  FileSpreadsheet,
  LayoutDashboard,
  ListChecks,
  ClipboardList,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react'
import type { ElementType } from 'react'
import type { SuperAdminPermission } from './types'

export type SuperAdminNavItem = {
  href: string
  label: string
  permission?: SuperAdminPermission
  icon: ElementType
}

export const superAdminNavItems: SuperAdminNavItem[] = [
  { href: '/superadmin/overview', label: 'Overview', permission: 'overview:read', icon: LayoutDashboard },
  { href: '/superadmin/admins', label: 'Admins', permission: 'admins:read', icon: Shield },
  { href: '/superadmin/profiles', label: 'Profiles', permission: 'profiles:read', icon: Users },
  { href: '/superadmin/create-profiles', label: 'Create Profiles', permission: 'profiles:write', icon: UserPlus },
  { href: '/superadmin/bulk-import', label: 'Bulk Import', permission: 'bulk_import:write', icon: FileSpreadsheet },
  { href: '/superadmin/calxbook-verification', label: 'CalxBook Verification', permission: 'calxbook_verification:write', icon: BadgeCheck },
  { href: '/superadmin/requirements', label: 'Requirements', permission: 'requirements:read', icon: ListChecks },
  { href: '/superadmin/my-requirements', label: 'My Requirements', permission: 'assignments:read', icon: ClipboardList },
  { href: '/superadmin/finance', label: 'Finance', permission: 'finance:read', icon: Banknote },
]
