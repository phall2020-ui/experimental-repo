# Solar Portfolio Dashboard — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Cross-platform mobile dashboard (PWA — works on iPhone, Android, and desktop) providing a real-time snapshot of **all 44+ solar sites** across SolarEdge, Juggle/EMIG, Solis and FusionSolar. Shows generation, inverter status, meter data, generation-to-date, faults/alarms, and revenue per site and at portfolio level.

**Architecture:** Extend the existing **solar-platform** FastAPI backend (which already has a service layer, DuckDB storage, and multi-source ingestion for all sites) with new mobile-optimised endpoints. Build a React PWA frontend that consumes the API and renders a responsive dashboard installable on any phone.

**Tech Stack:**
- **Backend:** Extend `solar-platform` FastAPI + existing `PlantService` / `LiveDataService` / `PortfolioService` + DuckDB
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4 + recharts + @tanstack/react-query (all already used in the workspace)
- **Cross-platform:** PWA with `vite-plugin-pwa` (service worker, manifest, offline caching, home-screen install)
- **Data Sources:** Juggle/EMIG API (8 sites), SolarEdge API (22 sites), Solis API (11 sites), FusionSolar (Point Lane), Elexon SSP (live pricing), Notion asset register (metadata)

---

## Portfolio Scope — 44 Sites, 4 Platforms

| Platform | Sites | Auth | Data Resolution |
|----------|-------|------|-----------------|
| **Juggle/EMIG** | 8 — Newfold Farm, Cromwell Tools, Man City FC, Sheldons Bakery, Merry Hill, Metrocentre, FloPlast, Smeed Dean Works | Bearer token / API key | 15-min |
| **SolarEdge** | 22 — Park Hall, Bannatynes (8 clubs), Burnley College, WALC (3), Valley Hydraulics, etc. | API key (query param) | 15-min |
| **Solis** | 11 — Finlay Beverages, Haverhill, Sofina Foods, Smithy's Mushrooms (3), Parfetts, Hibernian (2), Besblock | API key | 15-min |
| **FusionSolar** | 1+ — Point Lane Solar Farm (8.6 MWp) | SSO / Northbound API | 5-min |

All sites already have adapters in `solar-platform/src/solar_platform/ingestion/` and are mapped in `sites_mapping.json`.

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                 EXISTING: solar-platform                          │
│                                                                  │
│  Ingestion Coordinator (multi-source fallback chain)             │
│  ┌──────────┐ ┌────────────┐ ┌───────┐ ┌──────────┐            │
│  │ Juggle/  │ │ SolarEdge  │ │ Solis │ │ Huawei   │ + more     │
│  │ EMIG     │ │            │ │       │ │FusionSolar│            │
│  └────┬─────┘ └─────┬──────┘ └───┬───┘ └────┬─────┘            │
│       └──────────────┴────────────┴──────────┘                   │
│                      ▼                                           │
│              DuckDB (readings, plants, alerts)                   │
│                      ▼                                           │
│  Services: PlantService, LiveDataService, PortfolioService       │
│                      ▼                                           │
│  Existing FastAPI: /api/v1/plants, /readings, /portfolio/summary │
└──────────────────────┬───────────────────────────────────────────┘
                       │
          ┌────────────┼────────────────┐
          ▼            ▼                ▼
┌─────────────┐ ┌────────────┐ ┌──────────────┐
│ NEW FastAPI  │ │ NEW FastAPI │ │  NEW FastAPI  │
│ /mobile/     │ │ /mobile/    │ │  /mobile/     │
│ dashboard    │ │ sites/{uid} │ │  portfolio    │
└──────┬──────┘ └──────┬─────┘ └──────┬───────┘
       └───────────────┼──────────────┘
                       │ HTTPS / JSON
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│              NEW: React PWA (cross-platform)                      │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │Portfolio │ │Site Detail│ │Inverters │ │ Alarms   │           │
│  │Overview  │ │Dashboard │ │  Status  │ │& Faults  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐                                      │
│  │ Revenue  │ │ History  │  📱 iPhone / Android / Desktop       │
│  │  & SSP   │ │ & Trends │  Home-screen installable PWA         │
│  └──────────┘ └──────────┘                                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Extend solar-platform Backend (New Mobile API Endpoints)

