const { createAnonClient, createServiceClient } = require('../../config/supabase');

class InternshipsRepository {
  getAnonClient(token) {
    return createAnonClient(token);
  }

  getServiceClient() {
    return createServiceClient();
  }
}

module.exports = InternshipsRepository;
