/**
 * OpenAQ API v3 connector
 * Docs: https://docs.openaq.org/
 *
 * Provides: monitoring station locations, real sensor readings, historical data
 * Requires free API key: https://explore.openaq.org/register
 */

import got from 'got';

const BASE_URL = 'https://api.openaq.org/v3';

function getHeaders() {
  const key = process.env.OPENAQ_API_KEY;
  if (!key) {
    console.warn('[OpenAQ] No API key set. Set OPENAQ_API_KEY in .env');
    return {};
  }
  return { 'X-API-Key': key };
}

/**
 * Fetch nearby monitoring stations
 * @param {number} lat
 * @param {number} lon
 * @param {number} radiusMeters - search radius (default 25km)
 * @returns {Promise<Station[]>}
 */
export async function fetchNearbyStations(lat, lon, radiusMeters = 25000) {
  try {
    const params = new URLSearchParams({
      coordinates: `${lat},${lon}`,
      radius: radiusMeters.toString(),
      limit: '20',
    });

    const response = await got(`${BASE_URL}/locations?${params}`, {
      headers: getHeaders(),
      timeout: { request: 10000 },
      retry: { limit: 2 },
    }).json();

    return (response.results || []).map(parseStation);
  } catch (err) {
    console.error('[OpenAQ] fetchNearbyStations failed:', err.message);
    return [];
  }
}

/**
 * Fetch latest readings from a specific location
 * @param {number} locationId
 * @returns {Promise<LatestReading[]>}
 */
export async function fetchLatestReadings(locationId) {
  try {
    const response = await got(`${BASE_URL}/locations/${locationId}/latest`, {
      headers: getHeaders(),
      timeout: { request: 10000 },
      retry: { limit: 2 },
    }).json();

    return response.results || [];
  } catch (err) {
    console.error('[OpenAQ] fetchLatestReadings failed:', err.message);
    return [];
  }
}

/**
 * Fetch historical measurements for trend data
 * @param {number} locationId
 * @param {string} parameter - pm25, pm10, no2, o3, co
 * @param {number} days - how many days back
 * @returns {Promise<Measurement[]>}
 */
export async function fetchMeasurements(locationId, parameter, days = 30) {
  try {
    const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const params = new URLSearchParams({
      date_from: dateFrom,
      limit: '1000',
      order_by: 'datetime',
    });

    const response = await got(
      `${BASE_URL}/locations/${locationId}/sensors?${params}`,
      {
        headers: getHeaders(),
        timeout: { request: 15000 },
        retry: { limit: 2 },
      }
    ).json();

    return response.results || [];
  } catch (err) {
    console.error('[OpenAQ] fetchMeasurements failed:', err.message);
    return [];
  }
}

/**
 * Search stations by city name
 * @param {string} city
 * @returns {Promise<Station[]>}
 */
export async function searchByCity(city) {
  try {
    const params = new URLSearchParams({
      name: city,
      limit: '10',
    });

    const response = await got(`${BASE_URL}/locations?${params}`, {
      headers: getHeaders(),
      timeout: { request: 10000 },
      retry: { limit: 2 },
    }).json();

    return (response.results || []).map(parseStation);
  } catch (err) {
    console.error('[OpenAQ] searchByCity failed:', err.message);
    return [];
  }
}

function parseStation(raw) {
  return {
    id: raw.id,
    name: raw.name,
    city: raw.locality || raw.city || null,
    country: raw.country?.name || null,
    lat: raw.coordinates?.latitude ?? null,
    lon: raw.coordinates?.longitude ?? null,
    lastUpdated: raw.datetimeLast?.utc || null,
    parameters: (raw.sensors || []).map((s) => s.parameter?.name).filter(Boolean),
    isMonitor: raw.isMonitor ?? false,
    provider: raw.providers?.[0]?.name || null,
  };
}
