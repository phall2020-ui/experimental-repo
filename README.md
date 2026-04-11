# experimental-repo

Umbrella workspace for non-core projects and scheduled data pipelines. Active apps are in `apps/`; superseded or parked work is in `archive/`.

## Active apps

| App | What it does |
|-----|-------------|
| `solar-dashboard` | Streamlit solar generation dashboard (frontend in `solar-dashboard/frontend/`) |
| `tickets` | Early ticketing prototype (superseded by the standalone Ticketing project) |
| `fitness-app` | Personal fitness tracking app |
| `polymarket-spike-bot-v1` | Polymarket price-spike monitoring bot (v1 spike) |

## Scheduled pipelines (repo root)

These scripts run on a schedule via GitHub Actions and/or local launchd:

| Script | Schedule | What it does |
|--------|----------|-------------|
| `nightly_sync.py` | 22:30 UTC | Runs FusionSolar → Notion sync, Elexon SSP fetch, and Stark HH scrape in sequence |
| `stark_daily_sync.py` | — | Syncs Stark HH generation data (SP01–SP48, kWh + SSP £/MWh) to Notion |
| `fusionsolar_monitor.py` | — | Polls Huawei FusionSolar and sends alerts |
| `notion_sync.py` | — | Pushes generation summaries to Notion |
| `calculations.py` | — | Elexon SSP and generation calculations |

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp config.example.json config.json
# edit config.json — Notion token, site IDs, Stark credentials
```

## Running pipelines manually

```bash
python nightly_sync.py              # yesterday + today
python nightly_sync.py --days 3     # last 3 days
python nightly_sync.py --no-fusion  # skip FusionSolar, Elexon + Stark only
python stark_daily_sync.py --start 2025-12-01 --end 2026-03-01
```

## Known issues

- `fusionsolar_monitor.py` exits non-zero when all devices are offline — this causes the GitHub Actions CI run to fail; the failure is expected when the Huawei site is unreachable
- `archive/` contains historical work from before the main Projects/ repos were created; nothing there should be relied on
