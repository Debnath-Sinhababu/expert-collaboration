/** Placeholder DTO helpers for future validation extractions from handlers. */
function parseListQuery(query = {}) {
  return {
    page: query.page || 1,
    limit: query.limit || 10,
    search: query.search || '',
    subskill_search: query.subskill_search || '',
    domain_expertise: query.domain_expertise || '',
    expert_type: query.expert_type || '',
    expert_service: query.expert_service || '',
  };
}

module.exports = {
  parseListQuery,
};
