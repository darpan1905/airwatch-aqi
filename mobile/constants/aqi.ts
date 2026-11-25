export const AQI_CATEGORIES = {
  Good: {
    label: 'Good',
    range: '0–50',
    hex: '#00C853',
    bg: '#E8F5E9',
    textColor: '#1B5E20',
    icon: '😊',
  },
  Satisfactory: {
    label: 'Satisfactory',
    range: '51–100',
    hex: '#AEEA00',
    bg: '#F9FBE7',
    textColor: '#33691E',
    icon: '🙂',
  },
  Moderate: {
    label: 'Moderate',
    range: '101–200',
    hex: '#FFD600',
    bg: '#FFFDE7',
    textColor: '#F57F17',
    icon: '😐',
  },
  Poor: {
    label: 'Poor',
    range: '201–300',
    hex: '#FF6D00',
    bg: '#FFF3E0',
    textColor: '#BF360C',
    icon: '😷',
  },
  'Very Poor': {
    label: 'Very Poor',
    range: '301–400',
    hex: '#D50000',
    bg: '#FFEBEE',
    textColor: '#B71C1C',
    icon: '🤢',
  },
  Severe: {
    label: 'Severe',
    range: '401–500',
    hex: '#6A0000',
    bg: '#F3E5F5',
    textColor: '#4A148C',
    icon: '☠️',
  },
} as const;

export type AQICategory = keyof typeof AQI_CATEGORIES;

export function getCategoryMeta(category: string) {
  return AQI_CATEGORIES[category as AQICategory] ?? AQI_CATEGORIES.Moderate;
}

export function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#00C853';
  if (aqi <= 100) return '#AEEA00';
  if (aqi <= 200) return '#FFD600';
  if (aqi <= 300) return '#FF6D00';
  if (aqi <= 400) return '#D50000';
  return '#6A0000';
}

export const API_BASE = 'http://192.168.1.33:3000/api';
