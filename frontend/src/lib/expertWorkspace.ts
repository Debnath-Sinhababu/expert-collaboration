import { api } from '@/lib/api'
import type { ExpertViewer } from '@/contexts/ExpertWorkspaceContext'

/** Load expert row for the current workspace (owner vs super admin acting). */
export async function fetchExpertForWorkspace(
  userId: string,
  viewer: ExpertViewer,
  actingExpertId: string | null
) {
  if (viewer === 'super_admin' && actingExpertId) {
    return api.experts.getById(actingExpertId)
  }
  return api.experts.getByUserId(userId)
}

export function expertProfileSetupPath(viewer: ExpertViewer) {
  return viewer === 'super_admin' ? '/superadmin/home' : '/expert/profile-setup'
}

export function expertHomePathForWorkspace(viewer: ExpertViewer) {
  return viewer === 'super_admin' ? '/superadmin/home' : '/expert/home'
}
