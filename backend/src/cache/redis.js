/**
 * Redis cache client using ioredis
 * Falls back gracefully if Redis is not available (for local dev without Redis)
 */

import Redis from 'ioredis';

let client = null;
let available = false;

export function connectRedis() {
  try {
    client = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        if (times > 3) return null; // stop retrying
        return Math.min(times * 200, 2000);
      },
    });

    client.on('connect', () => {
      available = true;
      console.log('[Redis] Connected');
    });

    client.on('error', (err) => {
      available = false;
      // Don't crash — just log. App runs without cache.
      console.warn('[Redis] Unavailable, running without cache:', err.message);
    });

    client.connect().catch(() => {
      available = false;
      console.warn('[Redis] Could not connect. Continuing without cache.');
    });
  } catch (err) {
    available = false;
    console.warn('[Redis] Init failed:', err.message);
  }
}

/**
 * Get a cached value. Returns null if cache miss or Redis unavailable.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
export async function cacheGet(key) {
  if (!available || !client) return null;
  try {
    const val = await client.get(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with TTL in seconds.
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds
 */
export async function cacheSet(key, value, ttlSeconds) {
  if (!available || !client) return;
  try {
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // silent — cache failure must never crash the app
  }
}

export const TTL = {
  LIVE: 5 * 60,          // 5 minutes — current AQI readings
  HISTORICAL: 60 * 60,   // 1 hour   — trend data
  STATIONS: 24 * 60 * 60, // 24 hours — station metadata
};
