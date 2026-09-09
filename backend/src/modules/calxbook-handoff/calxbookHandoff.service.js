const jwt = require('jsonwebtoken');
const { buildJoinTokenPayload, buildSwitchTokenPayload } = require('./calxbookHandoff.dto');

const TOKEN_TTL = '5m';
const CALXBOOK_HANDOFF_PATH = '/api/v1/mentors/claxmap-handoff';

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

class CalxbookHandoffService {
  constructor(repository) {
    this.repo = repository;
  }

  /**
   * Verified expert clicks "Join Calxbook": build a one-time profile snapshot, sign it
   * into a short-lived JWT (`type: "join"`), POST it server-to-server to Calxbook's
   * `POST /api/v1/mentors/claxmap-handoff`, and (on success) record the link on this
   * expert's row. Calxbook hands back a ready-to-open `redirectUrl`.
   */
  async joinCalxbook({ expertRow, writeClient }) {
    if (!expertRow?.is_verified) {
      throw new HttpError(403, 'Only verified experts can join Calxbook');
    }

    const completedTrainingsCount = await this.repo.getCompletedTrainingsCount(expertRow.id);
    const token = this.#signToken(buildJoinTokenPayload(expertRow, completedTrainingsCount));

    const redirectUrl = await this.#postHandoff(token);

    await this.repo.markMentorLinked(expertRow.id, writeClient);

    return { redirect_url: redirectUrl };
  }

  /**
   * Already-linked expert clicks "Switch to Calxbook": mint a fresh short-lived JWT
   * (`type: "switch"`) proving "this is the same authenticated expert" — deliberately
   * minimal, no profile payload, no local side effects — and POST it to the *same*
   * Calxbook endpoint as join. Calxbook hands back a ready-to-open `redirectUrl`; there
   * is no separate session-exchange URL to construct on this side.
   */
  async switchCalxbook({ expertRow }) {
    if (!expertRow?.calxbook_mentor_linked_at) {
      throw new HttpError(400, 'This expert has not joined Calxbook yet');
    }

    const token = this.#signToken(buildSwitchTokenPayload(expertRow));
    const redirectUrl = await this.#postHandoff(token);

    return { redirect_url: redirectUrl };
  }

  #signToken(payload) {
    // Deliberately NOT falling back to CALXBOOK_SYNC_TOKEN's "skip check if unset" pattern
    // (server.js's optional read-only sync guard) — this mints a write-capable,
    // account-creating credential and must fail closed if unconfigured.
    const secret = process.env.CALXBOOK_MENTOR_HANDOFF_SECRET;
    if (!secret) {
      throw new HttpError(500, 'CALXBOOK_MENTOR_HANDOFF_SECRET is not configured');
    }
    return jwt.sign(payload, secret, { expiresIn: TOKEN_TTL });
  }

  #getCalxbookBaseUrl() {
    const baseUrl = process.env.CALXBOOK_API_BASE_URL;
    if (!baseUrl) {
      throw new HttpError(500, 'CALXBOOK_API_BASE_URL is not configured');
    }
    return baseUrl.replace(/\/+$/, '');
  }

  /** POSTs a signed handoff token to Calxbook and returns the redirectUrl from its response. */
  async #postHandoff(token) {
    const baseUrl = this.#getCalxbookBaseUrl();
    let response;
    try {
      response = await fetch(`${baseUrl}${CALXBOOK_HANDOFF_PATH}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    } catch (err) {
      // Calxbook's receiving endpoint may be unreachable/not deployed yet — surface as a
      // clean upstream error rather than a raw network exception.
      throw new HttpError(502, `Failed to reach Calxbook: ${err.message || err}`);
    }

    const json = await response.json().catch(() => ({}));
    if (!response.ok || json?.success === false) {
      throw new HttpError(502, json?.error || 'Calxbook rejected the handoff request');
    }
    const redirectUrl = json?.data?.redirectUrl;
    if (!redirectUrl) {
      throw new HttpError(502, 'Calxbook did not return a redirectUrl');
    }
    return redirectUrl;
  }
}

module.exports = CalxbookHandoffService;
module.exports.HttpError = HttpError;
