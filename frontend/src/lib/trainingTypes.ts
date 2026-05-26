export const TRAINING_PROJECT_TYPES = [
  'guest_lecture',
  'fdp',
  'workshop',
  'training_program',
] as const

export type TrainingProjectType = (typeof TRAINING_PROJECT_TYPES)[number]

export function isTrainingProjectType(type: string | null | undefined): boolean {
  if (!type) return false
  return (TRAINING_PROJECT_TYPES as readonly string[]).includes(type)
}

export function isTrainingBooking(booking: {
  projects?: { type?: string } | null
  project?: { type?: string } | null
}): boolean {
  const t = booking.projects?.type ?? booking.project?.type
  return isTrainingProjectType(t)
}
