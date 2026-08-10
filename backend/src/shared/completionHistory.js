/**
 * Shared helpers for booking completion conversation history.
 */

function appendCompletionHistory(existing, entry) {
  const list = Array.isArray(existing) ? existing.slice() : [];
  list.push({
    at: new Date().toISOString(),
    ...entry,
  });
  return list.slice(-40);
}

module.exports = {
  appendCompletionHistory,
};
