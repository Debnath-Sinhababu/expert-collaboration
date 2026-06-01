const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { createClient: createRedisClient } = require('redis');

const EMAIL_TOKEN_TTL_MINUTES = Math.max(
  5,
  Number.parseInt(process.env.EMAIL_TOKEN_TTL_MINUTES || '15', 10) || 15,
);
const EMAIL_TOKEN_TTL_SECONDS = EMAIL_TOKEN_TTL_MINUTES * 60;
const EMAIL_TOKEN_SECRET =
  process.env.EMAIL_TOKEN_SECRET ||
  process.env.JWT_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'development-email-token-secret';

const AUTH_ROLES = new Set(['expert', 'institution', 'student']);

let serviceClient = null;
let redisClient = null;
const memoryStore = new Map();

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeRole(value) {
  const role = String(value || '').trim().toLowerCase();
  return AUTH_ROLES.has(role) ? role : 'expert';
}

function getServiceClient() {
  if (serviceClient) return serviceClient;
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase service credentials are not configured');
  }
  serviceClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  return serviceClient;
}

async function getRedisClient() {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL || process.env.LOCAL_REDIS_URL;
  if (!redisUrl) return null;

  redisClient = createRedisClient({ url: redisUrl });
  redisClient.on('error', (error) => {
    console.error('Redis error in authEmailService:', error);
  });

  try {
    await redisClient.connect();
    return redisClient;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('Redis connection failed for auth token storage, falling back to in-memory storage:', errorMessage);
    redisClient = null;
    return null;
  }
}

function nowMs() {
  return Date.now();
}

function generatePlainToken() {
  return crypto.randomBytes(48).toString('hex');
}

function hashToken(plainToken) {
  return crypto.createHmac('sha256', EMAIL_TOKEN_SECRET).update(plainToken).digest('hex');
}

async function redisGet(key) {
  const client = await getRedisClient();
  if (client) return client.get(key);

  const record = memoryStore.get(key);
  if (!record) return null;
  if (record.expiresAt <= nowMs()) {
    memoryStore.delete(key);
    return null;
  }
  return record.value;
}

async function redisSetEx(key, ttlSeconds, value) {
  const client = await getRedisClient();
  if (client) {
    await client.setEx(key, ttlSeconds, value);
    return;
  }
  memoryStore.set(key, {
    value,
    expiresAt: nowMs() + ttlSeconds * 1000,
  });
}

async function redisDel(key) {
  const client = await getRedisClient();
  if (client) {
    await client.del(key);
    return;
  }
  memoryStore.delete(key);
}

function brevoSender() {
  const fromEmail =
    process.env.BREVO_FROM_EMAIL ||
    process.env.BREVO_FROM_EMAI ||
    process.env.SENDGRID_FROM_EMAIL ||
    process.env.EMAIL_USER ||
    'noreply@example.com';

  const fromName =
    process.env.BREVO_FROM_NAME ||
    process.env.SENDGRID_FROM_NAME ||
    'Expert Collaboration';

  return {
    email: fromEmail,
    name: fromName,
  };
}

async function sendBrevoEmail({ to, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error('BREVO_API_KEY is not configured');
  }

  const sender = brevoSender();
  if (!sender.email || sender.email === 'noreply@example.com') {
    throw new Error('BREVO_FROM_EMAIL (or BREVO_FROM_EMAI/EMAIL_USER fallback) is not configured');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: normalizeEmail(to) }],
      subject,
      textContent: text,
      ...(html ? { htmlContent: html } : {}),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    console.error('Brevo email send failed', {
      status: response.status,
      statusText: response.statusText,
      sender: sender.email,
      to: normalizeEmail(to),
      subject,
      errorBody,
    });
    throw new Error(`Brevo email send failed (${response.status}): ${errorBody || response.statusText}`);
  }

  const result = await response.json().catch(() => ({}));
  console.log('Brevo email sent', {
    sender: sender.email,
    to: normalizeEmail(to),
    subject,
    messageId: result?.messageId || result?.message_id || null,
  });
  return result;
}

