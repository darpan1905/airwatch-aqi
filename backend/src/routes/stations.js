/**
 * GET /api/stations?lat=&lon=&radius=
 *
 * Returns two distinct layers:
 *
 * 1. VERIFIED MONITORING STATIONS (WAQI/CPCB)
 *    Real physical sensor networks. Live AQI readings.
 *    Shown as solid coloured pins on the map.
 *
 * 2. MODEL GRID (Open-Meteo forecast model)
 *    Atmospheric model output interpolated to a dense grid.
 *    Not physical sensors — forecast/reanalysis data.
 *    Shown as semi-transparent squares on the map.
 *    Grid spacing: ~5km, covering the full radius.
 */

import { fetchNearbyStations } from '../services/waqi.js';
import { fetchAirQuality } from '../services/openmeteo.js';
import { calculateAQI } from '../services/aqiCalculator.js';
import { cacheGet, cacheSet, TTL } from '../cache/redis.js';
import { StationsQuery } from '../schemas/index.js';

function aqiCategory(aqi) {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

function aqiColor(aqi) {
  if (aqi <= 50) return '#00C853';
  if (aqi <= 100) return '#AEEA00';
  if (aqi <= 200) return '#FFD600';
  if (aqi <= 300) return '#FF6D00';
  if (aqi <= 400) return '#D50000';
  return '#6A0000';
}

/**
 * Build a dense grid of points covering the radius.
 * Open-Meteo resolution is ~9km globally so we space points at ~8km
 * to get distinct readings without redundant fetches.
 *
 * @param {number} lat - centre latitude
 * @param {number} lon - centre longitude
 * @param {number} radiusKm - search radius
 * @returns {Array<{lat, lon}>}
 */
function buildDenseGrid(lat, lon, radiusKm) {
  const spacingKm = 8; // ~Open-Meteo native resolution
  const latDelta = spacingKm / 111;           // 1 degree lat ≈ 111km
  const lonDelta = spacingKm / (111 * Math.cos(lat * Math.PI / 180));

  const steps = Math.floor(radiusKm / spacingKm);
  const points = [];

  for (let i = -steps; i <= steps; i++) {
    for (let j = -steps; j <= steps; j++) {
      const pLat = lat + i * latDelta;
      const pLon = lon + j * lonDelta;

      // Only include points within the circular radius
      const distKm = Math.sqrt(
        Math.pow((pLat - lat) * 111, 2) +
        Math.pow((pLon - lon) * 111 * Math.cos(lat * Math.PI / 180), 2)
      );

      if (distKm <= radiusKm && !(i === 0 && j === 0)) {
        points.push({
          lat: parseFloat(pLat.toFixed(3)),
          lon: parseFloat(pLon.toFixed(3)),
          distKm: parseFloat(distKm.toFixed(1)),
        });
      }
    }
  }

  // Sort by distance from centre for logical ordering
  return points.sort((a, b) => a.distKm - b.distKm);
}

/**
 * Fetch Open-Meteo for a grid point and compute Indian AQI.
 * Returns null if fetch fails or AQI is 0.
 */
async function fetchGridPoint(point) {
  try {
    const { current } = await fetchAirQuality(point.lat, point.lon);
    const aqi = calculateAQI({
      pm25: current.pm25,
      pm10: current.pm10,
      no2: current.no2,
      co: current.co,
      so2: current.so2,
    }).aqi;

    if (aqi <= 0) return null;

    return {
      lat: point.lat,
      lon: point.lon,
      distKm: point.distKm,
      aqi,
      pm25: current.pm25 ? parseFloat(current.pm25.toFixed(1)) : null,
      pm10: current.pm10 ? parseFloat(current.pm10.toFixed(1)) : null,
      no2: current.no2 ? parseFloat(current.no2.toFixed(1)) : null,
      timestamp: current.timestamp,
    };
  } catch {
    return null;
  }
}

export default async function stationsRoutes(fastify) {
  fastify.get('/stations', async (request, reply) => {
    const parsed = StationsQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query parameters' });
    }

    const { lat, lon, radius } = parsed.data;
    const radiusKm = Math.min(Math.round(radius / 1000), 50); // cap at 50km
    const cacheKey = `stations:v3:${lat.toFixed(2)}:${lon.toFixed(2)}:${radiusKm}`;

    const cached = await cacheGet(cacheKey);
    if (cached) return reply.send({ ...cached, cached: true });

    try {
      const gridPoints = buildDenseGrid(lat, lon, radiusKm);

      // Batch grid fetches: run in parallel but cap concurrency at 12
      // to avoid overwhelming Open-Meteo
      const BATCH_SIZE = 12;
      const gridData = [];

      for (let i = 0; i < gridPoints.length; i += BATCH_SIZE) {
        const batch = gridPoints.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(batch.map(fetchGridPoint));
        gridData.push(...results.filter(Boolean));
      }

      // Fetch WAQI verified stations in parallel with grid
      let verified = [];
      try {
        const waqiStations = await fetchNearbyStations(lat, lon, radiusKm);
        verified = waqiStations.map((s) => ({
          id: `waqi-${s.id}`,
          name: s.name,
          city: s.city,
          lat: s.lat,
          lon: s.lon,
          aqi: s.aqi,
          hexColor: s.aqi ? aqiColor(s.aqi) : '#9E9E9E',
          category: s.aqi ? aqiCategory(s.aqi) : 'Unknown',
          lastUpdated: s.lastUpdated,
          type: 'verified',
          source: 'WAQI / CPCB Monitoring Network',
          isPhysicalSensor: false, // WAQI aggregates from monitoring networks, not individual sensors
        }));
      } catch {
        fastify.log.warn('WAQI fetch failed, continuing with model data only');
      }

      // Build grid response
      const grid = gridData.map((v, i) => ({
        id: `grid-${i}`,
        name: `Model grid (${v.lat.toFixed(2)}°N, ${v.lon.toFixed(2)}°E)`,
        lat: v.lat,
        lon: v.lon,
        distKm: v.distKm,
        aqi: v.aqi,
        pm25: v.pm25,
        pm10: v.pm10,
        no2: v.no2,
        hexColor: aqiColor(v.aqi),
        category: aqiCategory(v.aqi),
        lastUpdated: v.timestamp,
        type: 'model',
        source: 'Open-Meteo atmospheric model',
        isPhysicalSensor: false,
      }));

      const response = {
        stations: verified,
        gridPoints: grid,
        verifiedCount: verified.length,
        gridCount: grid.length,
        totalGridPointsAttempted: gridPoints.length,
        location: { lat, lon },
        radiusKm,
        gridSpacingKm: 8,
        cached: false,
      };

      await cacheSet(cacheKey, response, TTL.LIVE);
      return reply.send(response);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(502).send({ error: 'Failed to fetch stations', message: err.message });
    }
  });
}
