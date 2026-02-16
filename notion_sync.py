"""
FusionSolar -> Notion Sync
===========================
Scrapes daily generation data from FusionSolar's Report page and syncs
it to a Notion database. Supports:
  - Creating a new Notion database if it doesn't exist
  - Backfilling historical data from a given start date
  - Daily sync (designed to run after the 10 PM generation report)

Usage:
    python notion_sync.py --backfill             # Backfill from Dec 1 to today
    python notion_sync.py --sync-today           # Sync today's generation
    python notion_sync.py --backfill --start-date 2025-12-01
"""

import argparse
import json
import logging
import os
import re
import sys
import time
import requests
from datetime import datetime, date, timedelta
from pathlib import Path

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SCRIPT_DIR / "config.json"
LOGS_DIR = SCRIPT_DIR / "logs"
LOGS_DIR.mkdir(exist_ok=True)

# Safe stream handler for Windows cp1252 consoles
class SafeStreamHandler(logging.StreamHandler):
    def emit(self, record):
        try:
            msg = self.format(record)
            msg = msg.encode('ascii', errors='replace').decode('ascii')
            self.stream.write(msg + self.terminator)
            self.flush()
        except Exception:
            self.handleError(record)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOGS_DIR / "notion_sync.log", encoding="utf-8"),
        SafeStreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("notion_sync")

# ---------------------------------------------------------------------------
# Config & Notion setup
# ---------------------------------------------------------------------------
NOTION_TOKEN = None
NOTION_DB_ID_FILE = SCRIPT_DIR / ".notion_db_id"
DB_NAME = "FusionSolar Daily Generation"

def load_config():
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)

def get_notion_headers():
    return {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28",
    }

def save_db_id(db_id):
    """Cache the Notion DB ID locally so we don't search every time."""
    with open(NOTION_DB_ID_FILE, "w") as f:
        f.write(db_id)

def load_db_id():
    """Load cached Notion DB ID."""
    if NOTION_DB_ID_FILE.exists():
        return NOTION_DB_ID_FILE.read_text().strip()
    return None

# ---------------------------------------------------------------------------
# Notion database operations
# ---------------------------------------------------------------------------

def find_or_create_notion_db(target_parent_id=None):
    """
    Find existing database by name OR create a new one.
    If target_parent_id is provided, only return a DB if it resides under that parent.
    Otherwise create a new one under that parent.
    """
    headers = get_notion_headers()

    # Check cache first
    cached_id = load_db_id()
    if cached_id:
        # Verify it still exists and check parent if needed
        try:
            r = requests.get(f"https://api.notion.com/v1/databases/{cached_id}", headers=headers)
            if r.status_code == 200:
                data = r.json()
                # If target parent specified, verify parent matches
                if target_parent_id:
                    parent = data.get("parent", {})
                    # Parent type can be 'page_id', 'workspace', etc.
                    # We usually look for 'page_id' match
                    if parent.get("type") == "page_id" and parent.get("page_id") == target_parent_id:
                        log.info("Using cached Notion DB (parent matches): %s", cached_id)
                        return cached_id
                    else:
                        log.warning("Cached DB %s is not under target parent %s. Ignoring cache.", cached_id, target_parent_id)
                else:
                    log.info("Using cached Notion DB: %s", cached_id)
                    return cached_id
        except Exception as e:
            log.warning("Failed to verify cached DB: %s", e)

    # Search for existing database by name
    r = requests.post(
        "https://api.notion.com/v1/search",
        headers=headers,
        json={"query": DB_NAME, "filter": {"value": "database", "property": "object"}},
    )
    
    # Iterate through results to find one with matching parent (if specified)
    for db in r.json().get("results", []):
        title_arr = db.get("title", [])
        if title_arr and title_arr[0].get("plain_text") == DB_NAME:
            db_id = db["id"]
            
            if target_parent_id:
                parent = db.get("parent", {})
                if parent.get("type") == "page_id" and parent.get("page_id") == target_parent_id:
                    log.info("Found existing Notion DB under target parent: %s", db_id)
                    save_db_id(db_id)
                    return db_id
                else:
                    log.info("Found DB '%s' (%s) but parent mismatch. Skipping.", DB_NAME, db_id)
                    continue
            else:
                log.info("Found existing Notion DB: %s", db_id)
                save_db_id(db_id)
                return db_id

    # Create new database
    log.info("Creating new Notion database: %s", DB_NAME)
    
    parent_page_id = target_parent_id
    
    if not parent_page_id:
        # Search for any page the integration has access to
        r = requests.post(
            "https://api.notion.com/v1/search",
            headers=headers,
            json={"filter": {"value": "page", "property": "object"}, "page_size": 5},
        )
        pages = r.json().get("results", [])
        # Find a top-level page (parent is workspace)
        for p in pages:
            parent = p.get("parent", {})
            if parent.get("type") == "workspace":
                parent_page_id = p["id"]
                break
        if not parent_page_id and pages:
            parent_page_id = pages[0]["id"]

    if not parent_page_id:
        # Create as a top-level page first
        log.info("No accessible pages found, creating a parent page...")
        r = requests.post(
            "https://api.notion.com/v1/pages",
            headers=headers,
            json={
                "parent": {"type": "workspace", "workspace": True},
                "properties": {
                    "title": {"title": [{"text": {"content": "FusionSolar Monitoring"}}]}
                },
            },
        )
        if r.status_code in (200, 201):
            parent_page_id = r.json()["id"]
        else:
            log.error("Could not create parent page: %s", r.text)
            sys.exit(1)

    # Create the database
    payload = {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "title": [{"type": "text", "text": {"content": DB_NAME}}],
        "properties": {
            "Date": {"title": {}},
            "PV Yield (kWh)": {"number": {"format": "number"}},
            "PV Yield (MWh)": {"number": {"format": "number"}},
            "Inverter Yield (kWh)": {"number": {"format": "number"}},
            "Inverter Yield (MWh)": {"number": {"format": "number"}},
            "Alarms Critical": {"number": {"format": "number"}},
            "Alarms Major": {"number": {"format": "number"}},
            "Alarms Minor": {"number": {"format": "number"}},
            "Station": {"rich_text": {}},
        },
    }
    r = requests.post("https://api.notion.com/v1/databases", headers=headers, json=payload)
    if r.status_code != 200:
        log.error("Error creating DB: %s %s", r.status_code, r.text)
        sys.exit(1)

    db_id = r.json()["id"]
    log.info("Created Notion DB: %s", db_id)
    save_db_id(db_id)
    return db_id


