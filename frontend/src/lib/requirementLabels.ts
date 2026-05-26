export const WORKPLACE_TYPE_OPTIONS = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'on_site', label: 'On-site' },
] as const

export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
] as const

export function formatWorkplaceType(value?: string | null) {
  return WORKPLACE_TYPE_OPTIONS.find((o) => o.value === value)?.label || value || ''
}

export function formatEmploymentType(value?: string | null) {
  return EMPLOYMENT_TYPE_OPTIONS.find((o) => o.value === value)?.label || value || ''
}

export function projectLocationLine(project: {
  job_location?: string | null
  institutions?: { city?: string; state?: string; display_name?: string } | null
}) {
  if (project.job_location?.trim()) return project.job_location.trim()
  const inst = project.institutions
  if (!inst) return ''
  const geo = [inst.city, inst.state].filter(Boolean).join(', ')
  return geo
}
