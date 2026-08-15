const { createAnonClient, createServiceClient } = require('../../config/supabase');

class BookingsRepository {
  getAnonClient(token) {
    return createAnonClient(token);
  }

  getServiceClient() {
    return createServiceClient();
  }
}

module.exports = BookingsRepository;
