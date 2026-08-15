const { createAnonClient, createServiceClient } = require('../../config/supabase');

/**
 * Supabase access for experts. Handlers still own most queries during this extract;
 * new code should prefer this repository.
 */
class ExpertsRepository {
  getAnonClient(token) {
    return createAnonClient(token);
  }

  getServiceClient() {
    return createServiceClient();
  }

  async findById(client, id) {
    const { data, error } = await client.from('experts').select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data || null;
  }

  async findByUserId(client, userId) {
    const { data, error } = await client.from('experts').select('*').eq('user_id', userId).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data || null;
  }
}

module.exports = ExpertsRepository;
