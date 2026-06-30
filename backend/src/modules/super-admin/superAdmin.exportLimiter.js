const { createClient } = require('redis');
const { Redis } = require('@upstash/redis');

const WINDOW_SECONDS = 60 * 60;
const MAX_EXPORTS = 5;
const memoryHits = new Map();
let redisClient = null;
let redisReady = false;

async function getRedisClient() {
  if (redisClient) return redisClient;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    redisReady = true;
    return redisClient;
  }
  const redisUrl = process.env.REDIS_URL || process.env.LOCAL_REDIS_URL;
  if (!redisUrl) return null;
  const client = createClient({ url: redisUrl });
  client.on('error', (error) => {
    redisReady = false;
    console.warn('Export rate limiter Redis error:', error.message || error);
  });
  await client.connect();
  redisClient = client;
  redisReady = true;
  return redisClient;
}

async function checkExportRateLimit(actorId) {
  const keyActor = actorId || 'unknown';
  const key = `superadmin:exports:${keyActor}`;
  try {
    const client = await getRedisClient();
    if (client && redisReady) {
      if (client instanceof Redis) {
        const count = await client.incr(key);
        if (count === 1) await client.expire(key, WINDOW_SECONDS);
        return { allowed: count <= MAX_EXPORTS, remaining: Math.max(0, MAX_EXPORTS - count), limit: MAX_EXPORTS };
      }
      const count = await client.incr(key);
      if (count === 1) await client.expire(key, WINDOW_SECONDS);
      return { allowed: count <= MAX_EXPORTS, remaining: Math.max(0, MAX_EXPORTS - count), limit: MAX_EXPORTS };
    }
  } catch (error) {
    console.warn('Export rate limiter fallback:', error.message || error);
  }

  const now = Date.now();
  const current = memoryHits.get(key) || [];
  const fresh = current.filter((ts) => now - ts < WINDOW_SECONDS * 1000);
  fresh.push(now);
  memoryHits.set(key, fresh);
  return { allowed: fresh.length <= MAX_EXPORTS, remaining: Math.max(0, MAX_EXPORTS - fresh.length), limit: MAX_EXPORTS };
}

module.exports = {
  checkExportRateLimit,
  MAX_EXPORTS,
  WINDOW_SECONDS,
};
