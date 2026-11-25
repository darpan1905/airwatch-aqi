/**
 * GET /api/trends?lat=&lon=&window=h24|d7|d30
 *
 * Returns historical AQI readings + trend analysis for the requested window
 * Cached for 1 hour
 */

import { fetchHistoricalAirQuality } from '../services/openmeteo.js';
import { calculateAQI } from '../services/aqiCalculator.js';
import { buildTrendWindows, trendSummary } from '../services/trendEngine.js';
import { cacheGet, cacheSet, TTL } from '../cache/redis.js';
import { TrendsQuery } from '../schemas/index.js';

export default async function trendsRoutes(fastify) {
  fastify.get('/trends', async (request, reply) => {
    const parsed = TrendsQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { lat, lon, window } = parsed.data;
    const cacheKey = `trends:${lat.toFixed(2)}:${lon.toFixed(2)}`;

    const cached = await cacheGet(cacheKey);
    if (cached) {
      return reply.send({ ...cached, window, cached: true });
    }

    try {
      // Fetch 30 days — we'll slice per window client-side from the response
      const { hourly } = await fetchHistoricalAirQuality(lat, lon, 30);

      // Calculate AQI for each hourly reading
      // O3 excluded — Indian CPCB requires 8h average, not instantaneous hourly value
      const aqiReadings = hourly
        .filter((r) => r.pm25 != null || r.pm10 != null)
        .map((r) => ({
          timestamp: r.timestamp,
          aqi: calculateAQI({
            pm25: r.pm25,
            pm10: r.pm10,
            no2: r.no2,
            co: r.co,
            // o3 excluded intentionally — needs 8h rolling average
          }).aqi,
          pm25: r.pm25,
          pm10: r.pm10,
          no2: r.no2,
          o3: r.o3,
        }))
        .filter((r) => r.aqi > 0);

      const windows = buildTrendWindows(aqiReadings);

      const response = {
        readings: aqiReadings,
        windows: {
          h24: {
            ...windows.h24,
            summaryEn: trendSummary(windows.h24, 'en'),
            summaryHi: trendSummary(windows.h24, 'hi'),
            summaryMr: trendSummary(windows.h24, 'mr'),
          },
          d7: {
            ...windows.d7,
            summaryEn: trendSummary(windows.d7, 'en'),
            summaryHi: trendSummary(windows.d7, 'hi'),
            summaryMr: trendSummary(windows.d7, 'mr'),
          },
          d30: {
            ...windows.d30,
            summaryEn: trendSummary(windows.d30, 'en'),
            summaryHi: trendSummary(windows.d30, 'hi'),
            summaryMr: trendSummary(windows.d30, 'mr'),
          },
        },
        location: { lat, lon },
        cached: false,
      };

      await cacheSet(cacheKey, response, TTL.HISTORICAL);
      return reply.send({ ...response, window });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(502).send({ error: 'Failed to fetch trend data', message: err.message });
    }
  });
}
