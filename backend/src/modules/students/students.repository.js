const { createAnonClient, createServiceClient } = require('../../config/supabase');

class StudentsRepository {
  getAnonClient(token) {
    return createAnonClient(token);
  }

  getServiceClient() {
    return createServiceClient();
  }
}

module.exports = StudentsRepository;
