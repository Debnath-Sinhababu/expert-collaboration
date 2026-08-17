class OnboardingRepository {
  constructor(serviceClient) {
    this.db = serviceClient;
  }

  #detailSelect() {
    return `
      *,
      applications (
        id, status, cover_letter, proposed_rate, applied_at, reviewed_at,
        final_hourly_rate, final_gross_per_unit, final_net_per_unit,
        compensation_unit, unit_quantity, rate_note
      ),
      projects (
        id, title, description, type, start_date, end_date,
        duration_hours, duration_per_unit, hours_per_day, workplace_type,
        required_expertise, domain_expertise, subskills,
        compensation_unit, unit_quantity, hourly_rate, total_budget,
        institution_gross_per_unit, institution_gross_total
      ),
      experts (
        id, name, email, phone, user_id, bio, photo_url, address,
        experience_years, qualifications, domain_expertise,
        hourly_rate, is_verified, kyc_status, rating, total_ratings, linkedin_url
      ),
      institutions (
        id, name, email, phone, user_id, type, description,
        logo_url, website_url, address, city, state, country, contact_person
      )
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

  async rejectApplication(applicationId) {
    if (!applicationId) return null;
    const { data, error } = await this.db
      .from('applications')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', applicationId)
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
