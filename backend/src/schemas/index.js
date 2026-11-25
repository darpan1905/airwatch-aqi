/**
 * Zod schemas for all API request validation
 */

import { z } from 'zod';

export const LocationQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export const TrendsQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  window: z.enum(['h24', 'd7', 'd30']).default('d7'),
});

export const StationsQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1000).max(100000).default(25000),
});

export const AlertBody = z.object({
  deviceToken: z.string().min(1),
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  threshold: z.coerce.number().min(0).max(500).default(150),
  locationName: z.string().optional(),
});

export const SearchQuery = z.object({
  city: z.string().min(1).max(100),
});
