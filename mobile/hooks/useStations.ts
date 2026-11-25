import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE } from '../constants/aqi';

export interface Station {
  id: string;
  name: string;
  city: string | null;
  lat: number;
  lon: number;
  aqi: number | null;
  pm25?: number | null;
  pm10?: number | null;
  no2?: number | null;
  distKm?: number;
  hexColor: string;
  category: string;
  lastUpdated: string | null;
  type: 'verified' | 'model';
  source: string;
}

export interface StationsData {
  stations: Station[];
  gridPoints: Station[];
  verifiedCount: number;
  gridCount: number;
  totalGridPointsAttempted?: number;
  radiusKm: number;
  gridSpacingKm?: number;
}

export function useStations(lat: number | null, lon: number | null, radiusKm = 40) {
  return useQuery<StationsData>({
    queryKey: ['stations', lat?.toFixed(1), lon?.toFixed(1)],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/stations`, {
        params: { lat, lon, radius: radiusKm * 1000 },
      });
      return data;
    },
    enabled: lat !== null && lon !== null,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
