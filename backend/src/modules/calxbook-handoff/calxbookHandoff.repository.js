const { getCompletedTrainingsCountForExpert } = require('../../shared/completedTrainingsCount');

class CalxbookHandoffRepository {
  constructor(serviceClient) {
    this.db = serviceClient;
  }

  /** Reuses the same counting logic as `/api/calxbook/experts` so the two never drift. */
  async getCompletedTrainingsCount(expertId) {
    return getCompletedTrainingsCountForExpert(this.db, expertId);
  }

  async markMentorLinked(expertId, writeClient) {
    const client = writeClient || this.db;
    const { data, error } = await client
      .from('experts')
      .update({ calxbook_mentor_linked_at: new Date().toISOString() })
      .eq('id', expertId)
      .select('id, calxbook_mentor_linked_at')
      .maybeSingle();
    if (error) throw error;
    return data;
  }
}

module.exports = CalxbookHandoffRepository;
