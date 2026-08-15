const { createAnonClient } = require('../../config/supabase');

class AuthRepository {
  getClient() {
    return createAnonClient();
  }

  /** Lightweight connectivity probe used by /api/health */
  async pingExperts() {
    const { error } = await this.getClient()
      .from('experts')
      .select('id')
      .limit(1);
    if (error) throw error;
    return true;
  }
}

module.exports = AuthRepository;
