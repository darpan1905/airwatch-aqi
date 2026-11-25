# AirWatch

I built this because I kept checking my weather app for AQI and getting a number with no context — 147, okay, but should I go for a run or not? Most apps just show you a number. This one tells you what it means, what's causing it, and what to do about it. It also uses the Indian CPCB standard instead of US EPA, which matters because the two scales are very different and most apps default to US EPA even for Indian cities.

## What it does

Real-time AQI for your location using the Indian CPCB standard (IS 18020:2016). Breaks down which pollutant is driving the number, shows how it's trended over the last 24 hours, 7 days and 30 days, and gives you plain-language guidance in English, Hindi or Marathi. There's also a map showing nearby monitoring stations alongside Open-Meteo model data for the surrounding area, and a city search so you can check anywhere.

## The AQI calculation

Indian AQI uses pollutant-specific breakpoints with this interpolation formula:

```
Ip = ((IHI - ILO) / (BHI - BLO)) * (Cp - BLO) + ILO
```

Final AQI is the maximum sub-index across all pollutants — the worst pollutant drives the number. One thing worth noting: ozone requires an 8-hour average under CPCB rules. Open-Meteo gives hourly instantaneous values, so O3 is shown for reference but excluded from the AQI calculation to avoid inflating the number.

## Stack

React Native + Expo on the frontend. Node.js + Fastify on the backend with Redis caching. Data from Open-Meteo (free, no key) and WAQI for monitoring station readings.

## Running it

```bash
# Backend
cd backend
cp .env.example .env
# add your WAQI token to .env
node src/server.js

# Mobile
cd mobile
npx expo start
```

The mobile app talks to the backend over your local network. Update `API_BASE` in `mobile/constants/aqi.ts` with your machine's IP before running.

## Data sources

- [Open-Meteo](https://open-meteo.com/en/docs/air-quality-api) — hourly PM2.5, PM10, NO2, O3, CO. Free, no key required.
- [WAQI](https://aqicn.org/api/) — verified monitoring station readings. Free API key required.
