"""
stark_daily_sync.py
====================
Creates (or finds) a NEW Notion database called "Stark HH Daily Data" and
syncs one row per calendar day.

Schema (98 properties):
  Date             – title  (YYYY-MM-DD, acts as primary key)
  Total kWh        – number
  SP01_kWh … SP48_kWh  – number (each half-hour's generation in kWh)
  SP01_SSP … SP48_SSP  – number (system sell price £/MWh for that SP)

Data sources (local files, no browser required):
  stark_data/stark_hh_data_{date}.csv          – HH generation (Active Power kW → ×0.5 = kWh)
  Elexon_Data/bmrs_data/system_prices_{date}.csv – Elexon SSP (SettlementPeriod, SystemSellPrice)
  Falls back to Elexon_Data/combined_system_prices.csv when daily file is absent.

Usage:
  python stark_daily_sync.py                            # all available Stark CSVs
  python stark_daily_sync.py --start 2025-12-01 --end 2026-02-18
  python stark_daily_sync.py --start 2025-12-01         # end defaults to today
"""

import argparse
import csv
import json
import os
import sys
import time
import requests
from datetime import date, datetime, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# Paths & config
# ---------------------------------------------------------------------------
SCRIPT_DIR   = Path(__file__).resolve().parent
CONFIG_PATH  = SCRIPT_DIR / "config.json"
DB_ID_FILE   = SCRIPT_DIR / ".notion_stark_daily_db_id"
STARK_DIR    = SCRIPT_DIR / "stark_data"          # legacy consumption CSVs — not used
GEN_DIR      = SCRIPT_DIR / "stark_gen_data"      # freshly scraped generation CSVs
SSP_DIR      = SCRIPT_DIR / "Elexon_Data" / "bmrs_data"
SSP_COMBINED = SCRIPT_DIR / "Elexon_Data" / "combined_system_prices.csv"
FETCH_SCRIPT = SCRIPT_DIR / "Elexon_Data" / "fetch_elexon_data.py"

GEN_DIR.mkdir(exist_ok=True)

DB_NAME = "Stark HH Daily Data"

SP_LABELS = [f"SP{i:02d}" for i in range(1, 49)]   # SP01 … SP48


def load_config():
    with open(CONFIG_PATH) as f:
        return json.load(f)


def headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }


# ---------------------------------------------------------------------------
# Notion DB: find or create
# ---------------------------------------------------------------------------
def _db_schema_props():
    """Return the full properties dict for DB creation (98 fields)."""
    props = {"Date": {"title": {}}, "Total kWh": {"number": {"format": "number"}}}
    for sp in SP_LABELS:
        props[f"{sp}_kWh"] = {"number": {"format": "number"}}
        props[f"{sp}_SSP"] = {"number": {"format": "number"}}
    return props


def find_or_create_db(token, parent_page_id):
    h = headers(token)

    # Check cache
    if DB_ID_FILE.exists():
        db_id = DB_ID_FILE.read_text().strip()
        r = requests.get(f"https://api.notion.com/v1/databases/{db_id}", headers=h)
        if r.status_code == 200:
            print(f"[DB] Using cached DB: {db_id}")
            return db_id
        print("[DB] Cached ID invalid, searching…")

    # Search by name
    r = requests.post(
        "https://api.notion.com/v1/search", headers=h,
        json={"query": DB_NAME, "filter": {"value": "database", "property": "object"}},
    )
    for db in r.json().get("results", []):
        title_arr = db.get("title", [])
        if title_arr and title_arr[0].get("plain_text") == DB_NAME:
            db_id = db["id"]
            DB_ID_FILE.write_text(db_id)
            print(f"[DB] Found existing DB: {db_id}")
            return db_id

    # Create new DB
    print(f"[DB] Creating new Notion DB: '{DB_NAME}' …")
    if not parent_page_id:
        sys.exit("ERROR: notion_parent_page_id missing from config.json")

    payload = {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "title": [{"type": "text", "text": {"content": DB_NAME}}],
        "properties": _db_schema_props(),
    }
    r = requests.post("https://api.notion.com/v1/databases", headers=h, json=payload)
    if r.status_code != 200:
        sys.exit(f"ERROR creating DB: {r.status_code} {r.text[:400]}")
    db_id = r.json()["id"]
    DB_ID_FILE.write_text(db_id)
    print(f"[DB] Created DB: {db_id}")
    return db_id


