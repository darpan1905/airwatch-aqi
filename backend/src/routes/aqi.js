/**
 * GET /api/aqi?lat=&lon=
 * GET /api/aqi/city?city=Mumbai
 * GET /api/aqi/geocode?q=Mumbai    — search cities
 * DELETE /api/aqi/cache            — bust cache (dev use)
 */

import { fetchAirQuality } from '../services/openmeteo.js';
import { calculateAQI, POLLUTANT_LABELS, POLLUTANT_UNITS } from '../services/aqiCalculator.js';
import { cacheGet, cacheSet, TTL } from '../cache/redis.js';
import { LocationQuery } from '../schemas/index.js';
import got from 'got';

// Geocode a city name → coordinates using Open-Meteo's free geocoding API
async function geocodeCity(query) {
  const params = new URLSearchParams({ name: query, count: '8', language: 'en', format: 'json' });
  const res = await got(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
    timeout: { request: 8000 }, retry: { limit: 2 },
  }).json();
  return (res.results || []).map((r) => ({
    name: r.name,
    country: r.country,
    state: r.admin1 || null,
    lat: r.latitude,
    lon: r.longitude,
    population: r.population || 0,
    timezone: r.timezone,
  }));
}

// Core AQI computation — shared by both coordinate and city endpoints
async function computeAQI(lat, lon) {
  const { current } = await fetchAirQuality(lat, lon);

  // O3 needs an 8h average under CPCB rules, not an instantaneous hourly reading.
  // Open-Meteo only gives hourly values so using it directly inflates the sub-index.
  // Showing it in the breakdown for reference but keeping it out of the final calc.
  const readings = {
    pm25: current.pm25,
    pm10: current.pm10,
    no2: current.no2,
    co: current.co,
    so2: current.so2,
    // o3: excluded — needs 8h average per CPCB standard
  };

  const displayReadings = { ...readings, o3: current.o3 };
  const aqiResult = calculateAQI(readings);

  const pollutants = Object.entries(displayReadings)
    .filter(([, val]) => val != null)
    .map(([key, value]) => ({
      key,
      label: POLLUTANT_LABELS[key],
      value: Math.round(value * 10) / 10,
      unit: POLLUTANT_UNITS[key],
      subIndex: aqiResult.subIndices[key] ?? null,
      isProminent: key === aqiResult.prominentPollutant,
      referenceOnly: key === 'o3',
    }));

  return {
    aqi: aqiResult.aqi,
    category: aqiResult.category,
    color: aqiResult.color,
    hexColor: aqiResult.hexColor,
    prominentPollutant: aqiResult.prominentPollutant,
    prominentLabel: POLLUTANT_LABELS[aqiResult.prominentPollutant] ?? null,
    guidance: {
      en: aqiResult.guidance,
      hi: aqiResult.guidanceHi,
      mr: aqiResult.guidanceMr,
    },
    pollutants,
    location: { lat, lon },
    timestamp: current.timestamp,
    standard: 'Indian CPCB (IS 18020:2016)',
  };
}

export default async function aqiRoutes(fastify) {

  // ── GET /api/aqi?lat=&lon= ──────────────────────────────────────────────────
  fastify.get('/aqi', async (request, reply) => {
    const parsed = LocationQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid coordinates', details: parsed.error.flatten().fieldErrors });
    }

    const { lat, lon } = parsed.data;
    const cacheKey = `aqi:${lat.toFixed(2)}:${lon.toFixed(2)}`;

    const cached = await cacheGet(cacheKey);
    if (cached) return reply.send({ ...cached, cached: true });

    try {
      const data = await computeAQI(lat, lon);
      await cacheSet(cacheKey, data, TTL.LIVE);
      return reply.send({ ...data, cached: false });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(502).send({ error: 'Failed to fetch air quality data', message: err.message });
    }
  });

  // ── GET /api/aqi/geocode?q=Mumbai ──────────────────────────────────────────
  // Returns city suggestions for the search bar
  fastify.get('/aqi/geocode', async (request, reply) => {
    const q = request.query.q?.trim();
    if (!q || q.length < 2) return reply.code(400).send({ error: 'q must be at least 2 characters' });

    const cacheKey = `geocode:${q.toLowerCase()}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return reply.send(cached);

    try {
      const results = await geocodeCity(q);
      await cacheSet(cacheKey, results, 60 * 60); // 1 hour
      return reply.send(results);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(502).send({ error: 'Geocoding failed', message: err.message });
    }
  });

  // ── GET /api/aqi/city?city=Mumbai ──────────────────────────────────────────
  // Geocodes city then returns AQI — single call for the mobile search flow
  fastify.get('/aqi/city', async (request, reply) => {
    const city = request.query.city?.trim();
    if (!city) return reply.code(400).send({ error: 'city is required' });

    const cacheKey = `aqi:city:${city.toLowerCase().replace(/\s+/g, '-')}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return reply.send({ ...cached, cached: true });

    try {
      const places = await geocodeCity(city);
      if (!places.length) return reply.code(404).send({ error: `No location found for "${city}"` });

      const { lat, lon, name, country, state } = places[0];
      const data = await computeAQI(lat, lon);

      const response = {
        ...data,
        cityName: name,
        state,
        country,
        cached: false,
      };

      await cacheSet(cacheKey, response, TTL.LIVE);
      return reply.send(response);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(502).send({ error: 'Failed to fetch city AQI', message: err.message });
    }
  });

  // ── DELETE /api/aqi/cache ───────────────────────────────────────────────────
  // Busts current-location cache — useful during development
  fastify.delete('/aqi/cache', async (request, reply) => {
    const parsed = LocationQuery.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid coordinates' });
    const { lat, lon } = parsed.data;
    // Force re-fetch by writing a 1-second TTL (effectively deletes)
    await cacheSet(`aqi:${lat.toFixed(2)}:${lon.toFixed(2)}`, null, 1);
    return reply.send({ success: true, message: 'Cache cleared for this location' });
  });
}
