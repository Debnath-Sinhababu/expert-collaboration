const express = require('express');
const asyncHandler = require('../../shared/http/asyncHandler');
const BookingCompletionController = require('./bookingCompletion.controller');

function createBookingCompletionRouter() {
  const router = express.Router({ mergeParams: true });
  const controller = new BookingCompletionController();

  router.post('/:id/request-completion', asyncHandler(controller.requestCompletion));
  router.post('/:id/approve-completion', asyncHandler(controller.approveCompletion));
  router.post('/:id/decline-completion', asyncHandler(controller.declineCompletion));

  return router;
}

module.exports = { createBookingCompletionRouter };