### Task 1: Mobile API Router — Portfolio Dashboard

**Files:**
- Create: `solar-platform/api/routers/mobile.py`
- Modify: `solar-platform/api/main.py` (register new router)

**Endpoint:** `GET /api/v1/mobile/dashboard`

**Response:**
```json
{
  "timestamp": "2026-02-20T14:32:00Z",
  "portfolio": {
    "total_sites": 44,
    "total_capacity_mwp": 52.3,
    "generation_today_mwh": 87.4,
    "generation_mtd_mwh": 1234.5,
    "fleet_pr_pct": 82.1,
    "active_alerts": 3,
    "critical_alerts": 0,
    "sites_online": 41,
    "sites_offline": 3
  },
  "sites": [
    {
      "plant_uid": "AMP:00001",
      "name": "Cromwell Tools",
      "platform": "juggle",
      "capacity_kwp": 250.0,
      "today_kwh": 412.3,
      "current_kw": 48.2,
      "pr_pct": 84.5,
      "status": "online",
      "alert_count": 0,
      "last_reading": "2026-02-20T14:15:00Z"
    }
  ],
  "revenue": {
    "today_gbp": 4521.30,
    "current_ssp_gbp_mwh": 48.23,
    "mtd_gbp": 67890.12
  }
}
```

**Implementation:** Wire into existing `PortfolioService.get_portfolio_summary()` and `LiveDataService.get_daily_kpis()` per site. Enrich with Elexon SSP from the existing fetcher.

---

### Task 2: Mobile API — Site Detail

**Endpoint:** `GET /api/v1/mobile/sites/{plant_uid}`

**Response:**
```json
{
  "plant_uid": "AMP:00001",
  "name": "Cromwell Tools",
  "platform": "juggle",
  "capacity_kwp": 250.0,
  "generation": {
    "today_kwh": 412.3,
    "today_mwh": 0.412,
    "current_kw": 48.2,
    "peak_kw": 195.0,
    "mtd_mwh": 5.234,
    "ytd_mwh": 45.67
  },
  "performance": {
    "pr_pct": 84.5,
    "specific_yield": 1.65,
    "irradiance_kwh_m2": 3.21
  },
  "inverters": {
    "total": 12,
    "online": 11,
    "offline": 1,
    "devices": [
      {
        "emig_id": "INVERT:002946",
        "name": "INV-01",
        "status": "online",
        "power_kw": 4.2,
        "energy_today_kwh": 34.5,
        "dc_voltage_v": 412.3,
        "temperature_c": 38.2,
        "last_reading": "2026-02-20T14:15:00Z"
      }
    ]
  },
  "alarms": {
    "critical": 0,
    "major": 0,
    "minor": 1,
    "warning": 0,
    "items": [
      {
        "severity": "minor",
        "message": "INV-04 below expected output",
        "device": "INVERT:002949",
        "since": "2026-02-20T10:30:00Z"
      }
    ]
  },
  "hourly_generation": [
    {"hour": "06:00", "kwh": 12.3, "irradiance_wm2": 120},
    {"hour": "07:00", "kwh": 28.7, "irradiance_wm2": 310}
  ],
  "last_updated": "2026-02-20T14:15:00Z"
}
```

**Implementation:**
- Plant metadata from `PlantService.get_plant(uid)`
- KPIs from `LiveDataService.get_daily_kpis(uid, today)`
- Inverter status inferred from readings (zero power during daylight = offline, data gap = comms failure)
- Alarms from `alerts` table in DuckDB (alert rules engine)
- Hourly data aggregated from 15-min readings

---

### Task 3: Mobile API — Inverter Grid

**Endpoint:** `GET /api/v1/mobile/sites/{plant_uid}/inverters`

Returns per-inverter detail with status inference:
- `online`: power > 0 during daylight, fresh readings
- `standby`: power = 0 but voltage present (night or low irradiance)
- `offline`: no readings for > 30 min during daylight
- `fault`: anomalous readings (dc_voltage = 0 during production hours)

