/** Prefer API-masked display_name; fall back to name for owners / legacy rows. */
export function institutionDisplayName(inst?: { name?: string; display_name?: string } | null) {
  if (!inst) return 'Verified institution'
  return inst.display_name || inst.name || 'Verified institution'
}

export function expertDisplayName(expert?: { name?: string; display_name?: string } | null) {
  if (!expert) return 'Expert'
  return expert.display_name || expert.name || 'Expert'
}
