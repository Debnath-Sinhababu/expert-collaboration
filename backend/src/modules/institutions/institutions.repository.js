const { createAnonClient } = require('../../config/supabase');
const superAdminAuth = require('../../../auth/superAdminAuth');

class InstitutionsRepository {
  getDefaultClient() {
    return createAnonClient();
  }

  getServiceClient() {
    return superAdminAuth.getServiceClient();
  }

  getAuthedClient(token) {
    return createAnonClient(token);
  }

  async resolveReadClient(req) {
    const { role, token } = await superAdminAuth.getUserRoleFromRequest(req);
    if (role === 'super_admin') return this.getServiceClient();
    if (token) return this.getAuthedClient(token);
    return this.getDefaultClient();
  }

  async list(client, { offset, limit, search, type, exclude_type }) {
    let query = client
      .from('institutions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`);
    }
    if (type) query = query.eq('type', type);
    if (exclude_type) query = query.neq('type', exclude_type);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async findById(client, id) {
    const { data, error } = await client
      .from('institutions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data || null;
  }

  async findByUserId(userId) {
    const { data, error } = await this.getDefaultClient()
      .from('institutions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data || null;
  }

  async findIdByEmail(client, email) {
    const { data, error } = await client
      .from('institutions')
      .select('id')
      .eq('email', email)
      .limit(1);
    if (error) throw error;
    return data?.[0] || null;
  }

  async insert(client, institutionData) {
    const { data, error } = await client
      .from('institutions')
      .insert([institutionData])
      .select();
    if (error) throw error;
    return data?.[0] || null;
  }

  async update(client, id, updateData) {
    const { data, error } = await client
      .from('institutions')
      .update(updateData)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data || [];
  }
}

module.exports = InstitutionsRepository;
