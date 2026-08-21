/**
 * Scans active training bookings for past session dates with no attendance
 * marked at all, and emails the expert one reminder per missing date.
 */
const { ACTIVE_BOOKING_STATUSES } = require('../lib/trainingTypes');
const { sendMissingAttendanceEmail } = require('./trainingAttendanceEmailService');

const DEFAULT_LOOKBACK_DAYS = 30;

function normalizeDateOnly(s) {
  if (s == null || s === '') return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(s).trim());
  return m ? m[1] : null;
}

function addDaysISO(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isWeekday(dateStr) {
  const day = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
  return day >= 1 && day <= 5;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function weekdaysBetween(start, end) {
  const dates = [];
  let cursor = start;
  while (cursor <= end) {
    if (isWeekday(cursor)) dates.push(cursor);
    cursor = addDaysISO(cursor, 1);
  }
  return dates;
}

function bookingTrainingWindow(booking) {
  return {
    start: normalizeDateOnly(booking?.actual_start_date) || normalizeDateOnly(booking?.start_date),
    end: normalizeDateOnly(booking?.actual_end_date) || normalizeDateOnly(booking?.end_date),
  };
}

async function computeMissingSessionDates(serviceClient, booking, { lookbackDays = DEFAULT_LOOKBACK_DAYS } = {}) {
  const window = bookingTrainingWindow(booking);
  if (!window.start || !window.end) return [];

  const today = todayISO();
  const yesterday = addDaysISO(today, -1);
  const effectiveEnd = window.end < yesterday ? window.end : yesterday;
  const earliestLookback = addDaysISO(today, -lookbackDays);
  const cutoffStart = window.start > earliestLookback ? window.start : earliestLookback;

  if (cutoffStart > effectiveEnd) return [];

  const candidates = weekdaysBetween(cutoffStart, effectiveEnd);
  if (!candidates.length) return [];

  const [{ data: existingDays, error: daysError }, { data: existingReminders, error: remindersError }] = await Promise.all([
    serviceClient
      .from('training_attendance_days')
      .select('session_date')
      .eq('booking_id', booking.id)
      .gte('session_date', cutoffStart)
      .lte('session_date', effectiveEnd),
    serviceClient
      .from('training_attendance_reminders')
      .select('session_date')
      .eq('booking_id', booking.id)
      .gte('session_date', cutoffStart)
      .lte('session_date', effectiveEnd),
  ]);
  if (daysError) throw daysError;
  if (remindersError) throw remindersError;

  const covered = new Set([
    ...(existingDays || []).map((d) => normalizeDateOnly(d.session_date)),
    ...(existingReminders || []).map((r) => normalizeDateOnly(r.session_date)),
  ]);

  return candidates.filter((date) => !covered.has(date));
}

async function markReminderSent(serviceClient, bookingId, sessionDate) {
  const { error } = await serviceClient
    .from('training_attendance_reminders')
    .insert([{ booking_id: bookingId, session_date: sessionDate }]);
  if (error && error.code !== '23505') throw error;
}

async function runMissingAttendanceScan(serviceClient, { lookbackDays = DEFAULT_LOOKBACK_DAYS } = {}) {
  const { data: bookings, error } = await serviceClient
    .from('bookings')
    .select(
      `
      id, status, expert_id, project_id, start_date, end_date, actual_start_date, actual_end_date,
      projects!inner(id, title, type),
      experts(id, name, email)
    `
    )
    .in('status', ACTIVE_BOOKING_STATUSES);
  if (error) throw error;

  const results = [];
  for (const booking of bookings || []) {
    try {
      const missingDates = await computeMissingSessionDates(serviceClient, booking, { lookbackDays });
      for (const sessionDate of missingDates) {
        try {
          await sendMissingAttendanceEmail({
            to: booking.experts?.email,
            expertName: booking.experts?.name,
            projectTitle: booking.projects?.title,
            bookingId: booking.id,
            sessionDate,
          });
          await markReminderSent(serviceClient, booking.id, sessionDate);
          results.push({ bookingId: booking.id, sessionDate });
        } catch (err) {
          console.warn(
            `Missing-attendance reminder failed for booking ${booking.id} / ${sessionDate}:`,
            err.message || err
          );
        }
      }
    } catch (err) {
      console.warn(`Missing-attendance scan failed for booking ${booking.id}:`, err.message || err);
    }
  }
  return results;
}

module.exports = {
  computeMissingSessionDates,
  runMissingAttendanceScan,
};
