import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_BASE } from '../constants/aqi';
import type { AQIData } from './useAQI';

export interface GeoResult {
  name: string;
  country: string;
  state: string | null;
  lat: number;
  lon: number;
  population: number;
  timezone: string;
}

export interface CityAQIData extends AQIData {
  cityName: string;
  state: string | null;
  country: string;
}

export function useGeocode(query: string) {
  return useQuery<GeoResult[]>({
    queryKey: ['geocode', query],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/aqi/geocode`, { params: { q: query } });
      return data;
    },
    enabled: query.length >= 2,
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });
}

export function useCityAQI(city: string | null) {
  return useQuery<CityAQIData>({
    queryKey: ['cityAqi', city],
    queryFn: async () => {
      const { data } = await axios.get(`${API_BASE}/aqi/city`, { params: { city } });
      return data;
    },
    enabled: !!city && city.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
