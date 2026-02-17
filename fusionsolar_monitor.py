"""
FusionSolar Monitor -- Point Lane Solar Farm
============================================
Automates inverter status checks and daily generation reporting
via Playwright browser automation against the Huawei FusionSolar portal.

Usage:
    python fusionsolar_monitor.py --check        # Check inverter statuses
    python fusionsolar_monitor.py --report       # Report total generation
    python fusionsolar_monitor.py --test-login   # Test login only
    python fusionsolar_monitor.py --check --dry-run   # Print but don't log
"""

import argparse
import csv
import json
import logging
import os
import re
import sys
import subprocess
import time
from datetime import datetime, date
from pathlib import Path

from calculations import inverter_availability

# ---------------------------------------------------------------------------
# Setup paths relative to this script
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SCRIPT_DIR / "config.json"
LOGS_DIR = SCRIPT_DIR / "logs"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOGS_DIR.mkdir(exist_ok=True)

# Safe stream handler for Windows cp1252 consoles
class SafeStreamHandler(logging.StreamHandler):
    def emit(self, record):
        try:
            msg = self.format(record)
            # Replace problematic Unicode chars with ASCII equivalents
            msg = msg.encode('ascii', errors='replace').decode('ascii')
            self.stream.write(msg + self.terminator)
            self.flush()
        except Exception:
            self.handleError(record)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOGS_DIR / "monitor.log", encoding="utf-8"),
        SafeStreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("fusionsolar_monitor")

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
def load_config():
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)

# ---------------------------------------------------------------------------
# Browser automation helpers
# ---------------------------------------------------------------------------

def build_station_url(cfg, page_name="overview"):
    """Build full station URL for a given portal sub-page."""
    base = cfg["portal_base"]
    params = cfg["portal_params"]
    code = cfg["station_code"]
    return f"{base}?{params}#/view/station/{code}/{page_name}"


def login(page, cfg, timeout_ms=30000):
    """
    Log in to FusionSolar via the SSO login page.
    Returns True on success, False on failure.
    """
    login_url = f"https://{cfg['domain']}/unisso/login.action"
    log.info("Navigating to login page: %s", login_url)
    page.goto(login_url, wait_until="networkidle", timeout=timeout_ms)
    time.sleep(2)

    # Dismiss cookie banner if present
    try:
        page.evaluate("""
            (() => {
                const btns = document.querySelectorAll('button, a, div');
                for (const b of btns) {
                    const txt = b.textContent?.toLowerCase() || '';
                    if (txt.includes('accept') || txt.includes('agree') || txt.includes('got it')) {
                        b.click();
                        break;
                    }
                }
            })()
        """)
        time.sleep(1)
    except Exception:
        pass  # No banner, that's fine

    username = cfg["credentials"]["username"]
    password = cfg["credentials"]["password"]

    # Focus + type username
    log.info("Entering credentials for user: %s", username)
    page.evaluate("document.getElementById('username').focus()")
    page.fill("#username", username)
    time.sleep(0.5)

    # Focus + type password
    page.evaluate("document.getElementById('value').focus()")
    page.fill("#value", password)
    time.sleep(0.5)

    # Submit via Enter key (more reliable than clicking the Login button)
    page.press("#value", "Enter")
    log.info("Login submitted, waiting for redirect...")

    # Wait for redirect
    try:
        page.wait_for_url("**/cloud.html**", timeout=timeout_ms)
        log.info("Login successful -- redirected to portal")
        return True
    except Exception:
        # Fallback: check if we're still on login
        current = page.url
        if "login" in current.lower():
            log.error("Login appears to have failed. Current URL: %s", current)
            try:
                error_text = page.evaluate("""
                    document.querySelector('.error-msg, .noti-bear-text, .login-error')?.textContent || ''
                """)
                if error_text:
                    log.error("Login error message: %s", error_text)
            except Exception:
                pass
            return False
        else:
            log.info("Login likely succeeded (URL: %s)", current)
            return True


def navigate_to_page(page, cfg, page_name, timeout_ms=20000):
    """Navigate to a specific station sub-page and wait for it to load."""
    url = build_station_url(cfg, page_name)
    log.info("Navigating to %s: %s", page_name, url)
    page.goto(url, wait_until="networkidle", timeout=timeout_ms)
    time.sleep(3)  # Extra settle time for SPA rendering


# ---------------------------------------------------------------------------
# Data extraction
# ---------------------------------------------------------------------------

