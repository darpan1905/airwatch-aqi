/**
 * Indian AQI Calculator — CPCB Standard
 *
 * Uses the interpolation formula:
 *   Ip = ((IHI - ILO) / (BHI - BLO)) * (Cp - BLO) + ILO
 *
 * Where:
 *   Ip  = AQI sub-index for pollutant p
 *   Cp  = measured concentration of pollutant p
 *   BHI = concentration breakpoint >= Cp
 *   BLO = concentration breakpoint <= Cp
 *   IHI = AQI value corresponding to BHI
 *   ILO = AQI value corresponding to BLO
 *
 * Final AQI = maximum of all sub-indices (prominent pollutant determines AQI)
 */

// CPCB breakpoints: [BLO, BHI, ILO, IHI]
const BREAKPOINTS = {
  // PM2.5 (µg/m³, 24-hour average)
  pm25: [
    [0, 30, 0, 50],
    [30, 60, 51, 100],
    [60, 90, 101, 200],
    [90, 120, 201, 300],
    [120, 250, 301, 400],
    [250, 500, 401, 500],
  ],
  // PM10 (µg/m³, 24-hour average)
  pm10: [
    [0, 50, 0, 50],
    [50, 100, 51, 100],
    [100, 250, 101, 200],
    [250, 350, 201, 300],
    [350, 430, 301, 400],
    [430, 600, 401, 500],
  ],
  // NO2 (µg/m³, 24-hour average)
  no2: [
    [0, 40, 0, 50],
    [40, 80, 51, 100],
    [80, 180, 101, 200],
    [180, 280, 201, 300],
    [280, 400, 301, 400],
    [400, 800, 401, 500],
  ],
  // O3 (µg/m³, 8-hour average)
  o3: [
    [0, 50, 0, 50],
    [50, 100, 51, 100],
    [100, 168, 101, 200],
    [168, 208, 201, 300],
    [208, 748, 301, 400],
    [748, 1000, 401, 500],
  ],
  // CO (mg/m³, 8-hour average)
  co: [
    [0, 1, 0, 50],
    [1, 2, 51, 100],
    [2, 10, 101, 200],
    [10, 17, 201, 300],
    [17, 34, 301, 400],
    [34, 50, 401, 500],
  ],
  // SO2 (µg/m³, 24-hour average)
  so2: [
    [0, 40, 0, 50],
    [40, 80, 51, 100],
    [80, 380, 101, 200],
    [380, 800, 201, 300],
    [800, 1600, 301, 400],
    [1600, 2100, 401, 500],
  ],
};

/**
 * Calculate sub-index for a single pollutant
 * @param {string} pollutant - pollutant key (pm25, pm10, no2, o3, co, so2)
 * @param {number} concentration - measured concentration
 * @returns {{ subIndex: number, breakpointLow: number, breakpointHigh: number } | null}
 */
export function calculateSubIndex(pollutant, concentration) {
  const breakpoints = BREAKPOINTS[pollutant];
  if (!breakpoints || concentration == null || isNaN(concentration)) return null;

  for (const [BLO, BHI, ILO, IHI] of breakpoints) {
    if (concentration >= BLO && concentration <= BHI) {
      const Ip = ((IHI - ILO) / (BHI - BLO)) * (concentration - BLO) + ILO;
      return {
        subIndex: Math.round(Ip),
        breakpointLow: BLO,
        breakpointHigh: BHI,
      };
    }
  }

  // Concentration exceeds all breakpoints — cap at 500
  if (concentration > BREAKPOINTS[pollutant].at(-1)[1]) {
    return { subIndex: 500, breakpointLow: null, breakpointHigh: null };
  }

  return null;
}

/**
 * Calculate overall AQI from multiple pollutant readings
 * @param {Object} readings - { pm25, pm10, no2, o3, co, so2 } concentrations
 * @returns {AQIResult}
 */
export function calculateAQI(readings) {
  const subIndices = {};
  let maxIndex = 0;
  let prominentPollutant = null;

  for (const [pollutant, concentration] of Object.entries(readings)) {
    if (concentration == null || !(pollutant in BREAKPOINTS)) continue;
    const result = calculateSubIndex(pollutant, concentration);
    if (result) {
      subIndices[pollutant] = result.subIndex;
      if (result.subIndex > maxIndex) {
        maxIndex = result.subIndex;
        prominentPollutant = pollutant;
      }
    }
  }

  const category = getCategory(maxIndex);

  return {
    aqi: maxIndex,
    prominentPollutant,
    category: category.label,
    color: category.color,
    hexColor: category.hexColor,
    subIndices,
    guidance: category.guidance,
    guidanceHi: category.guidanceHi,
    guidanceMr: category.guidanceMr,
  };
}

