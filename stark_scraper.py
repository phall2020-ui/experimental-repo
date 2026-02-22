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


def _save_debug_artifacts(page, prefix):
    log_dir = Path.cwd() / "logs"
    log_dir.mkdir(exist_ok=True)
    ts = int(time.time())
    debug_html = log_dir / f"{prefix}_{ts}.html"
    debug_png = log_dir / f"{prefix}_{ts}.png"
    try:
        with open(debug_html, "w", encoding="utf-8") as f:
            f.write(page.content())
        page.screenshot(path=str(debug_png), full_page=True)
        print(f"Saved diagnostics: {debug_html.name}, {debug_png.name}")
    except Exception as e:
        print(f"Failed to save diagnostics for {prefix}: {e}")


def _digits_only(value):
    return re.sub(r"\D", "", value or "")


def _sample_locator_text(locator, limit=12):
    samples = []
    try:
        count = min(locator.count(), limit)
    except Exception:
        return samples
    for idx in range(count):
        try:
            text = (locator.nth(idx).inner_text(timeout=1000) or "").strip()
        except Exception:
            text = ""
        if text:
            samples.append(" ".join(text.split()))
    return samples


def _pick_best_candidate(locator, search_text, meter_id="", timeout_ms=10000):
    search_text = (search_text or "").strip()
    search_lower = search_text.lower()
    search_digits = _digits_only(search_text)
    meter_lower = (meter_id or "").lower()
    end = time.time() + (timeout_ms / 1000.0)

    while time.time() < end:
        best = None
        try:
            count = locator.count()
        except Exception:
            count = 0
        for idx in range(min(count, 50)):
            item = locator.nth(idx)
            try:
                text = (item.inner_text(timeout=1000) or "").strip()
            except Exception:
                continue
            if not text:
                continue
            text_norm = " ".join(text.split())
            text_lower = text_norm.lower()
            text_digits = _digits_only(text_norm)

            score = 0
            if search_digits and search_digits in text_digits:
                score += 100
            if search_lower and search_lower in text_lower:
                score += 40
            if meter_lower and meter_lower in text_lower:
                score += 20
            if re.search(r"\b(export|generation)\b", text_lower):
                score += 10

            if score > 0 and (best is None or score > best["score"]):
                best = {"idx": idx, "score": score, "text": text_norm}

        if best:
            return locator.nth(best["idx"]), best["text"], best["score"]
        time.sleep(0.3)
    return None, "", 0


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


def _env_headless(default=True):
    raw = os.environ.get("STARK_HEADLESS")
    if raw is None:
        return default
    return str(raw).strip().lower() not in {"0", "false", "no", "off"}


def _normalize_secret(value):
    if value is None:
        return ""
    return str(value).strip()


