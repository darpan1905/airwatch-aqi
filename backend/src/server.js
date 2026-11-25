/**
 * AQI Dashboard — Fastify Server
 * Node.js 20 + Fastify v4 + Zod + ioredis
 */

import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

import { connectRedis } from './cache/redis.js';
import aqiRoutes from './routes/aqi.js';
import trendsRoutes from './routes/trends.js';
import stationsRoutes from './routes/stations.js';
import alertsRoutes from './routes/alerts.js';

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
    },
  },
});

// ── Plugins ─────────────────────────────────────────────────────────────────

await fastify.register(helmet, { contentSecurityPolicy: false });

await fastify.register(cors, {
  origin: '*', // tighten for production
  methods: ['GET', 'POST', 'DELETE'],
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// ── Health check ────────────────────────────────────────────────────────────

fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
}));

// ── API routes ───────────────────────────────────────────────────────────────

fastify.register(aqiRoutes, { prefix: '/api' });
fastify.register(trendsRoutes, { prefix: '/api' });
fastify.register(stationsRoutes, { prefix: '/api' });
fastify.register(alertsRoutes, { prefix: '/api' });

// ── Global error handler ─────────────────────────────────────────────────────

fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.code(error.statusCode || 500).send({
    error: error.message || 'Internal server error',
    code: error.code || 'INTERNAL_ERROR',
  });
});

// ── Start ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3000');
const HOST = process.env.HOST || '0.0.0.0';

connectRedis();

try {
  await fastify.listen({ port: PORT, host: HOST });
  console.log(`\n🌿 AQI Backend running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   AQI:    http://localhost:${PORT}/api/aqi?lat=19.07&lon=72.87`);
  console.log(`   Trends: http://localhost:${PORT}/api/trends?lat=19.07&lon=72.87&window=d7`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
