/**
 * Trend Engine
 *
 * Calculates pollution trends using the formula:
 *   Change (%) = ((Current AQI - Previous AQI) / Previous AQI) × 100
 *
 * Provides three time windows: 24h, 7d, 30d
 * Also detects spikes — sudden short-term increases > 20%
 */

/**
 * Calculate percentage change between two AQI values
 * @param {number} current
 * @param {number} previous
 * @returns {number} percentage change (positive = increase, negative = decrease)
 */
export function percentageChange(current, previous) {
  if (!previous || previous === 0) return 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * Determine trend direction from percentage change
 * @param {number} pct
 * @returns {'increasing' | 'decreasing' | 'stable'}
 */
export function trendDirection(pct) {
  if (pct > 5) return 'increasing';
  if (pct < -5) return 'decreasing';
  return 'stable';
}

/**
 * Analyse a time series of AQI readings
 * @param {Array<{ timestamp: string, aqi: number }>} readings - ordered oldest to newest
 * @returns {TrendAnalysis}
 */
export function analyseTrend(readings) {
  if (!readings || readings.length < 2) {
    return {
      direction: 'stable',
      changePercent: 0,
      currentAqi: readings?.[0]?.aqi ?? null,
      previousAqi: null,
      spikes: [],
      average: readings?.[0]?.aqi ?? null,
      min: readings?.[0]?.aqi ?? null,
      max: readings?.[0]?.aqi ?? null,
    };
  }

  const aqiValues = readings.map((r) => r.aqi).filter((v) => v != null);
  const current = aqiValues.at(-1);
  const previous = aqiValues[0];
  const pct = percentageChange(current, previous);

  const spikes = detectSpikes(readings);
  const average = Math.round(aqiValues.reduce((a, b) => a + b, 0) / aqiValues.length);
  const min = Math.min(...aqiValues);
  const max = Math.max(...aqiValues);

  return {
    direction: trendDirection(pct),
    changePercent: pct,
    currentAqi: current,
    previousAqi: previous,
    spikes,
    average,
    min,
    max,
  };
}

/**
 * Detect sudden spikes in a time series
 * A spike = any consecutive pair where change > 20%
 * @param {Array<{ timestamp: string, aqi: number }>} readings
 * @returns {Array<SpikeEvent>}
 */
export function detectSpikes(readings, threshold = 20) {
  const spikes = [];

  for (let i = 1; i < readings.length; i++) {
    const prev = readings[i - 1];
    const curr = readings[i];
    if (!prev.aqi || !curr.aqi) continue;

    const pct = percentageChange(curr.aqi, prev.aqi);
    if (Math.abs(pct) >= threshold) {
      spikes.push({
        timestamp: curr.timestamp,
        fromAqi: prev.aqi,
        toAqi: curr.aqi,
        changePercent: pct,
        type: pct > 0 ? 'spike_up' : 'spike_down',
      });
    }
  }

  return spikes;
}

/**
 * Bucket a flat array of hourly readings into windows
 * @param {Array<{ timestamp: string, aqi: number }>} readings - ordered oldest to newest
 * @returns {{ h24: TrendAnalysis, d7: TrendAnalysis, d30: TrendAnalysis }}
 */
export function buildTrendWindows(readings) {
  const now = Date.now();
  const h24 = readings.filter((r) => now - new Date(r.timestamp).getTime() <= 24 * 60 * 60 * 1000);
  const d7 = readings.filter((r) => now - new Date(r.timestamp).getTime() <= 7 * 24 * 60 * 60 * 1000);
  const d30 = readings.filter((r) => now - new Date(r.timestamp).getTime() <= 30 * 24 * 60 * 60 * 1000);

  return {
    h24: analyseTrend(h24),
    d7: analyseTrend(d7),
    d30: analyseTrend(d30),
  };
}

/**
 * Generate a human-readable trend summary
 * @param {TrendAnalysis} trend
 * @param {'en'|'hi'|'mr'} lang
 * @returns {string}
 */
export function trendSummary(trend, lang = 'en') {
  const { direction, changePercent, currentAqi } = trend;
  const abs = Math.abs(changePercent);

  const templates = {
    en: {
      increasing: `Air pollution has increased by ${abs}% since the period began. AQI is now ${currentAqi}.`,
      decreasing: `Air pollution has decreased by ${abs}% since the period began. AQI is now ${currentAqi}.`,
      stable: `Air pollution levels have remained relatively stable. AQI is currently ${currentAqi}.`,
    },
    hi: {
      increasing: `इस अवधि में वायु प्रदूषण ${abs}% बढ़ा है। AQI अब ${currentAqi} है।`,
      decreasing: `इस अवधि में वायु प्रदूषण ${abs}% घटा है। AQI अब ${currentAqi} है।`,
      stable: `वायु प्रदूषण का स्तर अपेक्षाकृत स्थिर रहा है। AQI वर्तमान में ${currentAqi} है।`,
    },
    mr: {
      increasing: `या कालावधीत वायू प्रदूषण ${abs}% वाढले आहे. AQI आता ${currentAqi} आहे.`,
      decreasing: `या कालावधीत वायू प्रदूषण ${abs}% कमी झाले आहे. AQI आता ${currentAqi} आहे.`,
      stable: `वायू प्रदूषणाची पातळी तुलनेने स्थिर राहिली आहे. AQI सध्या ${currentAqi} आहे.`,
    },
  };

  return templates[lang]?.[direction] ?? templates.en[direction];
}
