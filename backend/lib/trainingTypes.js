const TRAINING_PROJECT_TYPES = [
  'guest_lecture',
  'fdp',
  'workshop',
  'curriculum_dev',
  'research_collaboration',
  'training_program',
  'consultation',
  'other',
];

function isTrainingProjectType(type) {
  return TRAINING_PROJECT_TYPES.includes(type);
}

const ACTIVE_BOOKING_STATUSES = ['confirmed', 'in_progress'];
const READ_ONLY_BOOKING_STATUSES = ['completed', 'cancelled'];

module.exports = {
  TRAINING_PROJECT_TYPES,
  isTrainingProjectType,
  ACTIVE_BOOKING_STATUSES,
  READ_ONLY_BOOKING_STATUSES,
};
