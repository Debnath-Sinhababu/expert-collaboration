function parseBooleanBody(value) {
  return value === true || value === 'true' || value === '1' || value === 'yes';
}

module.exports = {
  parseBooleanBody,
};
