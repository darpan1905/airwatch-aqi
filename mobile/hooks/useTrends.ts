import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE } from '../constants/aqi';

export type TrendWindow = 'h24' | 'd7' | 'd30';

export interface TrendReading {
  timestamp: string;
  aqi: number;
  pm25: number | null;
  pm10: number | null;
}

export interface WindowAnalysis {
  direction: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
  currentAqi: number;
  previousAqi: number;
  average: number;
  min: number;
  max: number;
  spikes: Array<{
    timestamp: string;
    fromAqi: number;
    toAqi: number;
    changePercent: number;
    type: 'spike_up' | 'spike_down';
  }>;
  summaryEn: string;
  summaryHi: string;
  summaryMr: string;
}

export interface TrendsData {
  readings: TrendReading[];
  windows: { h24: WindowAnalysis; d7: WindowAnalysis; d30: WindowAnalysis };
  window: TrendWindow;
}

export function useTrends(lat: number | null, lon: number | null, window: TrendWindow = 'd7') {
  return useQuery<TrendsData>({
    queryKey: ['trends', lat?.toFixed(2), lon?.toFixed(2)],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/trends`, {
        params: { lat, lon, window },
      });
      return data;
    },
    enabled: lat !== null && lon !== null,
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });
}
