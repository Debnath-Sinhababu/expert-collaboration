class OnboardingRepository {
  constructor(serviceClient) {
    this.db = serviceClient;
  }

  #detailSelect() {
    return `
      *,
      applications ( id, status, final_gross_per_unit, final_net_per_unit, compensation_unit, unit_quantity ),
      projects ( id, title, type, start_date, end_date, compensation_unit ),
      experts ( id, name, email, user_id, hourly_rate ),
      institutions ( id, name, email, user_id, city, state )
    `;
  }

  async findActiveByApplicationId(applicationId) {
    const { data, error } = await this.db
      .from('onboarding_requests')
      .select('*')
      .eq('application_id', applicationId)
      .in('status', ['pending_review', 'offer_sent', 'accepted'])
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async create(payload) {
    const { data, error } = await this.db
      .from('onboarding_requests')
      .insert([payload])
      .select(this.#detailSelect())
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async getById(id) {
    const { data, error } = await this.db
      .from('onboarding_requests')
      .select(this.#detailSelect())
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async list({ status, institutionId, expertId, applicationId } = {}) {
    let query = this.db.from('onboarding_requests').select(this.#detailSelect()).order('submitted_at', { ascending: false });
    if (status) query = query.eq('status', status);
    if (institutionId) query = query.eq('institution_id', institutionId);
    if (expertId) query = query.eq('expert_id', expertId);
    if (applicationId) query = query.eq('application_id', applicationId);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async listExpiredOfferSent(nowIso) {
    const { data, error } = await this.db
      .from('onboarding_requests')
      .select(this.#detailSelect())
      .eq('status', 'offer_sent')
      .lt('offer_expires_at', nowIso);
    if (error) throw error;
    return data || [];
  }

  async cancelBooking(bookingId) {
    if (!bookingId) return null;
    const { data, error } = await this.db
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId)
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async update(id, patch) {
    const { data, error } = await this.db
      .from('onboarding_requests')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(this.#detailSelect())
      .maybeSingle();
    if (error) throw error;
    return data;
  }
}

module.exports = OnboardingRepository;
