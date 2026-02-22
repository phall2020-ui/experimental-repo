import argparse
import os
import re
import time
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright


def _first_visible(locator, timeout_ms=5000):
    end = time.time() + (timeout_ms / 1000.0)
    while time.time() < end:
        try:
            if locator.count() > 0 and locator.first.is_visible():
                return locator.first
        except Exception:
            pass
        time.sleep(0.2)
    return None


def _click_first_visible(candidates, timeout_ms=8000):
    end = time.time() + (timeout_ms / 1000.0)
    while time.time() < end:
        for locator in candidates:
            try:
                if locator.count() > 0 and locator.first.is_visible():
                    locator.first.click(timeout=3000)
                    return True
            except Exception:
                pass
        time.sleep(0.2)
    return False


def _click_text_via_js(page, pattern):
    try:
        return bool(page.evaluate(
            """([rawPattern]) => {
                const regex = new RegExp(rawPattern, "i");
                const nodes = Array.from(document.querySelectorAll("a,button,span,div"));
                for (const node of nodes) {
                    const txt = (node.textContent || "").trim();
                    if (!txt || !regex.test(txt)) continue;
                    try { node.click(); return true; } catch (e) {}
                }
                return false;
            }""",
            [pattern],
        ))
    except Exception:
        return False


def _open_timeline_from_links(page):
    try:
        links = page.eval_on_selector_all(
            "a[href]",
            """els => els.map(e => ({
                text: (e.textContent || "").trim(),
                href: e.href || ""
            }))""",
        )
    except Exception:
        return False

    timeline_href = ""
    for link in links:
        href = link.get("href", "")
        text = link.get("text", "")
        haystack = f"{text} {href}"
        if re.search(r"timeline|dynamic\\s*report|report", haystack, re.I):
            timeline_href = href
            if re.search(r"timeline", haystack, re.I):
                break

    if not timeline_href:
        return False

    try:
        page.goto(timeline_href, wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
    except Exception:
        return False
    return _timeline_ready(page, timeout_ms=12000)


def _on_signin_page(page):
    return "starkid/signin" in page.url.lower()


def _login(page, username, password, attempts=2):
    for attempt in range(1, attempts + 1):
        print(f"Logging in... (attempt {attempt}/{attempts})")
        page.goto("https://id.stark.co.uk/StarkID/SignIn", wait_until="domcontentloaded")
        try:
            if page.is_visible("#onetrust-accept-btn-handler", timeout=3000):
                page.click("#onetrust-accept-btn-handler")
                print("Accepted cookies.")
        except Exception:
            pass

        page.wait_for_selector("#inputUsernameOrEmail", state="visible", timeout=15000)
        page.fill("#inputUsernameOrEmail", "")
        page.type("#inputUsernameOrEmail", username, delay=35)
        page.fill("#inputPassword", "")
        page.type("#inputPassword", password, delay=35)
        page.keyboard.press("Enter")

        # Wait a moment to see if "Enter" triggered navigation
        time.sleep(1)
        if not _on_signin_page(page):
             return True

        # Fallback to click if enter isn't intercepted and we're still on the signin page
        try:
            submit_btn = page.locator("button[type='submit']").first
            if submit_btn.count() > 0 and submit_btn.is_visible():
                submit_btn.click(timeout=5000)
        except Exception:
            pass

        deadline = time.time() + 30
        while time.time() < deadline:
            if not _on_signin_page(page):
                return True
            page.wait_for_timeout(500)

        print("Checking for login errors...")
        try:
            err = page.locator(".validation-summary-errors").first
            if err.count() > 0 and err.is_visible():
                print(f"Login error detected: {err.inner_text().strip()}")
        except Exception:
            pass

        # Give the page a short pause before retry to avoid anti-bot race conditions.
        time.sleep(2)

    return False


def _timeline_ready(page, timeout_ms=8000):
    end = time.time() + (timeout_ms / 1000.0)
    while time.time() < end:
        try:
            if page.locator("#btnOpenGroupTreeSearch").count() > 0:
                return True
            if page.locator("#groupSearchInput").count() > 0:
                return True
            if page.locator("#StartDate").count() > 0:
                return True
        except Exception:
            pass
        time.sleep(0.2)
    return False


def _open_timeline(page):
    if _timeline_ready(page, timeout_ms=3000):
        return True

    dynamic_reports_candidates = [
        page.get_by_role("link", name=re.compile(r"Dynamic Reports", re.I)),
        page.get_by_role("button", name=re.compile(r"Dynamic Reports", re.I)),
        page.get_by_text(re.compile(r"Dynamic Reports", re.I)),
    ]
    if not _click_first_visible(dynamic_reports_candidates, timeout_ms=12000):
        # Last-resort fallback for dynamic menus that render text in non-standard nodes.
        if not _click_text_via_js(page, r"Dynamic\s*Reports"):
            return _open_timeline_from_links(page)
        time.sleep(1)

    timeline_candidates = [
        page.get_by_role("link", name=re.compile(r"Timeline", re.I)),
        page.get_by_role("button", name=re.compile(r"Timeline", re.I)),
        page.get_by_text(re.compile(r"Timeline", re.I)),
    ]
    if not _click_first_visible(timeline_candidates, timeout_ms=12000):
        if not _click_text_via_js(page, r"Timeline"):
            return _open_timeline_from_links(page)
        time.sleep(1)

    page.wait_for_load_state("networkidle")
    if _timeline_ready(page, timeout_ms=12000):
        return True
    return _open_timeline_from_links(page)


def run(
    date_str,
    username=None,
    password=None,
    site_name=None,
    search_text=None,
    output_dir=None,
    headless=True,
):
    username = username or os.environ.get("STARK_USERNAME")
    password = password or os.environ.get("STARK_PASSWORD")
    site_name = site_name or os.environ.get("STARK_SITE_NAME") or "Point Lane"
    search_text = (
        search_text
        or os.environ.get("STARK_SEARCH_TEXT")
        or os.environ.get("STARK_EXPORT_MPAN")
        or "2100042103940"
    )
    meter_id = os.environ.get("STARK_METER_ID") or "K21W001099"
    if not username or not password:
        print("Missing Stark credentials. Set STARK_USERNAME and STARK_PASSWORD.")
        return None
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d")
        formatted_date = target_date.strftime("%d/%m/%Y")
        file_date = target_date.strftime("%Y-%m-%d")
    except ValueError:
        print("Invalid date format. Please use YYYY-MM-DD")
        return None
    out_dir = Path(output_dir) if output_dir else Path.cwd()
    out_dir.mkdir(parents=True, exist_ok=True)
    output_path = out_dir / f"stark_hh_data_{file_date}.csv"
    print(f"Goal: Scrape HH data for {site_name} (Search: {search_text}) on {formatted_date}")
    print(f"Output: {output_path}")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        try:
            print("Navigating to login page...")
            if not _login(page, username, password):
                print(f"Login appears incomplete (still on sign-in page): {page.url}")
                debug_html = f"login_failure_debug_{int(time.time())}.html"
                debug_png = f"login_failure_debug_{int(time.time())}.png"
                with open(debug_html, "w", encoding="utf-8") as f:
                    f.write(page.content())
                page.screenshot(path=debug_png, full_page=True)
                print(f"Saved navigation debug HTML to {debug_html} and PNG to {debug_png}")
                return None
            print("Login successful.")
            page.wait_for_load_state("networkidle")
            print("Navigating to Dynamic Reports > Timeline...")
            if not _open_timeline(page):
                print(f"Current URL after login: {page.url}")
                print("Could not open Timeline report view after login.")
                debug_shot = f"timeline_nav_debug_{int(time.time())}.png"
                page.screenshot(path=debug_shot, full_page=True)
                print(f"Saved navigation debug screenshot to {debug_shot}")
                return None

            print(f"Selecting meter using search term: {search_text}...")
            page.click("#btnOpenGroupTreeSearch")
            page.wait_for_selector("#groupSearchInput", state="visible")
            page.fill("#groupSearchInput", search_text)
            page.press("#groupSearchInput", "Enter")
            search_result = _first_visible(
                page.locator(".searchItemName").filter(has_text=search_text).filter(has_text=meter_id),
                timeout_ms=10000
            )
            if not search_result:
                search_result = _first_visible(
                    page.locator(".searchItemName").filter(has_text=search_text),
                    timeout_ms=5000
                )
            if search_result:
                print("Clicking MPAN search result...")
                search_result.click()
            else:
                # Do NOT fall back to site name — that hits the import/consumption meter.
                # Only the explicit MPAN search returns the generation (export) meter.
                print(f"MPAN search result not found for '{search_text}'. Aborting to avoid selecting wrong meter.")
                return None
            tree_item = _first_visible(
                page.locator(".treeItemName").filter(has_text=search_text).filter(has_text=meter_id),
                timeout_ms=10000
            )
            if not tree_item:
                tree_item = _first_visible(
                    page.locator(".treeItemName").filter(has_text=search_text),
                    timeout_ms=5000
                )
            if not tree_item:
                # Do NOT fall back to site name tree item.
                print(f"Could not locate generation meter tree item for MPAN '{search_text}'. Aborting.")
                return None
            print("Double-clicking tree item...")
            time.sleep(1)
            tree_item.dblclick()
            time.sleep(1)
            try:
                modal = page.locator(".modalCurtain")
                if modal.count() > 0 and modal.first.is_visible():
                    page.keyboard.press("Escape")
                page.locator(".modalCurtain").first.wait_for(state="hidden", timeout=5000)
            except Exception:
                pass
            print(f"Setting date to {formatted_date}...")
            page.wait_for_selector("#StartDate", state="attached", timeout=30000)
            page.evaluate(f"document.getElementById('StartDate').value = '{formatted_date}'")
            page.evaluate(f"document.getElementById('EndDate').value = '{formatted_date}'")
            page.evaluate("document.getElementById('StartDate').dispatchEvent(new Event('change'))")
            page.evaluate("document.getElementById('EndDate').dispatchEvent(new Event('change'))")
            # Meter selection can reset type; enforce Power right before report run.
            try:
                page.select_option("#energyType", label="Power")
                page.select_option("#powerType", label="Active Power (kW)")
                page.select_option("#Interval", label="Half Hourly")
            except Exception:
                pass
            print("Running report...")
            time.sleep(2)
            page.click("#buttonRunReport")
            print("Waiting for report generation...")
            download_menu_btn = page.locator("#btnOpenGraphicDownloadMenu")
            download_menu_btn.wait_for(state="visible", timeout=60000)
            print("Initiating download...")
            download_menu_btn.click()
            with page.expect_download(timeout=60000) as download_info:
                page.wait_for_selector("text=CSV", state="visible")
                page.click("text=CSV")
            download = download_info.value
            download.save_as(str(output_path))
            print(f"Success! Data saved to: {output_path.name}")
            return str(output_path)
        except Exception as e:
            print(f"Error occurred: {e}")
            debug_shot = f"error_debug_{int(time.time())}.png"
            page.screenshot(path=debug_shot)
            print(f"Saved debug screenshot to {debug_shot}")
            return None
        finally:
            browser.close()
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape Stark HH Data")
    parser.add_argument("--date", type=str, required=True, help="Date in YYYY-MM-DD format")
    parser.add_argument("--username", type=str, help="Stark username/email")
    parser.add_argument("--password", type=str, help="Stark password")
    parser.add_argument("--site-name", type=str, help="Site label used as fallback selector")
    parser.add_argument("--search-text", type=str, help="Primary search term (MPAN recommended)")
    parser.add_argument("--output-dir", type=str, help="Directory to save downloaded CSV")
    parser.add_argument("--show-browser", action="store_true", help="Show browser window")
    args = parser.parse_args()
    saved = run(
        date_str=args.date,
        username=args.username,
        password=args.password,
        site_name=args.site_name,
        search_text=args.search_text,
        output_dir=args.output_dir,
        headless=not args.show_browser,
    )
    raise SystemExit(0 if saved else 1)
