const express = require('express');
const asyncHandler = require('../../shared/http/asyncHandler');
const upload = require('../../../middleware/upload');
const BookingsController = require('./bookings.controller');
const BookingCompletionController = require('./bookingCompletion.controller');

/**
 * Combined bookings router: CRUD + completion/cancellation/agreement.
 * Specific /:id/* action routes must stay before PUT/DELETE /:id.
 * Attendance stays on app via registerTrainingAttendanceRoutes (full paths).
 */
function createBookingsRouter() {
  const router = express.Router({ mergeParams: true });
  const controller = new BookingsController();
  const completion = new BookingCompletionController();

  router.get('/', asyncHandler(controller.list));
  router.get('/counts', asyncHandler(controller.counts));
  router.post('/', asyncHandler(controller.create));

  router.post('/:id/request-completion', asyncHandler(completion.requestCompletion));
  router.post('/:id/approve-completion', asyncHandler(completion.approveCompletion));
  router.post('/:id/decline-completion', asyncHandler(completion.declineCompletion));
  router.post('/:id/request-cancellation', asyncHandler(completion.requestCancellation));
  router.post('/:id/approve-cancellation', asyncHandler(completion.approveCancellation));
  router.post('/:id/decline-cancellation', asyncHandler(completion.declineCancellation));
  router.post(
    '/:id/agreement-pdf',
    upload.single('agreement_pdf'),
    asyncHandler(completion.uploadAgreementPdf),
  );

  router.put('/:id', asyncHandler(controller.update));
  router.delete('/:id', asyncHandler(controller.remove));

  return router;
}

/** @deprecated Prefer createBookingsRouter — kept for callers that only need completion routes. */
function createBookingCompletionRouter() {
  const router = express.Router({ mergeParams: true });
  const completion = new BookingCompletionController();

  router.post('/:id/request-completion', asyncHandler(completion.requestCompletion));
  router.post('/:id/approve-completion', asyncHandler(completion.approveCompletion));
  router.post('/:id/decline-completion', asyncHandler(completion.declineCompletion));
  router.post('/:id/request-cancellation', asyncHandler(completion.requestCancellation));
  router.post('/:id/approve-cancellation', asyncHandler(completion.approveCancellation));
  router.post('/:id/decline-cancellation', asyncHandler(completion.declineCancellation));
  router.post(
    '/:id/agreement-pdf',
    upload.single('agreement_pdf'),
    asyncHandler(completion.uploadAgreementPdf),
  );

  return router;
}

module.exports = {
  createBookingsRouter,
  createBookingCompletionRouter,
};