def query_notion_row(db_id, date_str):
    """Check if a row already exists for a given date."""
    headers = get_notion_headers()
    r = requests.post(
        f"https://api.notion.com/v1/databases/{db_id}/query",
        headers=headers,
        json={
            "filter": {
                "property": "Date",
                "title": {"equals": date_str},
            }
        },
    )
    results = r.json().get("results", [])
    return results[0]["id"] if results else None


def upsert_notion_row(db_id, date_str, pv_kwh, inv_kwh, station_name, alarms=None):
    """Insert or update a row in the Notion database."""
    headers = get_notion_headers()

    pv_mwh = round(pv_kwh / 1000.0, 3) if pv_kwh else 0
    inv_mwh = round(inv_kwh / 1000.0, 3) if inv_kwh else 0

    props = {
        "Date": {"title": [{"text": {"content": date_str}}]},
        "PV Yield (kWh)": {"number": round(pv_kwh, 2) if pv_kwh else 0},
        "PV Yield (MWh)": {"number": pv_mwh},
        "Inverter Yield (kWh)": {"number": round(inv_kwh, 2) if inv_kwh else 0},
        "Inverter Yield (MWh)": {"number": inv_mwh},
        "Station": {"rich_text": [{"text": {"content": station_name}}]},
    }
    if alarms:
        props["Alarms Critical"] = {"number": alarms.get("critical", 0) or 0}
        props["Alarms Major"] = {"number": alarms.get("major", 0) or 0}
        props["Alarms Minor"] = {"number": alarms.get("minor", 0) or 0}

    # Check if row exists
    for attempt in range(3):
        try:
            page_id = query_notion_row(db_id, date_str)
            if page_id:
                r = requests.patch(
                    f"https://api.notion.com/v1/pages/{page_id}",
                    headers=headers,
                    json={"properties": props},
                )
            else:
                r = requests.post(
                    "https://api.notion.com/v1/pages",
                    headers=headers,
                    json={"parent": {"database_id": db_id}, "properties": props},
                )

            if r.status_code in (200, 201):
                log.info("  Synced %s: PV=%.1f kWh (%.3f MWh), Inv=%.1f kWh",
                         date_str, pv_kwh or 0, pv_mwh, inv_kwh or 0)
                return True
            elif r.status_code == 429:
                wait = 2.0 * (attempt + 1)
                log.warning("  Rate limited, waiting %.0fs...", wait)
                time.sleep(wait)
            else:
                log.error("  Notion error %d: %s", r.status_code, r.text[:200])
                return False
        except Exception as e:
            log.error("  Exception syncing %s: %s", date_str, e)
            time.sleep(1)
    return False


# ---------------------------------------------------------------------------
# FusionSolar historical data scraping
# ---------------------------------------------------------------------------

