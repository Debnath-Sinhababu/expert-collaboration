// Profile score feeds Calxbook's live-course level eligibility (fixed 100/200/400 thresholds
// there). Weights/caps live in the mentor_score_config singleton row, not in code, so they can
// be tuned from a super-admin screen without a redeploy.

const DEFAULT_CONFIG = Object.freeze({
  rating_weight: 1,
  rating_cap: 150,
  experience_weight: 15,
  experience_cap: 150,
  training_weight: 10,
  training_cap: 200,
});

async function loadScoreConfig(serviceClient) {
  const { data, error } = await serviceClient
    .from('mentor_score_config')
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    console.warn('loadScoreConfig: falling back to defaults —', error.message);
    return DEFAULT_CONFIG;
  }
  return data || DEFAULT_CONFIG;
}

function clamp(value, cap) {
  return Math.max(0, Math.min(Number(value) || 0, cap));
}

/**
 * score = min(rating * total_ratings * ratingWeight, ratingCap)
 *       + min(experienceYears * experienceWeight, experienceCap)
 *       + min(completedTrainings * trainingWeight, trainingCap)
 */
function computeProfileScore(expert, completedTrainingsCount, config) {
  const cfg = config || DEFAULT_CONFIG;
  const rating = Number(expert.rating) || 0;
  const totalRatings = Number(expert.total_ratings) || 0;
  const experienceYears = Number(expert.experience_years) || 0;
  const trainings = Number(completedTrainingsCount) || 0;

  const ratingScore = clamp(rating * totalRatings * cfg.rating_weight, cfg.rating_cap);
  const experienceScore = clamp(experienceYears * cfg.experience_weight, cfg.experience_cap);
  const trainingScore = clamp(trainings * cfg.training_weight, cfg.training_cap);

  return Math.round((ratingScore + experienceScore + trainingScore) * 100) / 100;
}

/** Best-effort cache write for ClaxMap's own UI (e.g. the expert's own profile page). Never blocks the caller on failure — the sync response already carries the freshly computed value regardless. */
async function persistScoreBestEffort(serviceClient, expertId, score) {
  const { error } = await serviceClient
    .from('experts')
    .update({ profile_score: score, profile_score_updated_at: new Date().toISOString() })
    .eq('id', expertId);
  if (error) {
    console.warn('persistScoreBestEffort: failed to cache profile_score —', error.message);
  }
}

module.exports = { DEFAULT_CONFIG, loadScoreConfig, computeProfileScore, persistScoreBestEffort };
