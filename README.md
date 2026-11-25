# AirWatch — Air Quality Dashboard

> A real-time air quality monitoring app for Indian citizens. Displays AQI, pollution trends and precautionary guidance in English, Hindi and Marathi.

## Features

- **Real-time AQI** — Calculated using Indian CPCB standard (IS 18020:2016)
- **Pollutant breakdown** — PM2.5, PM10, NO₂, O₃, CO, SO₂ with sub-indices
- **Trend analysis** — 24h / 7d / 30d historical trends with spike detection
- **Precautionary guidance** — Plain-language safety recommendations
- **Monitoring station map** — Nearby OpenAQ stations with freshness indicators
- **Push alerts** — Notify when AQI crosses your chosen threshold
- **Multilingual** — English, Hindi (हिंदी), Marathi (मराठी)

## AQI Calculation

Indian AQI uses pollutant-specific breakpoints and the interpolation formula:

```
Iₚ = ((I_HI − I_LO) / (B_HI − B_LO)) × (Cₚ − B_LO) + I_LO
```

Where `Iₚ` is the sub-index for pollutant `p`, `Cₚ` is the measured concentration,
and `B_HI/B_LO` are the CPCB concentration breakpoints.

**Final AQI = maximum of all pollutant sub-indices** (prominent pollutant determines AQI).

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo SDK 51 |
| Routing | Expo Router v3 |
| Server state | TanStack Query v5 |
| UI state | Zustand v4 |
| Backend | Node.js 20 + Fastify v4 |
| Validation | Zod |
| Cache | Redis (ioredis) |
| Air quality data | Open-Meteo (free) + OpenAQ |
| i18n | i18next |

## Setup

### 1. Backend

```bash
cd backend
cp .env.example .env
# Add your OpenAQ API key to .env (free at https://explore.openaq.org/register)
npm install
npm run dev
```

Backend runs on `http://localhost:3000`

### 2. Mobile

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone.

### Environment Variables

```env
OPENAQ_API_KEY=your_key_here   # Free key from openaq.org
REDIS_HOST=127.0.0.1           # Optional — app works without Redis
REDIS_PORT=6379
```

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/aqi?lat=&lon=` | Current AQI + pollutant breakdown |
| `GET /api/trends?lat=&lon=&window=h24\|d7\|d30` | Historical trend analysis |
| `GET /api/stations?lat=&lon=` | Nearby monitoring stations |
| `GET /api/stations/search?city=` | Search stations by city |
| `POST /api/alerts/register` | Register push alert preferences |
| `GET /api/alerts/check?lat=&lon=&threshold=` | Check if AQI exceeds threshold |
| `GET /health` | Health check |

## Data Sources

- **[Open-Meteo](https://open-meteo.com/en/docs/air-quality-api)** — Hourly PM2.5, PM10, NO₂, O₃, CO. Free, no key required.
- **[OpenAQ](https://openaq.org)** — Monitoring station locations and verified sensor readings. Free API key required.