**Implementation:** Query latest readings per `emig_id` where type = `INVERTER`. Cross-reference `get_daylight_hours()` from `calculations.py` for time-aware status classification.

---

### Task 4: Mobile API — Alerts & Faults

**Endpoint:** `GET /api/v1/mobile/alerts?severity=critical,major&status=active`

Returns active alerts across the portfolio, filterable by severity and site. Uses the existing alert rules engine in `solar-platform/src/solar_platform/alerts/`.

**Alert types already defined:**
- Low performance ratio
- Low availability
- Data gaps (SHORT/MEDIUM/LONG)
- Clipping detection
- Curtailment
- Fouling
- Thermal losses

---

### Task 5: Mobile API — Revenue & Market Data

**Endpoint:** `GET /api/v1/mobile/revenue?date=2026-02-20`

**Implementation:**
- Today's SSP: Live from Elexon API (`data.elexon.co.uk/bmrs/api/v1/balancing/settlement/system-prices/{date}`)
- Revenue per site: `sum(energy_kwh / 1000 × ssp_for_period)` per settlement period
- Uses existing tariff configs from `plant_tariffs` table where available
- Fallback to SSP for merchant sites

---

### Task 6: Mobile API — History & Trends

**Endpoint:** `GET /api/v1/mobile/sites/{plant_uid}/history?start=2026-01-01&end=2026-02-20&interval=daily`

Returns daily/weekly/monthly aggregated data for charts. Uses existing DuckDB readings, aggregated by `DATE_TRUNC`.

**Endpoint:** `GET /api/v1/mobile/portfolio/history?start=2026-01-01&end=2026-02-20`

Portfolio-level generation trend across all sites.

---

## Phase 2: React PWA Frontend

### Task 7: Project Scaffold

**Files:**
- Create: `apps/solar-dashboard/frontend/` (Vite + React + TypeScript + Tailwind)
- Create: `apps/solar-dashboard/frontend/package.json`
- Create: `apps/solar-dashboard/frontend/vite.config.ts` (with PWA plugin)
- Create: `apps/solar-dashboard/frontend/public/manifest.json`

**Stack** (matches existing workspace patterns):
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^7.0.0",
    "@tanstack/react-query": "^5.0.0",
    "recharts": "^2.12.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "date-fns": "^3.6.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@vitejs/plugin-react": "^4.3.0",
    "vite": "^6.0.0",
    "vite-plugin-pwa": "^0.20.0",
    "tailwindcss": "^4.0.0",
    "autoprefixer": "^10.4.0"
  }
}
```

**PWA config** (`vite.config.ts`):
```typescript
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Solar Portfolio Dashboard',
        short_name: 'SolarDash',
        theme_color: '#F59E0B',
        background_color: '#0A0E1A',
        display: 'standalone',
        icons: [/* 192x192, 512x512 */]
      },
      workbox: {
        runtimeCaching: [
          { urlPattern: /\/api\//, handler: 'NetworkFirst', options: { cacheName: 'api-cache', expiration: { maxAgeSeconds: 300 } } }
        ]
      }
    })
  ]
})
```

---

### Task 8: TypeScript Types (API Contract)

**Files:**
- Create: `apps/solar-dashboard/frontend/src/types/api.ts`

Mirror the FastAPI response models as TypeScript interfaces:

```typescript
interface PortfolioDashboard {
  timestamp: string
  portfolio: PortfolioSummary
  sites: SiteOverview[]
  revenue: RevenueSummary
}

interface PortfolioSummary {
  total_sites: number
  total_capacity_mwp: number
  generation_today_mwh: number
  generation_mtd_mwh: number
  fleet_pr_pct: number | null
  active_alerts: number
  critical_alerts: number
  sites_online: number
  sites_offline: number
}

interface SiteOverview {
  plant_uid: string
  name: string
  platform: 'juggle' | 'solaredge' | 'solis' | 'fusionsolar'
  capacity_kwp: number
  today_kwh: number
  current_kw: number
  pr_pct: number | null
  status: 'online' | 'offline' | 'standby' | 'unknown'
  alert_count: number
  last_reading: string
}

