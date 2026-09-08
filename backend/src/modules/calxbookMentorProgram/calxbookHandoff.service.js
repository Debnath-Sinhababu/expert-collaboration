// Sends the "Join Calxbook" / "Switch to Calxbook" handoff to Calxbook's backend. Deliberately
// never carries a password — Calxbook creates the account with a random discarded one and
// emails the expert a "set your password" link (mentor program plan decision #4). The token is
// short-lived and single-use on Calxbook's side; it is the only thing authenticating this
// server-to-server request.

const jwt = require('jsonwebtoken');

const HANDOFF_TOKEN_TTL_SECONDS = 5 * 60;

function getHandoffSecret() {
  const secret = process.env.CLAXMAP_MENTOR_HANDOFF_SECRET;
  if (!secret) {
    throw new Error('CLAXMAP_MENTOR_HANDOFF_SECRET is not configured');
  }
  return secret;
}

function getCalxbookHandoffUrl() {
  const base = process.env.CALXBOOK_API_BASE_URL;
  if (!base) {
    throw new Error('CALXBOOK_API_BASE_URL is not configured');
  }
  return `${base.replace(/\/$/, '')}/api/v1/mentors/claxmap-handoff`;
}

function buildJoinPayload(expert, profileScore) {
  return {
    mode: 'join',
    expertId: expert.id,
    email: expert.email,
    fullName: expert.name || expert.full_name || null,
    title: expert.current_designation || expert.title || null,
    avatarUrl: expert.profile_photo_small_url || expert.profile_photo_thumbnail_url || expert.photo_url || null,
    bio: expert.bio || null,
    domainExpertise: Array.isArray(expert.domain_expertise) ? expert.domain_expertise : [],
    expertTypes: Array.isArray(expert.expert_types) ? expert.expert_types : [],
    expertServices: Array.isArray(expert.expert_services) ? expert.expert_services : [],
    subskills: Array.isArray(expert.subskills) ? expert.subskills : [],
    experienceYears: expert.experience_years ?? null,
    city: expert.city || null,
    state: expert.state || null,
    linkedinUrl: expert.linkedin_url || null,
    qualifications: expert.qualifications || null,
    resumeUrl: expert.resume_url || null,
    profileVideoUrl: expert.profile_video_url || null,
    courseVideoUrl: expert.course_video_url || null,
    profileScore: profileScore ?? 0,
  };
}

function buildSwitchPayload(expert) {
  return { mode: 'switch', expertId: expert.id, email: expert.email };
}

async function sendHandoff(payload) {
  const token = jwt.sign(payload, getHandoffSecret(), { expiresIn: HANDOFF_TOKEN_TTL_SECONDS });
  const response = await fetch(getCalxbookHandoffUrl(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ handoffToken: token }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(body?.message || body?.error || `Calxbook handoff failed (${response.status})`);
    err.status = response.status >= 400 && response.status < 500 ? 400 : 502;
    throw err;
  }
  const redirectUrl = body?.data?.redirectUrl;
  if (!redirectUrl) {
    const err = new Error('Calxbook handoff response did not include a redirect URL');
    err.status = 502;
    throw err;
  }
  return redirectUrl;
}

module.exports = { buildJoinPayload, buildSwitchPayload, sendHandoff };