def ensure_schema(token, db_id):
    """Add any SP columns missing from an existing DB (safe to call every run)."""
    h = headers(token)
    r = requests.get(f"https://api.notion.com/v1/databases/{db_id}", headers=h)
    r.raise_for_status()
    existing = set(r.json().get("properties", {}).keys())
    missing = {}
    for sp in SP_LABELS:
        for suffix in ("_kWh", "_SSP"):
            name = f"{sp}{suffix}"
            if name not in existing:
                missing[name] = {"number": {"format": "number"}}
    if "Total kWh" not in existing:
        missing["Total kWh"] = {"number": {"format": "number"}}
    if missing:
        print(f"[DB] Adding {len(missing)} missing columns…")
        requests.patch(
            f"https://api.notion.com/v1/databases/{db_id}",
            headers=h,
            json={"properties": missing},
        )


# ---------------------------------------------------------------------------
# Notion row upsert
# ---------------------------------------------------------------------------
def query_page_id(token, db_id, date_str):
    h = headers(token)
    r = requests.post(
        f"https://api.notion.com/v1/databases/{db_id}/query", headers=h,
        json={"filter": {"property": "Date", "title": {"equals": date_str}}},
    )
    results = r.json().get("results", [])
    return results[0]["id"] if results else None


def upsert_day(token, db_id, date_str, sp_kwh, sp_ssp):
    """
    sp_kwh: dict {1: 0.0, …, 48: 1.23}
    sp_ssp: dict {1: 75.66, …, 48: 80.1}  (partial OK)
    """
    h = headers(token)
    total = round(sum(sp_kwh.values()), 4)

    props = {
        "Date": {"title": [{"text": {"content": date_str}}]},
        "Total kWh": {"number": total},
    }
    for i in range(1, 49):
        sp_key = f"SP{i:02d}"
        kwh = sp_kwh.get(i)
        ssp = sp_ssp.get(i)
        if kwh is not None:
            props[f"{sp_key}_kWh"] = {"number": round(kwh, 5)}
        if ssp is not None:
            props[f"{sp_key}_SSP"] = {"number": round(ssp, 4)}

    for attempt in range(4):
        page_id = query_page_id(token, db_id, date_str)
        if page_id:
            r = requests.patch(
                f"https://api.notion.com/v1/pages/{page_id}", headers=h,
                json={"properties": props},
            )
        else:
            r = requests.post(
                "https://api.notion.com/v1/pages", headers=h,
                json={"parent": {"database_id": db_id}, "properties": props},
            )
        if r.status_code in (200, 201):
            return True, total
        if r.status_code == 429:
            wait = 3.0 * (attempt + 1)
            print(f"    Rate-limited – sleeping {wait:.0f}s…")
            time.sleep(wait)
        else:
            print(f"    WARN Notion {r.status_code}: {r.text[:200]}")
            return False, 0
    return False, 0


# ---------------------------------------------------------------------------
# Parse Stark CSV → {sp_number: kwh}
# ---------------------------------------------------------------------------
def parse_stark_csv(path):
    sp_kwh = {}
    with open(path, encoding="utf-8-sig", newline="") as f:
        rows = list(csv.reader(f))

    header_idx = next(
        (i for i, r in enumerate(rows) if r and r[0].strip() == "Period"), None
    )
    if header_idx is None:
        return sp_kwh

    value_header = rows[header_idx][1].strip().lower() if len(rows[header_idx]) > 1 else ""
    is_power_kw = "power" in value_header and "kw" in value_header

    sp = 1
    for row in rows[header_idx + 1:]:
        if not row or not row[0].strip():
            continue
        try:
            raw = float(str(row[1]).replace(",", "")) if len(row) > 1 and row[1].strip() else 0.0
        except ValueError:
            raw = 0.0
        sp_kwh[sp] = (raw * 0.5) if is_power_kw else raw
        sp += 1
        if sp > 48:
            break
    return sp_kwh


# ---------------------------------------------------------------------------
# Load SSP  →  {sp_number: ssp_gbp_per_mwh}
# (tries daily file first, then falls back to combined CSV)
# ---------------------------------------------------------------------------
_combined_ssp_cache = None   # loaded once when needed


