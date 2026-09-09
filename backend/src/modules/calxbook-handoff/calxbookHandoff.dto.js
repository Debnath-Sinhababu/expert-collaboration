function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * JWT payload for the "join" flow — decoded on Calxbook's side as the `type: "join"`
 * branch of its `POST /api/v1/mentors/claxmap-handoff` discriminated-union contract.
 * Field names are camelCase per that contract, not this repo's usual snake_case.
 *
 * Only whitelisted fields — never the raw `experts` row, and never a password or any
 * other auth secret. Field renames here (name -> fullName, current_designation -> title,
 * photo_url -> avatarUrl) mirror the compatibility aliases `/api/calxbook/experts`
 * already produces, since `full_name`/`title`/`avatar_url` are not real columns on
 * `experts` — they're derived at request time.
 *
 * `rating`, `totalRatings`, and `completedTrainingsCount` are raw scoring signals only.
 * Calxbook computes and owns `profile_score` itself on receipt — ClaxMap does no scoring
 * computation of its own.
 */
function buildJoinTokenPayload(expertRow, completedTrainingsCount) {
  return {
    type: 'join',
    snapshot: {
      claxmapExpertId: expertRow.id,
      email: expertRow.email,
      fullName: expertRow.name ?? null,
      title: expertRow.current_designation ?? null,
      avatarUrl: expertRow.photo_url ?? null,
      bio: expertRow.bio ?? null,
      domainExpertise: normalizeArray(expertRow.domain_expertise),
      expertTypes: normalizeArray(expertRow.expert_types),
      expertServices: normalizeArray(expertRow.expert_services),
      subskills: normalizeArray(expertRow.subskills),
      experienceYears: expertRow.experience_years ?? null,
      city: expertRow.city ?? null,
      state: expertRow.state ?? null,
      linkedinUrl: expertRow.linkedin_url ?? null,
      qualifications: expertRow.qualifications ?? null,
      resumeUrl: expertRow.resume_url ?? null,
      profileVideoUrl: expertRow.profile_video_url ?? null,
      courseVideoUrl: expertRow.course_video_url ?? null,
      rating: expertRow.rating ?? null,
      totalRatings: expertRow.total_ratings ?? null,
      completedTrainingsCount: completedTrainingsCount ?? null,
    },
  };
}

/**
 * JWT payload for the "switch" flow — the `type: "switch"` branch of the same
 * discriminated-union contract. Deliberately minimal (no profile fields) — re-sending
 * the full snapshot on every switch would quietly become an ongoing sync channel, which
 * the plan explicitly rules out (Calxbook never re-fetches mentor data from ClaxMap
 * after the initial join).
 */
function buildSwitchTokenPayload(expertRow) {
  return {
    type: 'switch',
    claxmapExpertId: expertRow.id,
    email: expertRow.email,
  };
}

module.exports = {
  buildJoinTokenPayload,
  buildSwitchTokenPayload,
};
