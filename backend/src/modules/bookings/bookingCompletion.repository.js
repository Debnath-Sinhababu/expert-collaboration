class BookingCompletionRepository {
  constructor(serviceClient) {
    this.db = serviceClient;
  }

  async getBooking(bookingId) {
    const { data, error } = await this.db
      .from('bookings')
      .select(
        `
        id,
        status,
        expert_id,
        institution_id,
        project_id,
        application_id,
        hours_booked,
        amount,
        completion_note,
        completion_requested_at,
        completion_decision_note,
        completion_decided_at,
        completion_history,
        cancellation_note,
        cancellation_requested_at,
        projects ( id, title, type, duration_hours, institution_id )
      `
      )
      .eq('id', bookingId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async updateBooking(bookingId, patch, writeClient) {
    const client = writeClient || this.db;
    const { data, error } = await client
      .from('bookings')
      .update(patch)
      .eq('id', bookingId)
      .select(
        `
        *,
        projects ( id, title, type ),
        experts ( id, name, email, user_id ),
        institutions ( id, name )
      `
      )
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async getApprovedAttendanceHours(bookingId) {
    const { data, error } = await this.db
      .from('training_attendance_days')
      .select(
        'status, effective_entry_at, effective_exit_at, expert_entry_at, expert_exit_at'
      )
      .eq('booking_id', bookingId);
    if (error) {
      console.warn('getApprovedAttendanceHours:', error.message);
      return 0;
    }

    let totalMinutes = 0;
    for (const day of data || []) {
      if (String(day.status || '').toLowerCase() !== 'approved') continue;
      const entry = day.effective_entry_at || day.expert_entry_at;
      const exit = day.effective_exit_at || day.expert_exit_at;
      if (!entry || !exit) continue;
      const ms = new Date(exit).getTime() - new Date(entry).getTime();
      if (ms > 0) totalMinutes += ms / 60000;
    }
    return Math.round((totalMinutes / 60) * 100) / 100;
  }
}

module.exports = BookingCompletionRepository;
