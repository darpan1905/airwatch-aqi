/**
 * POST /api/alerts/register   — register device for push alerts
 * DELETE /api/alerts/register — unregister device
 * GET  /api/alerts/check      — check if current AQI exceeds stored thresholds (cron-friendly)
 *
 * Alert preferences are stored in Redis (no DB needed for hackathon).
 * Key: alert:{deviceToken}  Value: { lat, lon, threshold, locationName, registeredAt }
 */

import { fetchAirQuality } from '../services/openmeteo.js';
import { calculateAQI } from '../services/aqiCalculator.js';
import { cacheGet, cacheSet } from '../cache/redis.js';
import { AlertBody } from '../schemas/index.js';

const ALERT_TTL = 90 * 24 * 60 * 60; // 90 days

export default async function alertsRoutes(fastify) {
  // Register alert preference
  fastify.post('/alerts/register', async (request, reply) => {
    const parsed = AlertBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid alert configuration',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { deviceToken, lat, lon, threshold, locationName } = parsed.data;
    const alertKey = `alert:${deviceToken}`;

    const alertConfig = {
      deviceToken,
      lat,
      lon,
      threshold,
      locationName: locationName || `${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      registeredAt: new Date().toISOString(),
      lastNotifiedAqi: null,
    };

    await cacheSet(alertKey, alertConfig, ALERT_TTL);

    return reply.code(201).send({
      success: true,
      message: 'Alert registered successfully',
      config: alertConfig,
    });
  });

  // Unregister alert
  fastify.delete('/alerts/register', async (request, reply) => {
    const { deviceToken } = request.query;
    if (!deviceToken) {
      return reply.code(400).send({ error: 'deviceToken is required' });
    }
    // Set TTL to 1 second to effectively delete
    await cacheSet(`alert:${deviceToken}`, null, 1);
    return reply.send({ success: true, message: 'Alert unregistered' });
  });

  // Check current AQI against a threshold (called by app on foreground resume)
  fastify.get('/alerts/check', async (request, reply) => {
    const { lat, lon, threshold } = request.query;

    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const thresholdNum = parseFloat(threshold) || 150;

    if (isNaN(latNum) || isNaN(lonNum)) {
      return reply.code(400).send({ error: 'lat and lon are required' });
    }

    try {
      const { current } = await fetchAirQuality(latNum, lonNum);
      const aqiResult = calculateAQI({
        pm25: current.pm25,
        pm10: current.pm10,
        no2: current.no2,
        o3: current.o3,
        co: current.co,
      });

      const exceeded = aqiResult.aqi >= thresholdNum;

      return reply.send({
        aqi: aqiResult.aqi,
        threshold: thresholdNum,
        exceeded,
        category: aqiResult.category,
        guidance: aqiResult.guidance,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(502).send({ error: 'Failed to check AQI', message: err.message });
    }
  });
}
