const { createAnonClient, createServiceClient } = require('../../config/supabase');

class FreelanceRepository {
  getAnonClient(token) {
    return createAnonClient(token);
  }

  getServiceClient() {
    return createServiceClient();
  }
}

module.exports = FreelanceRepository;