/**
 * Map AQI value to CPCB category with guidance
 */
export function getCategory(aqi) {
  if (aqi <= 50) return {
    label: 'Good',
    color: 'green',
    hexColor: '#00C853',
    guidance: 'Air quality is satisfactory. Enjoy outdoor activities.',
    guidanceHi: 'वायु गुणवत्ता संतोषजनक है। बाहरी गतिविधियों का आनंद लें।',
    guidanceMr: 'हवेची गुणवत्ता समाधानकारक आहे. बाहेरील उपक्रमांचा आनंद घ्या.',
  };
  if (aqi <= 100) return {
    label: 'Satisfactory',
    color: 'lime',
    hexColor: '#AEEA00',
    guidance: 'Minor breathing discomfort to sensitive people. Most people can go outdoors.',
    guidanceHi: 'संवेदनशील लोगों को सांस लेने में हल्की तकलीफ। अधिकांश लोग बाहर जा सकते हैं।',
    guidanceMr: 'संवेदनशील लोकांना श्वासोच्छवासाचा किंचित त्रास. बहुतेक लोक बाहेर जाऊ शकतात.',
  };
  if (aqi <= 200) return {
    label: 'Moderate',
    color: 'yellow',
    hexColor: '#FFD600',
    guidance: 'Breathing discomfort to people with lung/heart disease. Sensitive groups should limit prolonged outdoor exertion.',
    guidanceHi: 'फेफड़े/हृदय रोग वाले लोगों को सांस लेने में कठिनाई। संवेदनशील समूह बाहरी गतिविधि सीमित करें।',
    guidanceMr: 'फुफ्फुस/हृदयरोग असलेल्या लोकांना श्वासोच्छवासाचा त्रास. संवेदनशील गटाने बाहेरील क्रियाकलाप मर्यादित करावेत.',
  };
  if (aqi <= 300) return {
    label: 'Poor',
    color: 'orange',
    hexColor: '#FF6D00',
    guidance: 'Breathing discomfort to most people. Avoid outdoor exercise. Keep windows closed.',
    guidanceHi: 'अधिकांश लोगों को सांस लेने में कठिनाई। बाहरी व्यायाम से बचें। खिड़कियां बंद रखें।',
    guidanceMr: 'बहुतेक लोकांना श्वासोच्छवासाचा त्रास. बाहेरील व्यायाम टाळा. खिडक्या बंद ठेवा.',
  };
  if (aqi <= 400) return {
    label: 'Very Poor',
    color: 'red',
    hexColor: '#D50000',
    guidance: 'Respiratory illness on prolonged exposure. Avoid all outdoor activity. Wear N95 mask if going out.',
    guidanceHi: 'लंबे समय तक संपर्क से श्वसन रोग। सभी बाहरी गतिविधियों से बचें। बाहर जाने पर N95 मास्क पहनें।',
    guidanceMr: 'दीर्घकाळ संपर्कामुळे श्वसन आजार. सर्व बाहेरील क्रियाकलाप टाळा. बाहेर जात असल्यास N95 मास्क घाला.',
  };
  return {
    label: 'Severe',
    color: 'maroon',
    hexColor: '#6A0000',
    guidance: 'Serious respiratory impact. Stay indoors. Use air purifier. Seek medical advice if symptomatic.',
    guidanceHi: 'गंभीर श्वसन प्रभाव। घर के अंदर रहें। एयर प्यूरीफायर का उपयोग करें। लक्षण होने पर चिकित्सा सलाह लें।',
    guidanceMr: 'गंभीर श्वसन परिणाम. घरामध्ये राहा. एअर प्युरिफायर वापरा. लक्षणे दिसल्यास वैद्यकीय सल्ला घ्या.',
  };
}

export const POLLUTANT_LABELS = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  no2: 'NO₂',
  o3: 'O₃',
  co: 'CO',
  so2: 'SO₂',
};

export const POLLUTANT_UNITS = {
  pm25: 'µg/m³',
  pm10: 'µg/m³',
  no2: 'µg/m³',
  o3: 'µg/m³',
  co: 'mg/m³',
  so2: 'µg/m³',
};

/**
 * Quick hex colour from AQI number (used by stations route)
 */
export function getAQIColor(aqi) {
  if (aqi <= 50) return '#00C853';
  if (aqi <= 100) return '#AEEA00';
  if (aqi <= 200) return '#FFD600';
  if (aqi <= 300) return '#FF6D00';
  if (aqi <= 400) return '#D50000';
  return '#6A0000';
}
