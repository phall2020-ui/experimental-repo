# Findings

## Code Inspection
- `stark_daily_sync.py` always loads `config.json` from the project root and requires Notion auth before it can run.
- N2EX reference pricing is provider-driven: `point_lane.market_data_provider` / `POINT_LANE_MARKET_DATA_PROVIDER` selects `nordpool_n2ex_api` or `epex_gb_da_eod_sftp`.
- `services/point_lane_revenue.py` can override Point Lane contract parameters via env vars, but all have config/default fallbacks.
- Nord Pool OAuth requires four secrets: `NORDPOOL_USERNAME`, `NORDPOOL_PASSWORD`, `NORDPOOL_CLIENT_ID`, `NORDPOOL_CLIENT_SECRET`.
- EPEX SFTP fallback requires `EPEX_SFTP_HOST`, `EPEX_SFTP_USERNAME`, `EPEX_SFTP_PASSWORD` when cache files are absent; port/path have defaults.
- Notion auth comes from `config.json:notion_token` or `NOTION_TOKEN`; DB IDs can come from config or env.
- Stark generation scraping still consumes `stark.username/password/site_name/search_text` from `config.json`, while the underlying scraper also supports `STARK_*` env fallbacks.

## Credentials / Config
- Required auth/secrets before a real run: Notion token; Stark username/password; and Nord Pool or EPEX credentials depending on selected market provider.
- Required Notion identifiers: either `notion_database_id`/`NOTION_DATABASE_ID` or `notion_parent_page_id` for DB discovery. `notion_fusionsolar_db_id` is optional for variance checks only.
- Required Point Lane config is already present in `config.example.json` under `point_lane` and should be copied unchanged into `config.json`.
