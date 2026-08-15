function parseRegisterBody(body = {}) {
  return {
    email: body.email,
    password: body.password,
    role: body.role,
  };
}

function parseTokenBody(body = {}) {
  return {
    token: body.token != null ? String(body.token) : '',
  };
}

function parseForgotPasswordBody(body = {}) {
  return {
    email: body.email != null ? String(body.email).trim() : '',
  };
}

function parsePasswordResetConfirmBody(body = {}) {
  return {
    token: body.token != null ? String(body.token) : '',
    password: body.password != null ? String(body.password) : '',
  };
}

module.exports = {
  parseRegisterBody,
  parseTokenBody,
  parseForgotPasswordBody,
  parsePasswordResetConfirmBody,
};
