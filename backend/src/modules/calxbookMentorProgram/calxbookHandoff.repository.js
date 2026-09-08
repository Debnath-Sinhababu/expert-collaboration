class CalxbookHandoffRepository {
  constructor(serviceClient) {
    this.db = serviceClient;
  }

  async getExpert(expertId) {
    const { data, error } = await this.db.from('experts').select('*').eq('id', expertId).maybeSingle();
    if (error) throw error;
    return data;
  }

  async markLinked(expertId) {
    const { error } = await this.db
      .from('experts')
      .update({ calxbook_mentor_linked_at: new Date().toISOString() })
      .eq('id', expertId);
    if (error) throw error;
  }
}

module.exports = CalxbookHandoffRepository;
