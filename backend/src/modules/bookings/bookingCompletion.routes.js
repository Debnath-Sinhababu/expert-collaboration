const express = require('express');
const asyncHandler = require('../../shared/http/asyncHandler');
const BookingCompletionController = require('./bookingCompletion.controller');

function createBookingCompletionRouter() {
  const router = express.Router({ mergeParams: true });
  const controller = new BookingCompletionController();

  router.post('/:id/request-completion', asyncHandler(controller.requestCompletion));
  router.post('/:id/approve-completion', asyncHandler(controller.approveCompletion));
  router.post('/:id/decline-completion', asyncHandler(controller.declineCompletion));
  router.post('/:id/request-cancellation', asyncHandler(controller.requestCancellation));
  router.post('/:id/approve-cancellation', asyncHandler(controller.approveCancellation));
  router.post('/:id/decline-cancellation', asyncHandler(controller.declineCancellation));

  return router;
}

module.exports = { createBookingCompletionRouter };
