const BookingCompletionRepository = require('./bookingCompletion.repository');
const { appendCompletionHistory } = require('../../shared/completionHistory');

const LOW_ATTENDANCE_RATIO = 0.8;

class HttpError extends Error {
  constructor(status, message, extra = null) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

class BookingCompletionService {
  constructor(serviceClient, repository = null) {
    this.db = serviceClient;
    this.repo = repository || new BookingCompletionRepository(serviceClient);
  }

  async requestCompletion({ bookingId, actor, writeClient, note, acknowledgeLowAttendance }) {
    this.#assertExpert(actor);
    const booking = await this.#requireBooking(bookingId);
    this.#assertExpertOwns(booking, actor);

    if (booking.status === 'completed') {
      throw new HttpError(400, 'Booking is already completed');
    }
    if (booking.status === 'cancelled') {
      throw new HttpError(400, 'Cancelled bookings cannot be completed');
    }
    if (booking.status === 'completion_requested') {
      throw new HttpError(400, 'Completion is already requested — waiting for institution approval');
    }
    if (booking.status !== 'in_progress') {
      throw new HttpError(400, 'Only in-progress bookings can request completion');
    }

    const hoursBooked = Number(booking.hours_booked) || Number(booking.projects?.duration_hours) || 0;
    const approvedHours = await this.repo.getApprovedAttendanceHours(bookingId);
    const ratio = hoursBooked > 0 ? approvedHours / hoursBooked : 1;
    const lowAttendance = hoursBooked > 0 && ratio < LOW_ATTENDANCE_RATIO;

    if (lowAttendance && !acknowledgeLowAttendance) {
      throw new HttpError(400, 'Approved attendance is below 80% of planned hours. Confirm to continue.', {
        code: 'LOW_ATTENDANCE',
        approved_hours: approvedHours,
        hours_booked: hoursBooked,
        percent: Math.round(ratio * 1000) / 10,
      });
    }

    const now = new Date().toISOString();
    return this.repo.updateBooking(
      bookingId,
      {
        status: 'completion_requested',
        completion_note: note || null,
        completion_requested_at: now,
        completion_decision_note: null,
        completion_decided_at: null,
        completion_history: appendCompletionHistory(booking.completion_history, {
          actor: 'expert',
          action: 'request_completion',
          note: note || null,
          approved_hours: approvedHours || null,
          hours_booked: hoursBooked || null,
          low_attendance: lowAttendance,
        }),
      },
      writeClient
    );
  }

  async approveCompletion({ bookingId, actor, writeClient, note }) {
    this.#assertInstitution(actor);
    const booking = await this.#requireBooking(bookingId);
    this.#assertInstitutionOwns(booking, actor);

    if (booking.status === 'completed') {
      throw new HttpError(400, 'Booking is already completed');
    }
    if (booking.status === 'cancelled') {
      throw new HttpError(400, 'Cancelled bookings cannot be completed');
    }
    if (booking.status !== 'completion_requested' && booking.status !== 'in_progress') {
      throw new HttpError(400, 'Booking cannot be marked completed from this status');
    }

    const now = new Date().toISOString();
    const action =
      booking.status === 'completion_requested' ? 'approve_completion' : 'institution_mark_completed';

    return this.repo.updateBooking(
      bookingId,
      {
        status: 'completed',
        completion_decision_note: note || null,
        completion_decided_at: now,
        completion_requested_at: booking.completion_requested_at || now,
        completion_history: appendCompletionHistory(booking.completion_history, {
          actor: 'institution',
          action,
          note: note || null,
        }),
      },
      writeClient
    );
  }

  async declineCompletion({ bookingId, actor, writeClient, note }) {
    this.#assertInstitution(actor);
    const booking = await this.#requireBooking(bookingId);
    this.#assertInstitutionOwns(booking, actor);

    if (booking.status !== 'completion_requested') {
      throw new HttpError(400, 'No completion request to decline');
    }

    const now = new Date().toISOString();
    return this.repo.updateBooking(
      bookingId,
      {
        status: 'in_progress',
        completion_decision_note: note || null,
        completion_decided_at: now,
        completion_history: appendCompletionHistory(booking.completion_history, {
          actor: 'institution',
          action: 'decline_completion',
          note: note || null,
        }),
      },
      writeClient
    );
  }

  async #requireBooking(bookingId) {
    const booking = await this.repo.getBooking(bookingId);
    if (!booking) throw new HttpError(404, 'Booking not found');
    return booking;
  }

  #assertExpert(actor) {
    if (actor?.role !== 'expert') throw new HttpError(403, 'Only the expert can request completion');
  }

  #assertInstitution(actor) {
    if (actor?.role !== 'institution') throw new HttpError(403, 'Only the institution can decide completion');
  }

  #assertExpertOwns(booking, actor) {
    if (String(booking.expert_id) !== String(actor.expertId)) {
      throw new HttpError(403, 'Unauthorized');
    }
  }

  #assertInstitutionOwns(booking, actor) {
    const institutionId = booking.institution_id || booking.projects?.institution_id;
    if (String(institutionId) !== String(actor.institutionId)) {
      throw new HttpError(403, 'Unauthorized');
    }
  }
}

module.exports = BookingCompletionService;