def _load_combined_cache():
    global _combined_ssp_cache
    if _combined_ssp_cache is not None:
        return
    _combined_ssp_cache = {}
    if not SSP_COMBINED.exists():
        return
    with open(SSP_COMBINED, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            d = row.get("SettlementDate", "").strip()
            sp_raw = row.get("SettlementPeriod", "").strip()
            ssp_raw = row.get("SystemSellPrice", "").strip()
            if not d or not sp_raw or not ssp_raw:
                continue
            try:
                _combined_ssp_cache.setdefault(d, {})[int(sp_raw)] = float(ssp_raw)
            except (ValueError, TypeError):
                pass
    print(f"[SSP] Loaded combined cache: {len(_combined_ssp_cache)} dates")


def load_ssp(date_str):
    # 1. Daily file
    daily = SSP_DIR / f"system_prices_{date_str}.csv"
    if daily.exists():
        result = {}
        with open(daily, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                sp_raw = row.get("SettlementPeriod", "").strip()
                ssp_raw = row.get("SystemSellPrice", "").strip()
                if sp_raw and ssp_raw:
                    try:
                        result[int(sp_raw)] = float(ssp_raw)
                    except (ValueError, TypeError):
                        pass
        if result:
            return result

    # 2. Combined fallback
    _load_combined_cache()
    return _combined_ssp_cache.get(date_str, {})


# ---------------------------------------------------------------------------
# Scrape one date fresh from Stark → stark_gen_data/
# ---------------------------------------------------------------------------
def scrape_generation(cfg, d):
    """
    Call stark_scraper.run() for date d, saving into stark_gen_data/.
    Returns Path to CSV or None on failure.
    """
    import importlib.util
    scraper_path = SCRIPT_DIR / "stark_scraper.py"
    if not scraper_path.exists():
        print("  [SCRAPE] stark_scraper.py not found")
        return None

    spec   = importlib.util.spec_from_file_location("stark_scraper", str(scraper_path))
    scraper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(scraper)

    stark_cfg  = cfg.get("stark", {})
    result = scraper.run(
        date_str   = d.isoformat(),
        username   = stark_cfg.get("username"),
        password   = stark_cfg.get("password"),
        site_name  = stark_cfg.get("site_name"),
        search_text= stark_cfg.get("search_text"),
        output_dir = str(GEN_DIR),
        headless   = True,
    )
    if result:
        return Path(result)
    return None


# ---------------------------------------------------------------------------
# Main sync loop
# ---------------------------------------------------------------------------
def all_dates(start, end):
    """Every calendar date in [start, end]."""
    dates, d = [], start
    while d <= end:
        dates.append(d)
        d += timedelta(days=1)
    return dates


def main():
    parser = argparse.ArgumentParser(description="Sync Stark HH generation → Notion (one row per day)")
    parser.add_argument("--start", default="2025-12-01", help="Start date YYYY-MM-DD")
    parser.add_argument("--end",   default=None,          help="End date  YYYY-MM-DD (default: today)")
    args = parser.parse_args()

    start = date.fromisoformat(args.start)
    end   = date.fromisoformat(args.end) if args.end else date.today()

    cfg   = load_config()
    token = cfg.get("notion_token") or os.environ.get("NOTION_TOKEN")
    if not token:
        sys.exit("ERROR: No notion_token in config.json or NOTION_TOKEN env var")

    parent_page_id = cfg.get("notion_parent_page_id")

    # ---- DB setup ----------------------------------------------------------
    db_id = find_or_create_db(token, parent_page_id)
    ensure_schema(token, db_id)
    print(f"[DB] DB ID  : {db_id}")
    print(f"[DB] Range  : {start} → {end}")
    print(f"[DB] GenDir : {GEN_DIR}")
    print()

    dates = all_dates(start, end)
    print(f"[SYNC] {len(dates)} dates to process\n")

    ok_count = 0
    fail_count = 0
    scrape_fail = 0
    total_kwh_all = 0.0

    for i, d in enumerate(dates, 1):
        date_str = d.isoformat()
        prefix   = f"  [{i:>3}/{len(dates)}] {date_str}"

        # 1. Scrape fresh generation data from Stark (always — never use old CSVs)
        csv_path = scrape_generation(cfg, d)
        if not csv_path:
            print(f"{prefix}  SCRAPE-FAIL")
            sys.stdout.flush()
            scrape_fail += 1
            fail_count  += 1
            continue

        # 2. Parse Active Power CSV into SP kWh
        sp_kwh = parse_stark_csv(csv_path)
        if not sp_kwh:
            print(f"{prefix}  PARSE-FAIL  ({csv_path.name})")
            sys.stdout.flush()
            fail_count += 1
            continue

        # 3. Load SSP
        sp_ssp   = load_ssp(date_str)
        has_ssp  = bool(sp_ssp)

        # 4. Upsert to Notion
        ok, total = upsert_day(token, db_id, date_str, sp_kwh, sp_ssp)

        status   = "OK  " if ok else "FAIL"
        ssp_note = f"SSP={len(sp_ssp)}/48SPs" if has_ssp else "SSP=none"
        print(f"{prefix}  {status}  gen={total:.2f} kWh  {ssp_note}")
        sys.stdout.flush()

        if ok:
            ok_count      += 1
            total_kwh_all += total
        else:
            fail_count += 1

        time.sleep(0.35)   # gentle on Notion rate limits

    print()
    print("=" * 60)
    print(f"COMPLETE  OK={ok_count}  SCRAPE-FAIL={scrape_fail}  FAIL={fail_count}")
    print(f"TOTAL generation : {total_kwh_all:.1f} kWh")
    print(f"DB ID  : {db_id}")
    print(f"DB URL : https://notion.so/{db_id.replace('-', '')}")
    print("=" * 60)


if __name__ == "__main__":
    main()
