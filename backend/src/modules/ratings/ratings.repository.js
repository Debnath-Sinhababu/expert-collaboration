const { createAnonClient, createServiceClient } = require('../../config/supabase');

class RatingsRepository {
  getAnonClient(token) {
    return createAnonClient(token);
  }

  getServiceClient() {
    return createServiceClient();
  }
}

module.exports = RatingsRepository;
