/** Normalize API date/datetime strings to YYYY-MM-DD for comparisons and calendar. */
export function normalizeDateOnly(value: string | null | undefined): string | null {
  if (value == null || value === '') return null
  const s = String(value).trim()
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(s)
  return m ? m[1] : null
}

export function isDateInRange(
  day: string,
  start: string | null | undefined,
  end: string | null | undefined
): boolean {
  const d = normalizeDateOnly(day)
  const s = normalizeDateOnly(start)
  const e = normalizeDateOnly(end)
  if (!d || !s || !e) return false
  return d >= s && d <= e
}
