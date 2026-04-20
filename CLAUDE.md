# experimental-repo

Multi-app workspace with scheduled data syncs for ADE portfolio data.

## What it does
Scheduled ingestion and sync of energy market data, half-hourly metering, and Notion updates.

## Key scripts
```bash
source .venv/bin/activate
python nightly_sync.py           # Stark, Elexon, Notion nightly sync
python stark_scraper.py          # Stark HH metering scrape
python fusionsolar_monitor.py    # FusionSolar monitoring
python notion_sync.py            # Notion sync
python calculations.py           # Portfolio calculations
python market_data/nordpool_n2ex_api.py   # N2EX market data
python services/n2ex_reference_price.py  # Point Lane revenue service
```

## Deployment
GitHub Actions CI/CD (scheduled and manual triggers).

## Key details
- Python 3.9+
- Dependencies: `pip` + `requirements.txt`
- Secrets: `.env` (python-dotenv)
- Recent: N2EX market data integration, Point Lane revenue service, Elexon BMRS data ingestion (2026-04-08 to 2026-04-11)

## Known gaps
- CI occasionally fails due to FusionSolar offline device exit-code issue
```
