function parseDeclineBody(body = {}) {
  const reason = body.reason != null ? String(body.reason).trim() : '';
  return { reason };
}

module.exports = { parseDeclineBody };