def scrape_monthly_report(page, year, month, is_first_month=True):
    """
    Scrape daily yield data from the FusionSolar Report page for a given month.
    Uses Playwright's native locator API (not JS evaluate.click()) because
    FusionSolar's dpdesign components require native browser events.
    """
    month_str = f"{year}-{month:02d}"
    log.info("Scraping report for %s...", month_str)

    if is_first_month:
        # Step 1: Open granularity dropdown using Playwright native click
        log.info("  Setting granularity to 'By month'...")
        try:
            page.locator('.dpdesign-select').first.click()
            time.sleep(1.5)

            # Click the "By month" option
            page.locator('.dpdesign-select-item-option-content').filter(has_text="By month").click()
            time.sleep(2)
            log.info("  Granularity set to 'By month'")
        except Exception as e:
            log.warning("  Failed to set granularity: %s", e)

    # Step 2: Set the month picker
    target_display = f"{year}-{month:02d}"
    log.info("  Setting date picker to %s...", target_display)
    try:
        picker_input = page.locator('#statisticTime')
        if picker_input.count() > 0:
            picker_input.click()
            time.sleep(0.5)
            # Triple-click to select all text, then type new value
            picker_input.click(click_count=3)
            time.sleep(0.3)
            picker_input.type(target_display, delay=50)
            time.sleep(0.5)
            picker_input.press('Enter')
            time.sleep(1)
        else:
            # Fallback: dpdesign-picker input
            picker_input = page.locator('.dpdesign-picker input').first
            picker_input.click(click_count=3)
            time.sleep(0.3)
            picker_input.type(target_display, delay=50)
            picker_input.press('Enter')
            time.sleep(1)
    except Exception as e:
        log.warning("  Date picker interaction failed: %s", e)

    # Step 3: Click Search using Playwright getByText
    log.info("  Clicking Search button...")
    try:
        page.locator('button.dpdesign-btn-primary').filter(has_text="Search").click()
    except Exception:
        try:
            page.get_by_role("button", name="Search").click()
        except Exception as e:
            log.warning("  Could not click Search: %s", e)
    time.sleep(5)  # Wait for data to load

    # Step 4: Extract table data
    all_rows = []
    max_pages = 10
    for pg in range(max_pages):
        rows = page.evaluate("""
            (() => {
                const results = [];
                const tbody = document.querySelector('.dpdesign-table-tbody') ||
                              document.querySelector('.nco-site-table tbody') ||
                              document.querySelector('table tbody');
                if (!tbody) return results;

                const trs = Array.from(tbody.querySelectorAll('tr'))
                    .filter(tr => !tr.classList.contains('dpdesign-table-measure-row') &&
                                  !tr.classList.contains('ant-table-measure-row'));
                for (const tr of trs) {
                    const cells = tr.querySelectorAll('td');
                    if (cells.length >= 3) {
                        const dateText = cells[0]?.textContent?.trim() || '';
                        const pvText = cells[1]?.textContent?.trim() || '';
                        const invText = cells[2]?.textContent?.trim() || '';

                        const pvVal = parseFloat(pvText.replace(/,/g, '')) || 0;
                        const invVal = parseFloat(invText.replace(/,/g, '')) || 0;

                        // Accept YYYY-MM-DD (daily "By month" view)
                        if (dateText && /^\\d{4}-\\d{2}-\\d{2}/.test(dateText)) {
                            // Extract just the date portion (strip any time component)
                            const justDate = dateText.substring(0, 10);
                            results.push({
                                date: justDate,
                                pv_kwh: pvVal,
                                inv_kwh: invVal
                            });
                        }
                    }
                }
                return results;
            })()
        """)
        log.info("  Page %d: found %d rows", pg + 1, len(rows))
        all_rows.extend(rows)

        # Check for next page
        has_next = page.evaluate("""
            (() => {
                const nextBtn = document.querySelector(
                    '.dpdesign-pagination-next:not(.dpdesign-pagination-disabled), ' +
                    '.ant-pagination-next:not(.ant-pagination-disabled)'
                );
                if (nextBtn) {
                    nextBtn.click();
                    return true;
                }
                return false;
            })()
        """)
        if not has_next:
            break
        time.sleep(2)

    log.info("  Scraped %d daily records for %s", len(all_rows), month_str)
    return all_rows