function makeEmailLink(pathname, token) {
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
  const url = new URL(pathname, frontendBase);
  url.searchParams.set('token', token);
  return url.toString();
}

async function findAuthUserByEmail(service, email) {
  const target = normalizeEmail(email);
  let page = 1;
  const perPage = 1000;

  while (page <= 20) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    const match = users.find((user) => normalizeEmail(user.email) === target);
    if (match) return match;
    if (users.length < perPage) break;
    page += 1;
  }

  return null;
}

async function storeTokenForUser(userId, type, plainToken, meta = {}) {
  const tokenHash = hashToken(plainToken);
  const userKey = `auth:token:${type}:${userId}`;
  const lookupKey = `auth:token:lookup:${tokenHash}`;

  const previous = await redisGet(userKey);
  if (previous) {
    try {
      const parsed = JSON.parse(previous);
      if (parsed?.tokenHash) {
        await redisDel(`auth:token:lookup:${parsed.tokenHash}`);
      }
    } catch {
      // ignore malformed cached values
    }
  }

  const stored = JSON.stringify({
    tokenHash,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(nowMs() + EMAIL_TOKEN_TTL_SECONDS * 1000).toISOString(),
    meta,
  });

  await redisSetEx(userKey, EMAIL_TOKEN_TTL_SECONDS, stored);
  await redisSetEx(lookupKey, EMAIL_TOKEN_TTL_SECONDS, `${userId}|${type}`);
}

async function verifyAndConsumeToken(plainToken, expectedType) {
  const tokenHash = hashToken(plainToken);
  const lookupKey = `auth:token:lookup:${tokenHash}`;
  const lookupValue = await redisGet(lookupKey);
  if (!lookupValue) return null;

  const [userId, tokenType] = String(lookupValue).split('|');
  if (!userId || tokenType !== expectedType) return null;

  const userKey = `auth:token:${tokenType}:${userId}`;
  const stored = await redisGet(userKey);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    if (parsed?.tokenHash !== tokenHash) return null;
  } catch {
    return null;
  }

  await redisDel(lookupKey);
  await redisDel(userKey);
  return userId;
}

