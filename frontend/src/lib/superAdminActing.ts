/** Session keys for acting headers (see api.ts getAuthHeaders). Only one workspace at a time. */
export const SUPERADMIN_ACTING_INSTITUTION_KEY = 'superadmin_acting_institution_id'
export const SUPERADMIN_ACTING_EXPERT_KEY = 'superadmin_acting_expert_id'

export function setSuperAdminActingInstitutionId(id: string | null) {
  if (typeof window === 'undefined') return
  if (id) {
    sessionStorage.removeItem(SUPERADMIN_ACTING_EXPERT_KEY)
    sessionStorage.setItem(SUPERADMIN_ACTING_INSTITUTION_KEY, id)
  } else {
    sessionStorage.removeItem(SUPERADMIN_ACTING_INSTITUTION_KEY)
  }
}

export function setSuperAdminActingExpertId(id: string | null) {
  if (typeof window === 'undefined') return
  if (id) {
    sessionStorage.removeItem(SUPERADMIN_ACTING_INSTITUTION_KEY)
    sessionStorage.setItem(SUPERADMIN_ACTING_EXPERT_KEY, id)
  } else {
    sessionStorage.removeItem(SUPERADMIN_ACTING_EXPERT_KEY)
  }
}

/** Clear acting institution and expert (e.g. when leaving workspace without signing out). */
export function clearSuperAdminActingWorkspace() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(SUPERADMIN_ACTING_INSTITUTION_KEY)
  sessionStorage.removeItem(SUPERADMIN_ACTING_EXPERT_KEY)
}
