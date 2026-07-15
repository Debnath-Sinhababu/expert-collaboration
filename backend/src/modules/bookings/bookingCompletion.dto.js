function parseOptionalNote(value) {
  if (value == null) return null;
  const note = String(value).trim();
  return note.length ? note : null;
}

function parseCompletionBody(body = {}) {
  return {
    note: parseOptionalNote(body.note),
    acknowledge_low_attendance:
      body.acknowledge_low_attendance === true || body.acknowledge_low_attendance === 'true',
  };
}

module.exports = {
  parseOptionalNote,
  parseCompletionBody,
};
