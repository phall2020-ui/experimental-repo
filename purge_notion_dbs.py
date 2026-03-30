"""
purge_notion_dbs.py
====================
Archives every page in the daily Notion DB and the HH Notion DB,
preserving DB IDs, schema, and parent relationships unchanged.
Run before a full backfill to start clean.
"""
import json
import sys
import time
import requests
from pathlib import Path

CONFIG_PATH = Path(__file__).resolve().parent / "config.json"
DB_ID_FILE  = Path(__file__).resolve().parent / ".notion_db_id"
HH_DB_ID_FILE = Path(__file__).resolve().parent / ".notion_hh_db_id"

def load_config():
    with open(CONFIG_PATH) as f:
        return json.load(f)

cfg = load_config()
TOKEN = cfg.get("notion_token")
if not TOKEN:
    sys.exit("No notion_token in config.json")

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
}

def get_db_id(path):
    if path.exists():
        return path.read_text().strip()
    return None

def archive_all_pages(db_id, label):
    """Archive every page in db_id. Returns count."""
    if not db_id:
        print(f"[{label}] No DB ID – skipping")
        return 0
    total = 0
    cursor = None
    while True:
        payload = {"page_size": 100}
        if cursor:
            payload["start_cursor"] = cursor
        r = requests.post(
            f"https://api.notion.com/v1/databases/{db_id}/query",
            headers=HEADERS,
            json=payload,
        )
        if r.status_code == 404:
            print(f"[{label}] DB {db_id} not found – skipping")
            return 0
        r.raise_for_status()
        data = r.json()
        pages = data.get("results", [])
        print(f"[{label}] Archiving batch of {len(pages)} pages …")
        for page in pages:
            pid = page["id"]
            for attempt in range(3):
                res = requests.patch(
                    f"https://api.notion.com/v1/pages/{pid}",
                    headers=HEADERS,
                    json={"archived": True},
                )
                if res.status_code == 429:
                    wait = 2.0 * (attempt + 1)
                    print(f"  Rate-limited, sleeping {wait}s …")
                    time.sleep(wait)
                elif res.status_code in (200, 201):
                    total += 1
                    break
                else:
                    print(f"  WARN: failed to archive {pid}: {res.status_code} {res.text[:120]}")
                    break
            time.sleep(0.05)   # gentle pace
        if data.get("has_more"):
            cursor = data.get("next_cursor")
        else:
            break
    print(f"[{label}] Done – archived {total} pages  (DB {db_id} is preserved)")
    return total

daily_db_id = get_db_id(DB_ID_FILE)
hh_db_id    = get_db_id(HH_DB_ID_FILE)

print(f"Daily DB : {daily_db_id}")
print(f"HH DB    : {hh_db_id}")
print()

n1 = archive_all_pages(daily_db_id, "Daily DB")
n2 = archive_all_pages(hh_db_id,    "HH DB")

print()
print(f"=== PURGE COMPLETE ===")
print(f"  Daily DB rows archived : {n1}")
print(f"  HH DB rows archived    : {n2}")
print(f"  DB IDs unchanged       : Daily={daily_db_id}  HH={hh_db_id}")