def scrape_historical_data(cfg, start_date, end_date):
    """
    Scrape daily generation data from FusionSolar for a date range.
    Uses the Report page with 'By month' granularity.
    Returns a list of dicts: [{date, pv_kwh, inv_kwh}, ...]
    """
    from playwright.sync_api import sync_playwright

    log.info("Scraping historical data: %s to %s", start_date, end_date)
    all_data = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = context.new_page()

        try:
            # Import login from the monitor script
            sys.path.insert(0, str(SCRIPT_DIR))
            from fusionsolar_monitor import login, navigate_to_page

            if not login(page, cfg):
                log.error("Login failed -- cannot scrape historical data")
                return []

            # Navigate to the report page
            navigate_to_page(page, cfg, "report")
            time.sleep(3)

            # Iterate through each month in the range
            current = date(start_date.year, start_date.month, 1)
            end_month = date(end_date.year, end_date.month, 1)

            is_first = True
            while current <= end_month:
                month_data = scrape_monthly_report(page, current.year, current.month, is_first_month=is_first)
                is_first = False
                # Filter to only include dates within our range
                for row in month_data:
                    try:
                        row_date = date.fromisoformat(row["date"])
                        if start_date <= row_date <= end_date:
                            all_data.append(row)
                    except ValueError:
                        pass

                # Move to next month
                if current.month == 12:
                    current = date(current.year + 1, 1, 1)
                else:
                    current = date(current.year, current.month + 1, 1)

        except Exception as e:
            log.exception("Error scraping historical data: %s", e)
        finally:
            browser.close()

    log.info("Total scraped: %d daily records", len(all_data))
    return all_data


def sync_today_from_overview(cfg, db_id):
    """
    Quick sync of today's data using the overview page (same as --report).
    Faster than scraping the full report table.
    """
    from playwright.sync_api import sync_playwright

    log.info("Syncing today's generation to Notion...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = context.new_page()

        try:
            sys.path.insert(0, str(SCRIPT_DIR))
            from fusionsolar_monitor import login, navigate_to_page, extract_overview_data

            if not login(page, cfg):
                log.error("Login failed -- cannot sync today")
                return False

            navigate_to_page(page, cfg, "overview")
            data = extract_overview_data(page)

            yield_val = data.get("yield_today_value", "0")
            yield_unit = data.get("yield_today_unit", "kWh")
            alarms = data.get("alarms", {})

            # Convert to kWh
            try:
                kwh = float(yield_val.replace(",", ""))
                if yield_unit.lower() == "mwh":
                    kwh *= 1000
                elif yield_unit.lower() == "gwh":
                    kwh *= 1000000
            except (ValueError, AttributeError):
                kwh = 0

            today_str = date.today().isoformat()
            upsert_notion_row(
                db_id,
                today_str,
                pv_kwh=kwh,
                inv_kwh=kwh,  # Overview doesn't split PV vs Inverter
                station_name=cfg.get("station_name", "Point Lane Solar Farm"),
                alarms=alarms,
            )
            return True

        except Exception as e:
            log.exception("Error syncing today: %s", e)
            return False
        finally:
            browser.close()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    global NOTION_TOKEN

    parser = argparse.ArgumentParser(
        description="FusionSolar -> Notion Daily Generation Sync",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--backfill", action="store_true", help="Backfill historical data")
    parser.add_argument("--sync-today", action="store_true", help="Sync today's generation")
    parser.add_argument("--start-date", default="2025-12-01", help="Backfill start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", default=None, help="Backfill end date (default: today)")
    parser.add_argument("--notion-token", default=None, help="Notion API token")

    args = parser.parse_args()

    if not any([args.backfill, args.sync_today]):
        parser.print_help()
        sys.exit(1)

    # Load config
    cfg = load_config()

    # Get Notion token from args, config, or environment
    NOTION_TOKEN = (
        args.notion_token
        or cfg.get("notion_token")
        or os.environ.get("NOTION_TOKEN")
    )
    if not NOTION_TOKEN:
        log.error("No Notion token found. Provide via --notion-token, config.json, or NOTION_TOKEN env var")
        sys.exit(1)

    # Find or create the Notion database
    db_id = find_or_create_notion_db(target_parent_id=cfg.get("notion_parent_page_id"))
    log.info("Notion DB ID: %s", db_id)

    if args.backfill:
        start = date.fromisoformat(args.start_date)
        end = date.fromisoformat(args.end_date) if args.end_date else date.today()

        log.info("=" * 60)
        log.info("BACKFILL: %s to %s", start, end)
        log.info("=" * 60)

        # Scrape historical data from FusionSolar
        historical = scrape_historical_data(cfg, start, end)

        if not historical:
            log.warning("No historical data scraped!")
            return

        # Sync to Notion
        station_name = cfg.get("station_name", "Point Lane Solar Farm")
        success = 0
        for row in historical:
            ok = upsert_notion_row(
                db_id,
                row["date"],
                pv_kwh=row.get("pv_kwh", 0),
                inv_kwh=row.get("inv_kwh", 0),
                station_name=station_name,
            )
            if ok:
                success += 1
            time.sleep(0.35)  # Respect Notion rate limits

        log.info("Backfill complete: %d/%d rows synced", success, len(historical))

    if args.sync_today:
        log.info("=" * 60)
        log.info("SYNC TODAY: %s", date.today())
        log.info("=" * 60)
        sync_today_from_overview(cfg, db_id)
        log.info("Today sync complete")


if __name__ == "__main__":
    main()
