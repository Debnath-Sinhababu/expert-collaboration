import { api } from '@/lib/api'
import type { InstitutionViewer } from '@/contexts/InstitutionWorkspaceContext'

/** Load institution row for the current workspace (owner vs super admin acting). */
export async function fetchInstitutionForWorkspace(
  userId: string,
  viewer: InstitutionViewer,
  actingInstitutionId: string | null
) {
  if (viewer === 'super_admin' && actingInstitutionId) {
    return api.institutions.getById(actingInstitutionId)
  }
  return api.institutions.getByUserId(userId)
}

export function profileSetupPath(viewer: InstitutionViewer) {
  return viewer === 'super_admin' ? '/superadmin/home' : '/institution/profile-setup'
}

export function homePathForWorkspace(viewer: InstitutionViewer) {
  return viewer === 'super_admin' ? '/superadmin/home' : '/institution/home'
}
