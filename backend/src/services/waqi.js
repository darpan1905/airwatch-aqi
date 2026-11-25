/**
 * WAQI (World Air Quality Index) API connector
 * Docs: https://aqicn.org/api/
 *
 * Replaces OpenAQ for station data. Returns real AQI readings per station.
 */

import got from 'got';

const BASE_URL = 'https://api.waqi.info';
const TOKEN = process.env.WAQI_TOKEN;

function token() {
  return TOKEN || process.env.WAQI_TOKEN || '';
}

/**
 * Fetch nearby stations with live AQI readings
 * @param {number} lat
 * @param {number} lon
 * @param {number} radiusKm
 * @returns {Promise<WAQIStation[]>}
 */
export async function fetchNearbyStations(lat, lon, radiusKm = 25) {
  try {
    const url = `${BASE_URL}/map/bounds/?token=${token()}&latlng=${lat - radiusKm / 111},${lon - radiusKm / 111},${lat + radiusKm / 111},${lon + radiusKm / 111}`;

    const response = await got(url, {
      timeout: { request: 10000 },
      retry: { limit: 2 },
    }).json();

    if (response.status !== 'ok') {
      console.warn('[WAQI] fetchNearbyStations non-ok:', response.status);
      return [];
    }

    return (response.data || []).map(parseStation);
  } catch (err) {
    console.error('[WAQI] fetchNearbyStations failed:', err.message);
    return [];
  }
}

/**
 * Fetch detailed reading for a specific station by its UID or city name
 * @param {string|number} stationId - WAQI station uid or city slug
 * @returns {Promise<WAQIDetail|null>}
 */
export async function fetchStationDetail(stationId) {
  try {
    const url = `${BASE_URL}/feed/@${stationId}/?token=${token()}`;
    const response = await got(url, {
      timeout: { request: 8000 },
      retry: { limit: 2 },
    }).json();

    if (response.status !== 'ok') return null;
    return parseDetail(response.data);
  } catch (err) {
    console.error('[WAQI] fetchStationDetail failed:', err.message);
    return null;
  }
}

/**
 * Fetch AQI for a city by name
 * @param {string} city
 * @returns {Promise<WAQIDetail|null>}
 */
export async function fetchByCity(city) {
  try {
    const url = `${BASE_URL}/feed/${encodeURIComponent(city)}/?token=${token()}`;
    const response = await got(url, {
      timeout: { request: 8000 },
      retry: { limit: 2 },
    }).json();

    if (response.status !== 'ok') return null;
    return parseDetail(response.data);
  } catch (err) {
    console.error('[WAQI] fetchByCity failed:', err.message);
    return null;
  }
}

function parseStation(raw) {
  return {
    id: raw.uid,
    name: raw.station?.name || 'Unknown Station',
    lat: raw.lat,
    lon: raw.lon,
    aqi: raw.aqi === '-' ? null : parseInt(raw.aqi, 10) || null,
    lastUpdated: raw.station?.time || null,
    // city extracted from name (WAQI names include city)
    city: extractCity(raw.station?.name),
  };
}

function parseDetail(raw) {
  if (!raw) return null;
  return {
    id: raw.idx,
    name: raw.city?.name || 'Unknown',
    lat: raw.city?.geo?.[0] || null,
    lon: raw.city?.geo?.[1] || null,
    aqi: raw.aqi,
    dominentPollutant: raw.dominentpol,
    lastUpdated: raw.time?.s || null,
    pollutants: {
      pm25: raw.iaqi?.pm25?.v ?? null,
      pm10: raw.iaqi?.pm10?.v ?? null,
      no2: raw.iaqi?.no2?.v ?? null,
      o3: raw.iaqi?.o3?.v ?? null,
      co: raw.iaqi?.co?.v ?? null,
      so2: raw.iaqi?.so2?.v ?? null,
    },
    attributions: (raw.attributions || []).map((a) => ({
      name: a.name,
      url: a.url,
    })),
  };
}

function extractCity(name) {
  if (!name) return null;
  // WAQI names are often "Station Name, City, Country"
  const parts = name.split(',');
  return parts.length >= 2 ? parts[parts.length - 2].trim() : parts[0].trim();
}
