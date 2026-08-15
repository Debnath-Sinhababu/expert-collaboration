function normalizeInterviewAvailability(value) {
  if (value == null || value === '') return [];
  let parsed = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((slot) => {
      if (!slot || typeof slot !== 'object') return null;
      const start = slot.start_at || slot.startAt || slot.start;
      const end = slot.end_at || slot.endAt || slot.end;
      if (!start || !end) return null;
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
      if (endDate <= startDate) return null;
      return {
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
      };
    })
    .filter(Boolean)
    .slice(0, 3);
}

module.exports = {
  normalizeInterviewAvailability,
};