def _set_input_value(page, selector, value, timeout_ms=15000):
    field = page.locator(selector).first
    field.wait_for(state="visible", timeout=timeout_ms)
    try:
        field.click(timeout=3000)
    except Exception:
        pass
    try:
        field.press("Control+A", timeout=2000)
        field.press("Delete", timeout=2000)
    except Exception:
        pass
    try:
        field.fill(value, timeout=5000)
    except Exception:
        pass

    try:
        current = field.input_value(timeout=2000)
    except Exception:
        current = ""
    if current == value:
        return True

    try:
        page.eval_on_selector(
            selector,
            """(el, val) => {
                el.value = val;
                el.dispatchEvent(new Event("input", { bubbles: true }));
                el.dispatchEvent(new Event("change", { bubbles: true }));
                return el.value;
            }""",
            value,
        )
    except Exception:
        return False

    try:
        current = field.input_value(timeout=2000)
    except Exception:
        current = ""
    return current == value


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

        username_ok = _set_input_value(page, "#inputUsernameOrEmail", username)
        password_ok = _set_input_value(page, "#inputPassword", password)
        user_len = 0
        pass_len = 0
        try:
            user_len = len(page.locator("#inputUsernameOrEmail").first.input_value())
            pass_len = len(page.locator("#inputPassword").first.input_value())
        except Exception:
            pass
        print(
            "Credential fields set: "
            f"username_ok={username_ok}, password_ok={password_ok}, "
            f"username_len={user_len}, password_len={pass_len}"
        )
        if pass_len == 0:
            print("Password field is empty before submit; retrying input.")
            time.sleep(1)
            continue

        submitted = False
        try:
            submit_btn = page.locator("button[type='submit']").first
            if submit_btn.count() > 0 and submit_btn.is_visible():
                submit_btn.click(timeout=5000)
                submitted = True
        except Exception:
            pass
        if not submitted:
            page.keyboard.press("Enter")

        # Wait a moment to see if "Enter" triggered navigation
        time.sleep(1)
        if not _on_signin_page(page):
             return True

        # Fallback to click again if we're still on the signin page.
        if not submitted:
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

        # Capture diagnostics on every failure to proceed
        print(f"Checking for login errors (Attempt {attempt})...")
        _save_debug_artifacts(page, f"login_fail_att{attempt}")

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
    timeline_selectors = ["#StartDate", "#EndDate", "#buttonRunReport"]
    end = time.time() + (timeout_ms / 1000.0)
    while time.time() < end:
        for selector in timeline_selectors:
            try:
                if page.locator(selector).count() > 0:
                    return True
            except Exception:
                pass
        try:
            if page.get_by_text(re.compile(r"\bTimeline\b", re.I)).count() > 0 and page.locator("#buttonRunReport").count() > 0:
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
    headless=None,
):
    username = _normalize_secret(username or os.environ.get("STARK_USERNAME"))
    password = _normalize_secret(password or os.environ.get("STARK_PASSWORD"))
    site_name = _normalize_secret(site_name or os.environ.get("STARK_SITE_NAME") or "Point Lane")
    search_text = (
        _normalize_secret(search_text)
        or _normalize_secret(os.environ.get("STARK_SEARCH_TEXT"))
        or _normalize_secret(os.environ.get("STARK_EXPORT_MPAN"))
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
    if headless is None:
        headless = _env_headless(default=True)
    print(f"Goal: Scrape HH data for {site_name} (Search: {search_text}) on {formatted_date}")
    print(f"Output: {output_path}")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=headless,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined});"
        )
        page = context.new_page()
        try:
            print("Navigating to login page...")
            if not _login(page, username, password):
                print(f"Login failed after multiple attempts (Final URL: {page.url})")
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
            search_result, search_label, search_score = _pick_best_candidate(
                page.locator("#groupSearchResults button, .groupSearchResult button, .searchItemName"),
                search_text=search_text,
                meter_id=meter_id,
                timeout_ms=12000,
            )
            if search_result:
                print(f"Clicking MPAN search result (score={search_score}): {search_label}")
                search_result.click()
                page.wait_for_timeout(1000)
            else:
                # Do NOT fall back to site name — that hits the import/consumption meter.
                # Only the explicit MPAN search returns the generation (export) meter.
                samples = _sample_locator_text(
                    page.locator("#groupSearchResults button, .groupSearchResult button, .searchItemName")
                )
                if samples:
                    print("Available search results:")
                    for sample in samples:
                        print(f"  - {sample}")
                print(f"MPAN search result not found for '{search_text}'. Aborting to avoid selecting wrong meter.")
                _save_debug_artifacts(page, "mpan_search_missing")
                return None
            tree_item, tree_label, tree_score = _pick_best_candidate(
                page.locator(".treeItemName"),
                search_text=search_text,
                meter_id=meter_id,
                timeout_ms=12000,
            )
            if not tree_item:
                # Do NOT fall back to site name tree item.
                samples = _sample_locator_text(page.locator(".treeItemName"))
                if samples:
                    print("Available tree items:")
                    for sample in samples:
                        print(f"  - {sample}")
                print(f"Could not locate generation meter tree item for MPAN '{search_text}'. Aborting.")
                _save_debug_artifacts(page, "tree_item_missing")
                return None
            print(f"Double-clicking tree item (score={tree_score}): {tree_label}")
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

            if not _timeline_ready(page, timeout_ms=3000):
                print("Timeline controls not visible after meter selection; reopening Timeline view...")
                if not _open_timeline(page):
                    print("Could not reopen Timeline view after meter selection.")
                    _save_debug_artifacts(page, "timeline_missing_after_meter")
                    return None

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
