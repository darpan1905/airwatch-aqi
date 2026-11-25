import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE } from '../constants/aqi';

export interface Pollutant {
  key: string;
  label: string;
  value: number;
  unit: string;
  subIndex: number | null;
  isProminent: boolean;
  referenceOnly?: boolean;
}

export interface AQIData {
  aqi: number;
  category: string;
  color: string;
  hexColor: string;
  prominentPollutant: string;
  prominentLabel: string;
  guidance: { en: string; hi: string; mr: string };
  pollutants: Pollutant[];
  location: { lat: number; lon: number };
  timestamp: string;
  cached: boolean;
}

export function useAQI(lat: number | null, lon: number | null) {
  return useQuery<AQIData>({
    queryKey: ['aqi', lat?.toFixed(2), lon?.toFixed(2)],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/aqi`, { params: { lat, lon } });
      return data;
    },
    enabled: lat !== null && lon !== null,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });
}
