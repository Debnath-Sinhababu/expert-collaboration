/**
 * Canonical project/requirement status (projects.status).
 * Independent of booking status — a project may stay running while some bookings are completed.
 *
 * Canonical: open | running | completed | closed
 * Legacy values are normalized on read/write and migrated in SQL.
 */

const PROJECT_STATUSES = Object.freeze(['open', 'running', 'completed', 'closed']);
const PROJECT_STATUS_SET = new Set(PROJECT_STATUSES);

/** Map historical / accidental values → canonical without data loss of meaning */
const LEGACY_STATUS_MAP = Object.freeze({
  in_progress: 'running',
  ongoing: 'running',
  active: 'running',
  cancelled: 'closed',
  canceled: 'closed',
  closed_incomplete: 'closed',
  pending: 'open',
});

const PROJECT_STATUS_LABELS = Object.freeze({
  open: 'Open',
  running: 'Running',
  completed: 'Completed',
  closed: 'Closed',
});

function todayISODate(date = new Date()) {
  // Business dates are India-local; avoid UTC day-boundary surprises.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function dateOnly(value) {
  if (!value) return null;
  const s = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

/**
 * Normalize any stored status to a canonical value when possible.
 * Unknown non-empty values fall back to `open` only when empty/null.
 */
function normalizeProjectStatus(status) {
  const raw = String(status || '').toLowerCase().trim();
  if (!raw) return 'open';
  if (PROJECT_STATUS_SET.has(raw)) return raw;
  if (LEGACY_STATUS_MAP[raw]) return LEGACY_STATUS_MAP[raw];
  return raw;
}

function isCanonicalProjectStatus(status) {
  return PROJECT_STATUS_SET.has(normalizeProjectStatus(status));
}

function assertCanonicalProjectStatus(status) {
  const normalized = normalizeProjectStatus(status);
  if (!PROJECT_STATUS_SET.has(normalized)) {
    const err = new Error(`Invalid project status. Allowed: ${PROJECT_STATUSES.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }
  return normalized;
}

function projectStatusLabel(status) {
  const normalized = normalizeProjectStatus(status);
  return PROJECT_STATUS_LABELS[normalized] || String(status || 'Open');
}

/**
 * Forward-only auto transitions from dates.
 * - closed / completed are never auto-changed
 * - open → running when start_date <= today (and not past end)
 * - open | running → completed when end_date < today
 */
function computeAutoProjectStatus(row, today = todayISODate()) {
  const current = normalizeProjectStatus(row?.status);
  if (current === 'closed' || current === 'completed') return current;
  if (!PROJECT_STATUS_SET.has(current)) {
    // Unknown legacy: still allow date-based completion / running after normalize attempt
  }

  const start = dateOnly(row?.start_date);
  const end = dateOnly(row?.end_date);
  const todayStr = dateOnly(today) || todayISODate();

  if (end && todayStr > end) {
    return 'completed';
  }

  if (current === 'open' && start && todayStr >= start && (!end || todayStr <= end)) {
    return 'running';
  }

  // Prefer canonical if we only had legacy
  if (PROJECT_STATUS_SET.has(current)) return current;
  return normalizeProjectStatus(current);
}

/**
 * Batch sync projects that need open→running or open/running→completed.
 * Safe to call often; only updates rows that actually change.
 */
async function syncProjectStatusesDue(client, { today = todayISODate(), nowIso = new Date().toISOString() } = {}) {
  if (!client) return { runningUpdated: 0, completedUpdated: 0 };

  const todayStr = dateOnly(today) || todayISODate();
  let runningUpdated = 0;
  let completedUpdated = 0;

  // Past end date → completed (never touch closed/completed)
  {
    const { data, error } = await client
      .from('projects')
      .update({ status: 'completed', updated_at: nowIso })
      .in('status', ['open', 'running', 'in_progress', 'ongoing', 'active'])
      .not('end_date', 'is', null)
      .lt('end_date', todayStr)
      .select('id');
    if (error) {
      console.warn('[projectStatus] completed sync failed:', error.message || error);
    } else {
      completedUpdated = Array.isArray(data) ? data.length : 0;
    }
  }

  // Start day reached → running (still within / without end)
  {
    const { data, error } = await client
      .from('projects')
      .update({ status: 'running', updated_at: nowIso })
      .in('status', ['open', 'in_progress', 'ongoing', 'active'])
      .not('start_date', 'is', null)
      .lte('start_date', todayStr)
      .or(`end_date.is.null,end_date.gte.${todayStr}`)
      .select('id');
    if (error) {
      console.warn('[projectStatus] running sync failed:', error.message || error);
    } else {
      runningUpdated = Array.isArray(data) ? data.length : 0;
    }
  }

  return { runningUpdated, completedUpdated };
}

let lastProjectStatusSyncAt = 0;
const DEFAULT_SYNC_COOLDOWN_MS = 5 * 60 * 1000;

async function maybeSyncProjectStatuses(client, { cooldownMs = DEFAULT_SYNC_COOLDOWN_MS, force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastProjectStatusSyncAt < cooldownMs) {
    return { skipped: true, runningUpdated: 0, completedUpdated: 0 };
  }
  lastProjectStatusSyncAt = now;
  const result = await syncProjectStatusesDue(client);
  return { skipped: false, ...result };
}

function applyProjectStatusListFilter(query, status) {
  const raw = String(status || '').trim().toLowerCase();
  if (!raw || raw === 'all') return query;

  // Back-compat aliases from older institution filters
  if (raw === 'closed_group') {
    return query.in('status', ['completed', 'closed', 'cancelled', 'canceled']);
  }
  if (raw === 'in_progress') {
    return query.in('status', ['running', 'in_progress']);
  }
  if (raw === 'cancelled' || raw === 'canceled') {
    return query.in('status', ['closed', 'cancelled', 'canceled']);
  }

  const normalized = normalizeProjectStatus(raw);
  if (normalized === 'running') {
    return query.in('status', ['running', 'in_progress', 'ongoing', 'active']);
  }
  if (normalized === 'closed') {
    return query.in('status', ['closed', 'cancelled', 'canceled']);
  }
  if (normalized === 'open') {
    return query.in('status', ['open', 'pending']);
  }
  if (normalized === 'completed') {
    return query.eq('status', 'completed');
  }
  return query.eq('status', raw);
}

module.exports = {
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  LEGACY_STATUS_MAP,
  todayISODate,
  normalizeProjectStatus,
  isCanonicalProjectStatus,
  assertCanonicalProjectStatus,
  projectStatusLabel,
  computeAutoProjectStatus,
  syncProjectStatusesDue,
  maybeSyncProjectStatuses,
  applyProjectStatusListFilter,
};
