export const TRAINING_PROJECT_TYPES = [
  'guest_lecture',
  'fdp',
  'workshop',
  'curriculum_dev',
  'research_collaboration',
  'training_program',
  'consultation',
  'other',
] as const

export type TrainingProjectType = (typeof TRAINING_PROJECT_TYPES)[number]

export function isTrainingProjectType(type: string | null | undefined): boolean {
  if (!type) return false
  return (TRAINING_PROJECT_TYPES as readonly string[]).includes(type)
}

export function getBookingProjectType(booking: {
  projects?: { type?: string } | { type?: string }[] | null
  project?: { type?: string } | null
}): string | undefined {
  const raw = booking.projects ?? booking.project
  if (Array.isArray(raw)) return raw[0]?.type
  return raw?.type
}

export function isTrainingBooking(booking: {
  projects?: { type?: string } | { type?: string }[] | null
  project?: { type?: string } | null
}): boolean {
  return isTrainingProjectType(getBookingProjectType(booking))
}
