/**
 * Canonical project/requirement status labels (mirrors backend/src/shared/projectStatus.js).
 * Booking status is separate — do not mix.
 */

export const PROJECT_STATUSES = ['open', 'running', 'completed', 'closed'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  open: 'Open',
  running: 'Running',
  completed: 'Completed',
  closed: 'Closed',
}

const LEGACY_STATUS_MAP: Record<string, ProjectStatus> = {
  in_progress: 'running',
  ongoing: 'running',
  active: 'running',
  cancelled: 'closed',
  canceled: 'closed',
  closed_incomplete: 'closed',
  pending: 'open',
}

export function normalizeProjectStatus(status?: string | null): ProjectStatus | string {
  const raw = String(status || '').toLowerCase().trim()
  if (!raw) return 'open'
  if ((PROJECT_STATUSES as readonly string[]).includes(raw)) return raw as ProjectStatus
  if (LEGACY_STATUS_MAP[raw]) return LEGACY_STATUS_MAP[raw]
  return raw
}

export function projectStatusLabel(status?: string | null): string {
  const normalized = normalizeProjectStatus(status)
  return PROJECT_STATUS_LABELS[normalized as ProjectStatus] || String(status || 'Open')
}

export function isActiveProjectStatus(status?: string | null): boolean {
  const normalized = normalizeProjectStatus(status)
  return normalized === 'open' || normalized === 'running'
}

export function isEndedProjectStatus(status?: string | null): boolean {
  const normalized = normalizeProjectStatus(status)
  return normalized === 'completed' || normalized === 'closed'
}
