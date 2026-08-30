class ApplicationRateRepository {
  constructor(serviceClient) {
    this.db = serviceClient;
  }

  async getApplicationWithProject(applicationId) {
    const { data, error } = await this.db
      .from('applications')
      .select(`
        *,
        projects (
          id,
          institution_id,
          title,
          type,
          compensation_unit,
          unit_quantity,
          duration_per_unit,
          hours_per_day,
          institution_gross_per_unit,
          institution_gross_total,
          hourly_rate,
          total_budget,
          duration_hours,
          start_date,
          end_date,
          margin_percent
        ),
        experts (
          id,
          name,
          user_id,
          email,
          hourly_rate
        )
      `)
      .eq('id', applicationId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  async updateApplication(applicationId, patch, writeClient) {
    const client = writeClient || this.db;
    const { data, error } = await client
      .from('applications')
      .update(patch)
      .eq('id', applicationId)
      .select(`
        *,
        projects (
          id,
          institution_id,
          title,
          compensation_unit,
          unit_quantity,
          duration_per_unit,
          hours_per_day,
          institution_gross_per_unit,
          institution_gross_total,
          hourly_rate,
          total_budget,
          duration_hours,
          start_date,
          end_date,
          margin_percent
        ),
        experts ( id, name, hourly_rate )
      `)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  /**
   * Latest booking for an application that has not been cancelled.
   * Used to avoid creating a duplicate booking when confirm & lock runs twice
   * (e.g. a repeated "Onboard" click) — a re-onboard after a decline is still
   * allowed because the superseded booking is cancelled.
   */
  async findLiveBookingByApplicationId(applicationId, writeClient) {
    if (!applicationId) return null;
    const client = writeClient || this.db;
    const { data, error } = await client
      .from('bookings')
      .select('*')
      .eq('application_id', applicationId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(1);
    if (error) throw error;
    return (data && data[0]) || null;
  }

  async createBooking(payload, writeClient) {
    const client = writeClient || this.db;
    const { data, error } = await client
      .from('bookings')
      .insert([payload])
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  }
}

module.exports = ApplicationRateRepository;
