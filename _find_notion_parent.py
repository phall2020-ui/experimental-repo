import json
import os
import sys
import requests
from pathlib import Path

# Fix encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SCRIPT_DIR / "config.json"
with open(CONFIG_PATH, "r") as f:
    cfg = json.load(f)

NOTION_TOKEN = cfg.get("notion_token") or os.environ.get("NOTION_TOKEN")

headers = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
}

def search_pages(query=None):
    payload = {"filter": {"value": "page", "property": "object"}}
    if query:
        payload["query"] = query
        
    r = requests.post("https://api.notion.com/v1/search", headers=headers, json=payload)
    results = r.json().get("results", [])
    
    print(f"Found {len(results)} pages for query '{query}':")
    for p in results:
        title = "Untitled"
        icon_str = ""
        icon = p.get("icon")
        if icon:
            icon_str = icon.get("emoji", "")
        
        props = p.get("properties", {})
        # Extract title from properties
        for key, val in props.items():
            if val.get("type") == "title":
                t_arr = val.get("title", [])
                if t_arr:
                    title = t_arr[0].get("plain_text", "Untitled")
                break
                
        parent = p.get("parent", {})
        parent_type = parent.get("type")
        
        # We are looking for pages that are NOT inside a database (unless the user meant a database)
        # Usually "workspace" pages are top-level or inside other pages.
        if parent_type == "database_id":
            continue

        print(f" - [{icon_str} {title}] (ID: {p['id']}) Parent: {parent_type}")

print("--- Searching for 'Asset' ---")
search_pages("Asset")

print("\n--- Searching for 'Management' ---")
search_pages("Management")
