const { createAnonClient, createServiceClient } = require('../../config/supabase');

class ProjectsRepository {
  getAnonClient(token) {
    return createAnonClient(token);
  }

  getServiceClient() {
    return createServiceClient();
  }

  async findById(client, id) {
    const { data, error } = await client.from('projects').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data || null;
  }
}

module.exports = ProjectsRepository;