async function createOrRefreshAuthUser({ email, password, role }) {
  const service = getServiceClient();
  const normalizedEmail = normalizeEmail(email);
  const normalizedRole = normalizeRole(role);

  if (!normalizedEmail) {
    throw new Error('Email is required');
  }
  if (!password || String(password).trim().length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  const existing = await findAuthUserByEmail(service, normalizedEmail);
  if (existing?.email_confirmed_at) {
    const error = new Error('An account with this email already exists');
    error.code = 'AUTH_USER_EXISTS';
    error.statusCode = 409;
    throw error;
  }

  let user = existing;
  let created = false;

  if (user?.id) {
    const { data, error } = await service.auth.admin.updateUserById(user.id, {
      password: String(password),
      user_metadata: {
        ...(user.user_metadata || {}),
        role: normalizedRole,
      },
    });
    if (error) throw error;
    user = data?.user || user;
  } else {
    const { data, error } = await service.auth.admin.createUser({
      email: normalizedEmail,
      password: String(password),
      email_confirm: false,
      user_metadata: {
        role: normalizedRole,
      },
    });
    if (error) throw error;
    if (!data?.user?.id) {
      throw new Error('Auth user creation failed');
    }
    user = data.user;
    created = true;
  }

  const plainToken = generatePlainToken();
  await storeTokenForUser(user.id, 'email_confirm', plainToken, {
    email: normalizedEmail,
    role: normalizedRole,
  });

  const confirmUrl = makeEmailLink('/confirmemail', plainToken);
  await sendBrevoEmail({
    to: normalizedEmail,
    subject: 'Confirm your email',
    text: `Confirm your email by opening this link: ${confirmUrl}\nThis link expires in ${EMAIL_TOKEN_TTL_MINUTES} minutes.`,
    html: `<p>Confirm your email by opening the link below.</p><p><a href="${confirmUrl}">Confirm email</a></p><p>This link expires in ${EMAIL_TOKEN_TTL_MINUTES} minutes.</p>`,
  });

  return {
    userId: user.id,
    email: normalizedEmail,
    role: normalizedRole,
    created,
    needsEmailVerification: true,
  };
}

async function confirmEmailByToken(token) {
  const service = getServiceClient();
  const userId = await verifyAndConsumeToken(token, 'email_confirm');
  if (!userId) {
    const error = new Error('This confirmation link is invalid or has expired. Request a new signup email.');
    error.code = 'EMAIL_CONFIRM_INVALID';
    error.statusCode = 400;
    throw error;
  }

  const { data, error } = await service.auth.admin.updateUserById(userId, {
    email_confirm: true,
  });
  if (error) throw error;

  return {
    userId,
    email: data?.user?.email || null,
    confirmed: true,
  };
}

async function requestPasswordReset(email) {
  const service = getServiceClient();
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  const user = await findAuthUserByEmail(service, normalizedEmail);
  if (!user?.id) {
    return { ok: true, email: normalizedEmail, sent: false };
  }

  if (!user.email_confirmed_at) {
    const plainToken = generatePlainToken();
    await storeTokenForUser(user.id, 'email_confirm', plainToken, { email: normalizedEmail, resend: true });
    const confirmUrl = makeEmailLink('/confirmemail', plainToken);
    await sendBrevoEmail({
      to: normalizedEmail,
      subject: 'Confirm your email',
      text: `Confirm your email by opening this link: ${confirmUrl}\nThis link expires in ${EMAIL_TOKEN_TTL_MINUTES} minutes.`,
      html: `<p>Confirm your email by opening the link below.</p><p><a href="${confirmUrl}">Confirm email</a></p><p>This link expires in ${EMAIL_TOKEN_TTL_MINUTES} minutes.</p>`,
    });
    return { ok: true, email: normalizedEmail, sent: true, verificationResent: true };
  }

  const plainToken = generatePlainToken();
  await storeTokenForUser(user.id, 'password_reset', plainToken, { email: normalizedEmail });
  const resetUrl = makeEmailLink('/auth/reset-password', plainToken);
  await sendBrevoEmail({
    to: normalizedEmail,
    subject: 'Reset your password',
    text: `Reset your password by opening this link: ${resetUrl}\nThis link expires in ${EMAIL_TOKEN_TTL_MINUTES} minutes. If you did not request this, ignore this email.`,
    html: `<p>Reset your password by opening the link below.</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires in ${EMAIL_TOKEN_TTL_MINUTES} minutes.</p>`,
  });

  return { ok: true, email: normalizedEmail, sent: true };
}

async function confirmPasswordReset(token, password) {
  const service = getServiceClient();
  if (!password || String(password).trim().length < 8) {
    const error = new Error('Password must be at least 8 characters');
    error.code = 'PASSWORD_TOO_SHORT';
    error.statusCode = 400;
    throw error;
  }

  const userId = await verifyAndConsumeToken(token, 'password_reset');
  if (!userId) {
    const error = new Error('This reset link is invalid or has expired. Request a new password reset.');
    error.code = 'PASSWORD_RESET_INVALID';
    error.statusCode = 400;
    throw error;
  }

  const { error } = await service.auth.admin.updateUserById(userId, {
    password: String(password),
  });
  if (error) throw error;

  return { ok: true, userId };
}

module.exports = {
  EMAIL_TOKEN_TTL_MINUTES,
  confirmEmailByToken,
  confirmPasswordReset,
  createOrRefreshAuthUser,
  generatePlainToken,
  normalizeEmail,
  requestPasswordReset,
  verifyAndConsumeToken,
};
