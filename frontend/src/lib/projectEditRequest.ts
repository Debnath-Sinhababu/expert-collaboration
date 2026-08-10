/** Human-readable labels for project edit diff fields */
export const PROJECT_EDIT_FIELD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  type: 'Project type',
  start_date: 'Start date',
  end_date: 'End date',
  compensation_unit: 'Pay unit',
  unit_quantity: 'Quantity',
  duration_hours: 'Duration (hours)',
  duration_per_unit: 'Duration per unit',
  hours_per_day: 'Hours per day',
  institution_gross_per_unit: 'Rate (institute pays)',
  institution_gross_total: 'Total (gross)',
  total_budget: 'Total budget',
  hourly_rate: 'Hourly rate',
  opening_count: 'Openings',
  domain_expertise: 'Domain',
  required_expertise: 'Required expertise',
  subskills: 'Specializations',
  job_location: 'Location',
  workplace_type: 'Work mode',
  employment_type: 'Engagement type',
  interview_period_interval: 'Interview period',
  schedule_notes: 'Weekly schedule',
  screening_questions: 'Screening questions',
  requirement_pdf_url: 'Requirement PDF',
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (key === 'requirement_pdf_url' && typeof value === 'string') return 'New PDF attached'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function valuesEqual(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify(a ?? []) === JSON.stringify(b ?? [])
  }
  return String(a ?? '') === String(b ?? '')
}

export type ProjectEditDiffRow = {
  key: string
  label: string
  before: string
  after: string
}

export function buildProjectEditDiff(
  previous: Record<string, unknown> | null | undefined,
  proposed: Record<string, unknown> | null | undefined,
): ProjectEditDiffRow[] {
  const before = previous || {}
  const after = proposed || {}
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  const rows: ProjectEditDiffRow[] = []

  for (const key of keys) {
    if (!PROJECT_EDIT_FIELD_LABELS[key]) continue
    const prevVal = before[key]
    const nextVal = after[key]
    if (valuesEqual(prevVal, nextVal)) continue
    rows.push({
      key,
      label: PROJECT_EDIT_FIELD_LABELS[key],
      before: formatValue(key, prevVal),
      after: formatValue(key, nextVal),
    })
  }

  return rows
}