interface SiteDetail {
  plant_uid: string
  name: string
  platform: string
  capacity_kwp: number
  generation: GenerationData
  performance: PerformanceData
  inverters: InverterSummary
  alarms: AlarmData
  hourly_generation: HourlyPoint[]
  last_updated: string
}

interface InverterDevice {
  emig_id: string
  name: string
  status: 'online' | 'offline' | 'standby' | 'fault'
  power_kw: number
  energy_today_kwh: number
  dc_voltage_v: number
  temperature_c: number | null
  last_reading: string
}

interface Alert {
  id: string
  severity: 'critical' | 'major' | 'minor' | 'warning'
  site_name: string
  plant_uid: string
  message: string
  device: string | null
  since: string
  status: 'active' | 'acknowledged' | 'resolved'
}

interface RevenueSummary {
  today_gbp: number
  current_ssp_gbp_mwh: number | null
  mtd_gbp: number
}

interface HourlyPoint {
  hour: string
  kwh: number
  irradiance_wm2: number | null
}

interface DailyHistoryPoint {
  date: string
  total_kwh: number
  irradiance_kwh_m2: number | null
  pr_pct: number | null
  revenue_gbp: number | null
}
```

---

### Task 9: API Client + React Query Hooks

**Files:**
- Create: `apps/solar-dashboard/frontend/src/api/client.ts`
- Create: `apps/solar-dashboard/frontend/src/api/hooks.ts`

```typescript
// client.ts
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function fetchDashboard(): Promise<PortfolioDashboard> { ... }
export async function fetchSiteDetail(uid: string): Promise<SiteDetail> { ... }
export async function fetchInverters(uid: string): Promise<InverterDevice[]> { ... }
export async function fetchAlerts(filters?: AlertFilters): Promise<Alert[]> { ... }
export async function fetchRevenue(date?: string): Promise<RevenueSummary> { ... }
export async function fetchHistory(uid: string, start: string, end: string): Promise<DailyHistoryPoint[]> { ... }

