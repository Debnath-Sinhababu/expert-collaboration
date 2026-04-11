/** Session key for X-Acting-Institution-Id header (see api.ts getAuthHeaders). */
export const SUPERADMIN_ACTING_INSTITUTION_KEY = 'superadmin_acting_institution_id'

export function setSuperAdminActingInstitutionId(id: string | null) {
  if (typeof window === 'undefined') return
  if (id) {
    sessionStorage.setItem(SUPERADMIN_ACTING_INSTITUTION_KEY, id)
  } else {
    sessionStorage.removeItem(SUPERADMIN_ACTING_INSTITUTION_KEY)
  }
}
