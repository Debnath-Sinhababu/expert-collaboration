export function toPositiveNumber(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function resolveHourlyRate(input: {
  finalHourlyRate?: unknown
  proposedRate?: unknown
  projectHourlyRate?: unknown
  fallback?: unknown
}) {
  return (
    toPositiveNumber(input.finalHourlyRate) ??
    toPositiveNumber(input.proposedRate) ??
    toPositiveNumber(input.projectHourlyRate) ??
    toPositiveNumber(input.fallback) ??
    0
  )
}

export function formatRupees(value: unknown) {
  const n = Number(value || 0)
  return `Rs ${Number.isFinite(n) ? n.toLocaleString('en-IN') : '0'}`
}