// hooks.ts — auto-refresh every 60s
export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard, refetchInterval: 60_000 })
}
export function useSiteDetail(uid: string) {
  return useQuery({ queryKey: ['site', uid], queryFn: () => fetchSiteDetail(uid), refetchInterval: 60_000 })
}
export function useAlerts(filters?: AlertFilters) {
  return useQuery({ queryKey: ['alerts', filters], queryFn: () => fetchAlerts(filters), refetchInterval: 30_000 })
}
```

Service worker caches last response for offline viewing.

---

### Task 10: Theme & Layout Shell

**Files:**
- Create: `apps/solar-dashboard/frontend/src/theme.ts`
- Create: `apps/solar-dashboard/frontend/src/components/Layout.tsx`

**Dark solar theme** (CSS variables via Tailwind):
```css
--bg-primary:    #0A0E1A   /* deep navy */
--bg-card:       #141B2D   /* card surface */
--accent:        #F59E0B   /* amber/solar */
--success:       #10B981   /* green — online */
--danger:        #EF4444   /* red — offline/critical */
--warning:       #F97316   /* orange — major */
--info:          #3B82F6   /* blue — minor */
--text-primary:  #FFFFFF
--text-secondary:#94A3B8   /* slate */
```

**Responsive layout:**
- Mobile (< 768px): Bottom tab bar, single-column cards
- Tablet (768–1024px): 2-column grid
- Desktop (> 1024px): Sidebar nav + 3-column grid

---

### Task 11: Portfolio Overview Screen (Home)

**Route:** `/`

```
┌──────────────────────────────────────────┐
│  SOLAR PORTFOLIO         🔄 Last: 14:32 │
├──────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ 87.4 MWh │ │ £4,521   │ │ 82.1%    │ │
│  │ Gen Today │ │ Revenue  │ │ Fleet PR │ │
│  └──────────┘ └──────────┘ └──────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ 41/44    │ │ 3 alerts │ │ 52.3 MWp │ │
│  │ Online   │ │ Active   │ │ Capacity │ │
│  └──────────┘ └──────────┘ └──────────┘ │
├──────────────────────────────────────────┤
│  SITES                    Sort ▾ Filter ▾│
│  ┌──────────────────────────────────────┐│
│  │ 🟢 Cromwell Tools         412 kWh   ││
│  │    Juggle · 250 kWp · PR 84.5%      ││
│  ├──────────────────────────────────────┤│
│  │ 🟢 Man City FC            1,234 kWh ││
│  │    Juggle · 1.2 MWp · PR 81.2%     ││
│  ├──────────────────────────────────────┤│
│  │ 🔴 Park Hall              0 kWh     ││
│  │    SolarEdge · 500 kWp · OFFLINE    ││
│  ├──────────────────────────────────────┤│
│  │ 🟢 Point Lane             16.7 MWh  ││
│  │    FusionSolar · 8.6 MWp · PR 83%  ││
│  └──────────────────────────────────────┘│
├──────────────────────────────────────────┤
│  🏠 Portfolio │ ⚡ Sites │ 🔔 Alerts │ 📊│
└──────────────────────────────────────────┘
```

**Components:**
- `<StatCard>` — reusable KPI tile (value, unit, label, trend arrow)
- `<SiteList>` — sortable/filterable list (by name, generation, PR, status, platform)
- `<SiteRow>` — status dot, name, platform badge, today's kWh, PR
- `<PlatformBadge>` — coloured chip (Juggle=blue, SolarEdge=green, Solis=orange, FusionSolar=red)
- Pull-to-refresh gesture support

---

### Task 12: Site Detail Screen

**Route:** `/sites/:plantUid`

```
┌──────────────────────────────────────────┐
│  ← CROMWELL TOOLS            Juggle 🏷  │
├──────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐              │
│  │ ⚡ 412   │ │ 48.2 kW  │              │
│  │  kWh     │ │ Current  │              │
│  │ Today    │ │ Power    │              │
│  └──────────┘ └──────────┘              │
│  ┌──────────┐ ┌──────────┐              │
│  │ 84.5%    │ │ 3.21     │              │
│  │ PR       │ │ kWh/m²   │              │
│  └──────────┘ └──────────┘              │
├──────────────────────────────────────────┤
│  GENERATION TODAY                        │
│  ┌──────────────────────────────────┐   │
│  │  █                               │   │
│  │  █ █                             │   │
│  │  █ █ █                           │   │
│  │  █ █ █ █ █                       │   │
│  │  █ █ █ █ █ █                     │   │
│  │  06 08 10 12 14 16               │   │
│  └──────────────────────────────────┘   │
├──────────────────────────────────────────┤
│  INVERTERS               11/12 Online   │
│  🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🔴           │
│                          View All →     │
├──────────────────────────────────────────┤
│  ALARMS                  ⚠ 1 active     │
│  🟡 INV-04 below expected output        │
│     Since 10:30 today                   │
└──────────────────────────────────────────┘
```

**Components:**
- `<HourlyChart>` — recharts `ComposedChart` with `Bar` (generation) + `Line` (irradiance overlay)
- `<InverterGrid>` — coloured dots with tap-to-expand
- `<AlarmList>` — severity-coded cards

---

### Task 13: Inverter Detail Screen

**Route:** `/sites/:plantUid/inverters`

**Features:**
- Grid of all inverters for the site (grouped by field where applicable, e.g. Point Lane Field A / B)
- Each card shows: name, status badge, current power (kW), energy today (kWh), DC voltage, temperature
- Tap to expand per-inverter 15-min generation chart
- Colour-coded: green (producing), grey (night/standby), red (offline/fault)
- Comparison mode: overlay inverters on same chart to spot underperformers

---

### Task 14: Alerts & Faults Screen

**Route:** `/alerts`

**Features:**
- Portfolio-wide alert feed, newest first
- Filter by: severity (critical/major/minor/warning), site, status (active/acknowledged/resolved)
- Each alert card: severity badge, site name, message, device, timestamp, duration
- Tap to navigate to the affected site detail
- Badge count on tab bar icon

---

### Task 15: Revenue Screen

**Route:** `/revenue`

**Features:**
- Portfolio revenue today (£), MTD, YTD
- Current SSP (£/MWh) — live from Elexon
- Top earning sites today (ranked list)
- Hourly revenue chart (stacked by site or total)
- SSP trend line overlay
- Per-site tariff vs merchant breakdown

---

### Task 16: History & Trends Screen

**Route:** `/history` and `/sites/:plantUid/history`

**Features:**
- Date range picker (7d / 30d / 90d / custom)
- Portfolio generation line chart (recharts `AreaChart`)
- Per-site generation comparison
- PR% trend with fleet average
- Revenue accumulation curve
- Exportable data (CSV download)

---

### Task 17: Bottom Tab Navigation

**Route structure:**
```
/                              → Portfolio dashboard
/sites/:plantUid               → Site detail
/sites/:plantUid/inverters     → Inverter grid
/alerts                        → Alerts & faults
/revenue                       → Revenue & market data
/history                       → Trends
```

**Tab bar (mobile):**
| Icon | Label | Route |
|------|-------|-------|
| `LayoutDashboard` | Portfolio | `/` |
| `Zap` | Sites | scroll to site list |
| `Bell` | Alerts | `/alerts` (badge count) |
| `TrendingUp` | Revenue | `/revenue` |

---

## Phase 3: Point Lane Enhanced Integration

### Task 18: Point Lane Enhanced Data

Point Lane (FusionSolar) has richer data than other sites via the existing experimental-repo pipeline:
- **Half-hourly Stark meter data** (48 settlement periods) — from Notion HH DB
- **Hourly SSP-matched generation** — from Notion daily generation DB
- **4× daily inverter checks** (24 inverters across Field A + Field B) — from `logs/inverter_checks.csv`
- **Alarm severity breakdown** (critical/major/minor/warning) — from FusionSolar overview scrape

**Endpoint:** `GET /api/v1/mobile/sites/point-lane/enhanced`

Pulls from both the solar-platform DuckDB AND the experimental-repo Notion/CSV data to provide the richest view for this site. The site detail screen detects this and shows extra sections (HH meter chart, Stark vs FusionSolar comparison, richer alarm breakdown).

---

## Phase 4: Push Notifications & Offline

### Task 19: Web Push Notifications

**Files:**
- Backend: VAPID key generation + push subscription management endpoint
- Frontend: `apps/solar-dashboard/frontend/src/service-worker.ts`

**Triggers:**
- Site goes offline (no readings > 30 min during daylight)
- Critical alarm raised
- PR drops below threshold
- Data gap detected (MEDIUM or LONG)

Works on iOS 16.4+ Safari and all modern Android browsers.

---

### Task 20: Offline Support

**Service worker strategy:**
- Static assets: `CacheFirst` (CSS, JS, icons)
- API responses: `NetworkFirst` with 5-min stale cache fallback
- Last dashboard snapshot always available offline
- "Last updated X min ago" timestamp shown prominently when serving cached data

---

## Phase 5: Testing & Deployment

### Task 21: Backend Tests

- Mock DuckDB queries with realistic multi-site data
- Test each mobile endpoint returns valid response shapes
- Test inverter status inference logic (daylight-aware)
- Test revenue calculation with known SSP data
- Test portfolio aggregation across platforms

### Task 22: Frontend Tests

- Component tests with React Testing Library
- API hook tests with Mock Service Worker (MSW)
- Responsive layout tests (mobile / tablet / desktop viewports)
- Offline mode tests (service worker cache)

### Task 23: Deployment

**Backend:** Already deployable via solar-platform's Docker/Railway config. New endpoints are just additional FastAPI routes.

**Frontend:**
1. **Vercel** (free tier) — deploy Vite PWA, API proxy to backend
2. **Same host** — serve built PWA as static files from FastAPI (`app.mount("/", StaticFiles(...))`)
3. **Cloudflare Pages** — free global CDN, ideal for PWA

**Development workflow:**
```bash
# Backend (in solar-platform/)
uvicorn api.main:app --reload --port 8000

