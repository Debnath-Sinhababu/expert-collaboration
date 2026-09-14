/**
 * Shared "completed trainings" counting logic.
 *
 * Originally inline in `server.js`'s `/api/calxbook/experts` sync handler; extracted
 * here so that handler and the CalxBook mentor-handoff module (which sends this same
 * count as a raw scoring signal in the join snapshot) can never drift apart on what
 * counts as a "completed" training.
 */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} serviceClient
 * @param {string[]} expertIds
 * @returns {Promise<Map<string, number>>} expert_id -> completed booking count
 */
async function getCompletedTrainingsCountByExpertId(serviceClient, expertIds) {
  const completedTrainingsByExpertId = new Map();
  if (!Array.isArray(expertIds) || expertIds.length === 0) {
    return completedTrainingsByExpertId;
  }

  const { data: bookingRows, error: bookingsError } = await serviceClient
    .from('bookings')
    .select('expert_id, status')
    .in('expert_id', expertIds);

  if (bookingsError) {
    console.warn('getCompletedTrainingsCountByExpertId: booking counts skipped', bookingsError.message);
    return completedTrainingsByExpertId;
  }

  for (const booking of bookingRows || []) {
    if (booking.status !== 'completed' || !booking.expert_id) continue;
    const expertId = booking.expert_id;
    completedTrainingsByExpertId.set(
      expertId,
      (completedTrainingsByExpertId.get(expertId) || 0) + 1
    );
  }

  return completedTrainingsByExpertId;
}

/** Convenience wrapper for a single expert id. */
async function getCompletedTrainingsCountForExpert(serviceClient, expertId) {
  if (!expertId) return 0;
  const counts = await getCompletedTrainingsCountByExpertId(serviceClient, [expertId]);
  return counts.get(expertId) || 0;
}

module.exports = {
  getCompletedTrainingsCountByExpertId,
  getCompletedTrainingsCountForExpert,
};
