import json
import logging
import sys
import time
from playwright.sync_api import sync_playwright

# Import existing logic
from fusionsolar_monitor import load_config, login, navigate_to_page

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

def handle_response(response):
    try:
        if "application/json" in response.headers.get("content-type", ""):
            url = response.url
            if "kpi" in url or "flow" in url or "station" in url:
                try:
                    data = response.json()
                    # Look for arrays of 24 items (hourly) or "xAxis" data
                    text_dump = json.dumps(data)
                    if len(text_dump) < 20000: # specific filters to find the right packet
                         print(f"\n[CAPTURED] {url}\n{text_dump[:500]}...\n")
                except:
                    pass
    except:
        pass

def main():
    cfg = load_config()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True) # Headless for speed
        page = browser.new_page()
        
        # Capture network traffic
        page.on("response", handle_response)

        log.info("Logging in...")
        if login(page, cfg):
            log.info("Navigating to Overview...")
            # We want to trigger the "Energy Management" or "Yield" charts
            navigate_to_page(page, cfg, "overview")
            time.sleep(10) # Wait for charts to load and requests to fire
            
        browser.close()

if __name__ == "__main__":
    main()