def extract_inverter_statuses(page):
    """
    Extract inverter/device statuses from the Device Management page.
    Handles pagination (default 10 per page, ~29 devices = 3 pages).
    Returns a list of dicts: [{name, type, status, ...}, ...]
    """
    time.sleep(3)  # Allow table to render
    all_devices = []
    page_num = 0
    max_pages = 5  # Safety limit

    while page_num < max_pages:
        page_num += 1
        devices_on_page = page.evaluate("""
            (() => {
                const results = [];
                // Skip the hidden measure row used by Ant Design for column sizing
                const rows = Array.from(document.querySelectorAll('.ant-table-tbody tr'))
                    .filter(tr => !tr.classList.contains('ant-table-measure-row'));
                for (const row of rows) {
                    const cells = row.querySelectorAll('td');
                    if (cells.length >= 5) {
                        // FusionSolar Ant Design column order:
                        //  [0] Checkbox (selection)
                        //  [1] Status icon (nco-pv-table-device-status-icon with title="Idle"/"Online" etc.)
                        //  [2] Device Name (as <a> link)
                        //  [3] Plant Name
                        //  [4] Device Type
                        //  [5] Software Version
                        //  [6] Serial Number (SN)
                        const statusCell = cells[1];
                        const name = cells[2]?.textContent?.trim() || '';
                        const plant = cells[3]?.textContent?.trim() || '';
                        const devType = cells[4]?.textContent?.trim() || '';
                        const sn = cells[6]?.textContent?.trim() || '';

                        // Read status from the icon's title attribute (e.g. "Idle", "Online", "Offline")
                        const statusIcon = statusCell.querySelector('[title], [class*="status-icon"]');
                        const statusTitle = statusIcon?.title || statusIcon?.getAttribute('title') || '';
                        const statusClass = statusIcon?.className || '';

                        // Map status title to standard status strings
                        let status = statusTitle || 'Unknown';
                        const lower = status.toLowerCase();
                        if (lower === 'idle' || lower === 'standby') {
                            status = 'Standby';
                        } else if (lower === 'online' || lower === 'running' || lower === 'connected' || lower === 'normal') {
                            status = 'Online';
                        } else if (lower === 'offline' || lower === 'disconnected' || lower === 'fault' || lower === 'alarm') {
                            status = 'Offline';
                        }

                        if (name) {
                            results.push({
                                name: name,
                                plant: plant,
                                type: devType,
                                sn: sn,
                                status: status,
                                statusTitle: statusTitle,
                                statusClass: statusClass
                            });
                        }
                    }
                }
                return results;
            })()
        """)

        all_devices.extend(devices_on_page)
        log.info("Page %d: found %d devices (total: %d)", page_num, len(devices_on_page), len(all_devices))

        # Try to click the next page button
        has_next = page.evaluate("""
            (() => {
                const nextBtn = document.querySelector('.ant-pagination-next:not(.ant-pagination-disabled), li.ant-pagination-next button:not([disabled])');
                if (nextBtn && !nextBtn.closest('.ant-pagination-disabled')) {
                    nextBtn.click();
                    return true;
                }
                return false;
            })()
        """)

        if not has_next:
            break
        time.sleep(2)  # Allow next page to render

    return all_devices


