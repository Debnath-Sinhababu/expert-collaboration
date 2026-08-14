export type SuperAdminPermission =
  | 'overview:read'
  | 'admins:read'
  | 'admins:write'
  | 'activity:read'
  | 'profiles:read'
  | 'profiles:write'
  | 'bulk_import:write'
  | 'calxbook_verification:write'
  | 'requirements:read'
  | 'requirements:write'
  | 'requirements:candidates'
  | 'assignments:read'
  | 'assignments:write'
  | 'daily_reports:read'
  | 'daily_reports:write'
  | 'freelance:read'
  | 'freelance:write'
  | 'internships:read'
  | 'internships:write'
  | 'finance:read'
  | 'finance:write'
  | 'finance:confirm'
  | 'exports:download'

export type SuperAdminMe = {
  user: {
    id: string
    email: string
    name?: string
    role: 'super_admin'
  }
  access: {
    isRoot: boolean
    permissions: SuperAdminPermission[]
  }
}

export type PaginatedResponse<T> = {
  data: T[]
  total: number
  page: number
  limit: number
  hasMore?: boolean
}