# Frontend (in apps/solar-dashboard/frontend/)
npm run dev  # Vite dev server on :5173, proxied to :8000
```

**Install on phone:**
1. Open `https://your-deploy-url.com` in Safari/Chrome
2. Tap "Add to Home Screen"
3. App launches fullscreen with splash icon — feels native

---

## Implementation Order

```
Phase 1: Backend API Extensions (Tasks 1–6)     — 2-3 days
  ├── Task 1: Portfolio dashboard endpoint
  ├── Task 2: Site detail endpoint
  ├── Task 3: Inverter grid endpoint
  ├── Task 4: Alerts endpoint
  ├── Task 5: Revenue endpoint
  └── Task 6: History endpoint

Phase 2: PWA Frontend (Tasks 7–17)               — 3-4 days
  ├── Task 7:  Vite + React + Tailwind scaffold
  ├── Task 8:  TypeScript types
  ├── Task 9:  API client + React Query hooks
  ├── Task 10: Theme + layout shell
  ├── Task 11: Portfolio overview screen
  ├── Task 12: Site detail screen
  ├── Task 13: Inverter detail screen
  ├── Task 14: Alerts screen
  ├── Task 15: Revenue screen
  ├── Task 16: History screen
  └── Task 17: Tab navigation

Phase 3: Point Lane Enhancement (Task 18)        — 1 day
  └── Task 18: Enhanced FusionSolar/Stark/Notion data

Phase 4: Push & Offline (Tasks 19–20)            — 1 day
  ├── Task 19: Web Push notifications
  └── Task 20: Offline caching

Phase 5: Testing & Deployment (Tasks 21–23)      — 1-2 days
  ├── Task 21: Backend tests
  ├── Task 22: Frontend tests
  └── Task 23: Deploy (Vercel/Cloudflare + FastAPI)
```

