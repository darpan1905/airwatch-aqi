/**
 * Open-Meteo Air Quality API connector
 * Docs: https://open-meteo.com/en/docs/air-quality-api
 *
 * No API key required. Free for non-commercial use.
 * Provides: PM2.5, PM10, NO2, O3, CO — current + 7-day hourly forecast
 */

import got from 'got';

const BASE_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/**
 * Fetch current and hourly air quality for a location
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<OpenMeteoResponse>}
 */
export async function fetchAirQuality(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: [
      'pm10',
      'pm2_5',
      'nitrogen_dioxide',
      'ozone',
      'carbon_monoxide',
      'sulphur_dioxide',
      'european_aqi',
      'us_aqi',
    ].join(','),
    timezone: 'Asia/Kolkata',
    past_days: '7',
    forecast_days: '1',
  });

  const response = await got(`${BASE_URL}?${params}`, {
    timeout: { request: 10000 },
    retry: { limit: 2 },
  }).json();

  return parseOpenMeteoResponse(response);
}

/**
 * Parse raw Open-Meteo response into clean structured data
 */
function parseOpenMeteoResponse(raw) {
  const { hourly, hourly_units } = raw;
  const times = hourly.time;

  // Build array of hourly readings
  const readings = times.map((time, i) => ({
    timestamp: new Date(time).toISOString(),
    pm25: hourly.pm2_5?.[i] ?? null,
    pm10: hourly.pm10?.[i] ?? null,
    no2: hourly.nitrogen_dioxide?.[i] ?? null,
    o3: hourly.ozone?.[i] ?? null,
    // CO from Open-Meteo is in µg/m³, convert to mg/m³ for Indian AQI
    co: hourly.carbon_monoxide?.[i] != null ? hourly.carbon_monoxide[i] / 1000 : null,
    so2: hourly.sulphur_dioxide?.[i] ?? null,
  }));

  // Most recent reading (closest to now)
  const now = Date.now();
  const current = readings.reduce((closest, r) => {
    const diff = Math.abs(new Date(r.timestamp).getTime() - now);
    const closestDiff = Math.abs(new Date(closest.timestamp).getTime() - now);
    return diff < closestDiff ? r : closest;
  }, readings[0]);

  return {
    current,
    hourly: readings,
    units: hourly_units,
  };
}

/**
 * Fetch 7-day hourly data for trend graphs
 * Returns readings bucketed by day for 7d/30d views
 */
export async function fetchHistoricalAirQuality(lat, lon, pastDays = 30) {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    hourly: ['pm10', 'pm2_5', 'nitrogen_dioxide', 'ozone', 'carbon_monoxide'].join(','),
    timezone: 'Asia/Kolkata',
    past_days: Math.min(pastDays, 92).toString(),
    forecast_days: '0',
  });

  const response = await got(`${BASE_URL}?${params}`, {
    timeout: { request: 15000 },
    retry: { limit: 2 },
  }).json();

  return parseOpenMeteoResponse(response);
}