def extract_overview_data(page):
    """
    Extract station overview data: yield today, total yield, alarms, etc.
    Uses targeted DOM queries + Python-side regex (avoids JS regex escaping issues).
    Returns a dict with the available data.
    """
    time.sleep(3)  # Allow data to render
    data = {}

    # Method 1: Query .nameArea/.valueArea card pairs (FusionSolar's structure)
    try:
        cards = page.evaluate("""
            (() => {
                const items = [];
                const names = document.querySelectorAll('.nameArea .name, [class*="nameArea"] [class*="name"]');
                for (const ns of names) {
                    const label = ns.textContent.trim();
                    const container = ns.closest('[class*="cardItem"], [class*="card"]') || ns.parentElement.parentElement;
                    if (!container) continue;
                    const valEl = container.querySelector('.valueArea .value, [class*="valueArea"] [class*="value"]');
                    const unitEl = container.querySelector('.valueArea .unit, [class*="valueArea"] [class*="unit"]');
                    items.push({
                        label: label,
                        value: valEl ? valEl.textContent.trim() : '',
                        unit: unitEl ? unitEl.textContent.trim() : ''
                    });
                }
                return items;
            })()
        """)
        for card in cards:
            label = card.get("label", "").lower()
            if "yield today" in label:
                data["yield_today_value"] = card["value"]
                data["yield_today_unit"] = card["unit"]
            elif "total yield" in label:
                data["total_yield_value"] = card["value"]
                data["total_yield_unit"] = card["unit"]
            elif "revenue" in label:
                data["revenue"] = card["value"]
            elif any(kw in label for kw in ["irradiance", "irradiation", "solar radiation", "global"]):
                data["irradiance_value"] = card["value"]
                data["irradiance_unit"] = card["unit"]
    except Exception as e:
        log.warning("Method 1 (card selectors) failed: %s", e)

    # Method 2: If Method 1 missed yield, try full page text parsing in Python
    if "yield_today_value" not in data:
        try:
            page_text = page.evaluate("document.body.innerText")
            # On the page, values appear BEFORE their labels: "16.69 MWh\nYield today"
            yield_match = re.search(
                r'([\d.,]+)\s*(kWh|MWh)[\s\S]{0,30}Yield\s*today',
                page_text, re.IGNORECASE
            )
            if yield_match:
                data["yield_today_value"] = yield_match.group(1)
                data["yield_today_unit"] = yield_match.group(2)
            total_match = re.search(
                r'([\d.,]+)\s*(kWh|MWh|GWh)[\s\S]{0,30}Total\s*yield',
                page_text, re.IGNORECASE
            )
            if total_match:
                data["total_yield_value"] = total_match.group(1)
                data["total_yield_unit"] = total_match.group(2)
            # Also try to find irradiance in overview text
            irr_match = re.search(
                r'([\d.,]+)\s*(kWh/m|W/m|MJ/m)[\s\S]{0,30}(?:irradiance|irradiation|solar\s*radiation)',
                page_text, re.IGNORECASE
            )
            if irr_match and "irradiance_value" not in data:
                data["irradiance_value"] = irr_match.group(1)
                data["irradiance_unit"] = irr_match.group(2)
        except Exception as e:
            log.warning("Method 2 (text regex) failed: %s", e)

    # Alarm counts -- simple text parsing in Python
    try:
        page_text = page.evaluate("document.body.innerText")
        alarms = {}
        for level in ["critical", "major", "minor", "warning"]:
            m = re.search(level + r'\s*(\d+)', page_text, re.IGNORECASE)
            alarms[level] = int(m.group(1)) if m else None
        data["alarms"] = alarms
    except Exception as e:
        log.warning("Alarm extraction failed: %s", e)
        data["alarms"] = {}

    return data


def extract_inverter_report(page):
    """
    Extract per-inverter yield data from the Report page (Inverter tab).
    Returns a list of dicts with inverter name and daily yield.
    """
    time.sleep(3)

    # Try clicking the Inverter tab if there's one
    try:
        page.evaluate("""
            (() => {
                const tabs = document.querySelectorAll('.ant-tabs-tab-btn, [role="tab"]');
                for (const tab of tabs) {
                    if (tab.textContent.toLowerCase().includes('inverter')) {
                        tab.click();
                        break;
                    }
                }
            })()
        """)
        time.sleep(3)
    except Exception:
        pass

    inverters = page.evaluate("""
        (() => {
            const results = [];
            const rows = document.querySelectorAll('.ant-table-tbody tr, table tbody tr');
            for (const row of rows) {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const name = cells[0]?.textContent?.trim() || '';
                    const yield_val = cells[1]?.textContent?.trim() || '';
                    if (name && name !== '') {
                        results.push({ name, yield: yield_val });
                    }
                }
            }
            return results;
        })()
    """)
    return inverters


# ---------------------------------------------------------------------------
# Logging helpers -- write to CSV
# ---------------------------------------------------------------------------

