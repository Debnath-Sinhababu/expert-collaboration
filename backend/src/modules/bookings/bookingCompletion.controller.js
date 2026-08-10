const BookingCompletionService = require('./bookingCompletion.service');
const { parseCompletionBody } = require('./bookingCompletion.dto');
const expertAccess = require('../../../auth/expertAccess');
const institutionAccess = require('../../../auth/institutionAccess');

class BookingCompletionController {
  constructor(service = null) {
    this.service =
      service || new BookingCompletionService(institutionAccess.getServiceClient());
  }

  requestCompletion = async (req, res) => {
    const bookingId = req.params.id;
    const body = parseCompletionBody(req.body || {});
    try {
      const { actor, writeClient } = await this.#resolveExpertActor(req, bookingId);
      const updated = await this.service.requestCompletion({
        bookingId,
        actor,
        writeClient,
        note: body.note,
        acknowledgeLowAttendance: body.acknowledge_low_attendance,
      });
      res.json(updated);
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  approveCompletion = async (req, res) => {
    const bookingId = req.params.id;
    const body = parseCompletionBody(req.body || {});
    try {
      const { actor, writeClient } = await this.#resolveInstitutionActor(req, bookingId);
      const updated = await this.service.approveCompletion({
        bookingId,
        actor,
        writeClient,
        note: body.note,
      });
      res.json(updated);
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  declineCompletion = async (req, res) => {
    const bookingId = req.params.id;
    const body = parseCompletionBody(req.body || {});
    try {
      const { actor, writeClient } = await this.#resolveInstitutionActor(req, bookingId);
      const updated = await this.service.declineCompletion({
        bookingId,
        actor,
        writeClient,
        note: body.note,
      });
      res.json(updated);
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  requestCancellation = async (req, res) => {
    const bookingId = req.params.id;
    const body = parseCompletionBody(req.body || {});
    try {
      const { actor, writeClient } = await this.#resolveExpertActor(req, bookingId);
      const updated = await this.service.requestCancellation({
        bookingId,
        actor,
        writeClient,
        note: body.note,
      });
      res.json(updated);
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  approveCancellation = async (req, res) => {
    const bookingId = req.params.id;
    const body = parseCompletionBody(req.body || {});
    try {
      const { actor, writeClient } = await this.#resolveInstitutionActor(req, bookingId);
      const updated = await this.service.approveCancellation({
        bookingId,
        actor,
        writeClient,
        note: body.note,
      });
      res.json(updated);
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  declineCancellation = async (req, res) => {
    const bookingId = req.params.id;
    const body = parseCompletionBody(req.body || {});
    try {
      const { actor, writeClient } = await this.#resolveInstitutionActor(req, bookingId);
      const updated = await this.service.declineCancellation({
        bookingId,
        actor,
        writeClient,
        note: body.note,
      });
      res.json(updated);
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  uploadAgreementPdf = async (req, res) => {
    const bookingId = req.params.id;
    try {
      const { actor, writeClient } = await this.#resolveInstitutionActor(req, bookingId);
      const updated = await this.service.uploadAgreementPdf({
        bookingId,
        actor,
        writeClient,
        file: req.file,
      });
      res.json(updated);
    } catch (err) {
      this.#sendError(res, err);
    }
  };

  async #loadBooking(bookingId) {
    const service = institutionAccess.getServiceClient();
    const { data, error } = await service
      .from('bookings')
      .select('id, expert_id, institution_id, project_id, projects(institution_id)')
      .eq('id', bookingId)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      const err = new Error('Booking not found');
      err.status = 404;
      throw err;
    }
    return data;
  }

  async #resolveExpertActor(req, bookingId) {
    const booking = await this.#loadBooking(bookingId);
    const access = await expertAccess.resolveExpertAccess(req, booking.expert_id);
    if (!access) {
      const err = new Error('Unauthorized');
      err.status = 403;
      throw err;
    }
    return {
      actor: { role: 'expert', expertId: booking.expert_id },
      writeClient: expertAccess.getWriteClientForExpert(access),
    };
  }

  async #resolveInstitutionActor(req, bookingId) {
    const booking = await this.#loadBooking(bookingId);
    const institutionId = booking.institution_id || booking.projects?.institution_id;
    if (!institutionId) {
      const err = new Error('Booking has no institution');
      err.status = 400;
      throw err;
    }
    const access = await institutionAccess.resolveInstitutionAccess(req, institutionId);
    if (!access) {
      const err = new Error('Unauthorized');
      err.status = 403;
      throw err;
    }
    return {
      actor: { role: 'institution', institutionId },
      writeClient: institutionAccess.getWriteClientForInstitution(access),
    };
  }

  #sendError(res, err) {
    const status = err.status || 500;
    if (status >= 500) {
      console.error('BookingCompletionController error:', err);
    }
    const payload = { error: err.message || 'Request failed' };
    if (err.extra && typeof err.extra === 'object') {
      Object.assign(payload, err.extra);
    }
    res.status(status).json(payload);
  }
}

module.exports = BookingCompletionController;