---

## Data Source Mapping (All Sites)

| App Feature | Primary Source | Backup | Refresh |
|---|---|---|---|
| Portfolio summary | DuckDB `readings` + `plants` | Notion asset register | 15-min |
| Site generation | DuckDB `readings` per plant_uid | Platform API direct | 15-min |
| Inverter status | DuckDB latest readings per emig_id | Inferred from power/voltage | 15-min |
| Alarms | DuckDB `alerts` table (rule engine) | Data gap detection | On ingestion |
| Revenue (SSP) | Elexon REST API (live) | `Elexon_Data/bmrs_data/` CSVs | Live |
| Revenue (tariff) | DuckDB `plant_tariffs` | Notion asset register | Config |
| Hourly generation | DuckDB readings, 15-min → hourly | Platform API | 15-min |
| History/trends | DuckDB readings, daily agg | Notion daily DBs | Daily |
| Point Lane extras | Notion DBs + local CSVs | FusionSolar scraper | 4×/day + nightly |
| Site metadata | Notion asset register | `sites_mapping.json` | Manual |

---

## Key Design Decisions

1. **PWA not native app** — React + TypeScript + Vite + Tailwind is the dominant frontend stack across 3 existing apps (polymarket, tickets, O-M-Tracker). recharts is proven in the O-M-Tracker. PWA gives iPhone + Android + desktop from one codebase with zero app store friction. Can wrap with Capacitor later if needed.

2. **Extend solar-platform, don't duplicate** — the solar-platform already has ingestion adapters for all platforms, DuckDB storage, services layer, and a FastAPI for all 44 sites. Adding mobile-optimised endpoints is far less work than building a separate backend.

3. **All 44 sites across 4 platforms** — Juggle/EMIG (8), SolarEdge (22), Solis (11), FusionSolar (1+). Each has an ingestion adapter. The mobile API just reads from DuckDB, which is already populated.

4. **Inverter status inferred from data** — Juggle/SolarEdge/Solis don't expose explicit status APIs. Status is inferred from power readings, data freshness, and DC voltage — same pattern as the Streamlit dashboard.

5. **Point Lane gets special treatment** — only site with the full experimental-repo pipeline (Playwright scraping, Notion sync, Stark meter, 4× daily checks). Other sites use the standard 15-min ingestion data.

6. **Elexon SSP is the only live external API call** — everything else comes from DuckDB (populated by scheduled ingestion). Keeps the mobile API fast and resilient.

7. **60-second auto-refresh + offline cache** — React Query refetches every 60s. Service worker caches last snapshot. Underlying data is 15-min resolution.

8. **Dark theme with amber accent** — solar monitoring dashboards work best dark. Amber = energy/solar connotation. Consistent with IronFuel.
