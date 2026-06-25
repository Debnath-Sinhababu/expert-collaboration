import {
  BadgeCheck,
  Banknote,
  Building2,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  ListChecks,
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
  { href: '/superadmin/create-expert', label: 'Create Expert', permission: 'profiles:write', icon: UserPlus },
  { href: '/superadmin/create-institution', label: 'Create Institution', permission: 'profiles:write', icon: Building2 },
  { href: '/superadmin/create-student', label: 'Create Student', permission: 'profiles:write', icon: GraduationCap },
  { href: '/superadmin/bulk-import', label: 'Bulk Import', permission: 'bulk_import:write', icon: FileSpreadsheet },
  { href: '/superadmin/calxbook-verification', label: 'CalxBook Verification', permission: 'calxbook_verification:write', icon: BadgeCheck },
  { href: '/superadmin/requirements', label: 'Requirements', permission: 'requirements:read', icon: ListChecks },
  { href: '/superadmin/finance', label: 'Finance', permission: 'finance:read', icon: Banknote },
]