def log_inverter_check(devices, dry_run=False):
    """Write inverter check results to CSV."""
    csv_path = LOGS_DIR / "inverter_checks.csv"
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    is_new = not csv_path.exists()

    if dry_run:
        log.info("[DRY RUN] Would write %d device records to %s", len(devices), csv_path)
        return

    with open(csv_path, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if is_new:
            writer.writerow(["timestamp", "device_name", "device_type", "status", "status_class"])
        for dev in devices:
            writer.writerow([
                ts,
                dev.get("name", ""),
                dev.get("type", ""),
                dev.get("status", ""),
                dev.get("statusClass", ""),
            ])
    log.info("Wrote %d device records to %s", len(devices), csv_path)


def log_generation(data, dry_run=False):
    """Write daily generation record to CSV."""
    csv_path = LOGS_DIR / "daily_generation.csv"
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    today = date.today().isoformat()
    is_new = not csv_path.exists()

    yield_val = data.get("yield_today_value", "N/A")
    yield_unit = data.get("yield_today_unit", "")
    total_val = data.get("total_yield_value", "N/A")
    total_unit = data.get("total_yield_unit", "")
    alarms = data.get("alarms", {})
    irr_val = data.get("irradiance_value", "N/A")
    irr_unit = data.get("irradiance_unit", "")

    if dry_run:
        log.info("[DRY RUN] Would write generation record: %s %s", yield_val, yield_unit)
        return

    with open(csv_path, "a", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        if is_new:
            writer.writerow([
                "timestamp", "date", "yield_today", "yield_unit",
                "total_yield", "total_unit",
                "irradiance", "irradiance_unit",
                "alarms_critical", "alarms_major", "alarms_minor", "alarms_warning"
            ])
        writer.writerow([
            ts, today, yield_val, yield_unit,
            total_val, total_unit,
            irr_val, irr_unit,
            alarms.get("critical", ""),
            alarms.get("major", ""),
            alarms.get("minor", ""),
            alarms.get("warning", ""),
        ])
    log.info("Wrote generation record: %s %s, irradiance: %s %s (date: %s)",
             yield_val, yield_unit, irr_val, irr_unit, today)


# ---------------------------------------------------------------------------
# Main actions
# ---------------------------------------------------------------------------

def run_inverter_check(cfg, dry_run=False):
    """Run a daylight inverter status check."""
    from playwright.sync_api import sync_playwright

    log.info("=" * 60)
    log.info("INVERTER STATUS CHECK -- %s", datetime.now().strftime("%Y-%m-%d %H:%M"))
    log.info("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        try:
            # Login
            if not login(page, cfg):
                log.error("Login failed -- aborting inverter check")
                return False

            # Navigate to device management
            navigate_to_page(page, cfg, "device-manage")

            # Extract device statuses
            devices = extract_inverter_statuses(page)
            log.info("Found %d devices", len(devices))

            if not devices:
                # Fallback: try overview page for alarm data
                log.warning("No devices found on device-manage page, trying overview...")
                navigate_to_page(page, cfg, "overview")
                overview = extract_overview_data(page)
                log.info("Overview data: %s", json.dumps(overview, indent=2, default=str))

                # Also try report page for inverter data
                navigate_to_page(page, cfg, "report")
                inv_report = extract_inverter_report(page)
                log.info("Inverter report entries: %d", len(inv_report))

                # Convert report data to device-like format
                for inv in inv_report:
                    devices.append({
                        "name": inv["name"],
                        "type": "Inverter",
                        "status": "Online" if inv.get("yield") and inv["yield"] != "0" else "Unknown",
                        "statusClass": "",
                        "yield": inv.get("yield", "")
                    })

            # Analyse results
            offline = [d for d in devices if "offline" in (d.get("status", "") + d.get("statusClass", "")).lower()
                       or "disconnect" in (d.get("status", "") + d.get("statusClass", "")).lower()
                       or "fault" in (d.get("status", "") + d.get("statusClass", "")).lower()]

            # Print summary
            print("\n" + "=" * 50)
            print(f"  INVERTER CHECK -- {datetime.now().strftime('%Y-%m-%d %H:%M')}")
            print(f"  Station: {cfg['station_name']}")
            print("=" * 50)
            print(f"  Total devices found: {len(devices)}")
            print(f"  Offline/Faulted:     {len(offline)}")
            if offline:
                print("\n  [!] OFFLINE DEVICES:")
                for d in offline:
                    print(f"     - {d['name']} ({d.get('type','')}) -- {d.get('status','')}")
            else:
                print("\n  [OK] All devices appear online")
            print("=" * 50 + "\n")

            # Log results
            log_inverter_check(devices, dry_run=dry_run)

            if offline:
                log.warning("[!] %d DEVICE(S) OFFLINE: %s",
                            len(offline),
                            ", ".join(d["name"] for d in offline))
            else:
                log.info("[OK] All %d devices online", len(devices))

            # Calculate and log availability
            online_count = len(devices) - len(offline)
            avail = inverter_availability(online_count, len(devices))
            if avail is not None:
                log.info("Inverter availability: %.1f%% (%d/%d online)",
                         avail, online_count, len(devices))

            return len(offline) == 0

        except Exception as e:
            log.exception("Error during inverter check: %s", e)
            return False
        finally:
            browser.close()


def run_generation_report(cfg, dry_run=False):
    """Run the 10 PM generation report."""
    from playwright.sync_api import sync_playwright

    log.info("=" * 60)
    log.info("GENERATION REPORT -- %s", datetime.now().strftime("%Y-%m-%d %H:%M"))
    log.info("=" * 60)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        try:
            # Login
            if not login(page, cfg):
                log.error("Login failed -- aborting generation report")
                return False

            # Navigate to overview
            navigate_to_page(page, cfg, "overview")

            # Extract overview data
            data = extract_overview_data(page)
            log.info("Overview data: %s", json.dumps(data, indent=2, default=str))

            # Print summary
            yield_val = data.get("yield_today_value", "N/A")
            yield_unit = data.get("yield_today_unit", "")
            total_val = data.get("total_yield_value", "N/A")
            total_unit = data.get("total_yield_unit", "")
            alarms = data.get("alarms", {})

            print("\n" + "=" * 50)
            print(f"  DAILY GENERATION REPORT -- {date.today().isoformat()}")
            print(f"  Station: {cfg['station_name']}")
            print("=" * 50)
            print(f"  Yield today:   {yield_val} {yield_unit}")
            print(f"  Total yield:   {total_val} {total_unit}")
            if alarms:
                alarm_str = ", ".join(f"{k}: {v}" for k, v in alarms.items() if v is not None)
                print(f"  Alarms:        {alarm_str}")
            print("=" * 50 + "\n")

            # Log results
            log_generation(data, dry_run=dry_run)

            return True

        except Exception as e:
            log.exception("Error during generation report: %s", e)
            return False
        finally:
            browser.close()


def test_login_only(cfg):
    """Test that login works and print result."""
    from playwright.sync_api import sync_playwright

    log.info("Testing login...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        try:
            success = login(page, cfg)
            if success:
                log.info("[OK] Login successful!")
                log.info("Current URL: %s", page.url)

                # Quick check: can we reach the overview?
                navigate_to_page(page, cfg, "overview")
                data = extract_overview_data(page)
                yield_val = data.get("yield_today_value", "N/A")
                yield_unit = data.get("yield_today_unit", "")
                log.info("Quick check -- Yield today: %s %s", yield_val, yield_unit)
                print(f"\n[OK] Login successful! Yield today: {yield_val} {yield_unit}\n")
            else:
                log.error("[FAIL] Login failed!")
                print("\n[FAIL] Login failed -- check credentials in config.json\n")
            return success
        except Exception as e:
            log.exception("Login test error: %s", e)
            return False
        finally:
            browser.close()


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="FusionSolar Monitor -- Point Lane Solar Farm",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python fusionsolar_monitor.py --check             Daylight inverter check
  python fusionsolar_monitor.py --report            10 PM generation report
  python fusionsolar_monitor.py --test-login        Test login only
  python fusionsolar_monitor.py --check --dry-run   Dry run (no CSV writes)
        """
    )
    parser.add_argument("--check", action="store_true", help="Run inverter status check")
    parser.add_argument("--report", action="store_true", help="Run generation report")
    parser.add_argument("--test-login", action="store_true", help="Test login only")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to CSV files")
    parser.add_argument("--no-sync", action="store_true", help="Skip Notion sync")

    args = parser.parse_args()

    if not any([args.check, args.report, args.test_login]):
        parser.print_help()
        sys.exit(1)

    cfg = load_config()

    if args.test_login:
        success = test_login_only(cfg)
        sys.exit(0 if success else 1)

    if args.check:
        success = run_inverter_check(cfg, dry_run=args.dry_run)
        sys.exit(0 if success else 1)

    if args.report:
        success = run_generation_report(cfg, dry_run=args.dry_run)
        
        # Trigger Notion sync if report was successful and not disabled
        if success and not args.no_sync and not args.dry_run:
            sync_script = SCRIPT_DIR / "notion_sync.py"
            if sync_script.exists():
                print(f"\\n[INFO] Triggering Notion sync...")
                try:
                    subprocess.run([sys.executable, str(sync_script), "--sync-today"], check=False)
                except Exception as e:
                    print(f"[WARN] Notion sync failed to start: {e}")
            else:
                print(f"[WARN] notion_sync.py not found at {sync_script}")

        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
