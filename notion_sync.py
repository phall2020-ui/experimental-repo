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
import csv
import importlib.util
import json
import logging
import os
import re
import subprocess
import sys
import time
import requests
from datetime import datetime, date, timedelta
from pathlib import Path

from calculations import performance_ratio, specific_yield
from fusionsolar_monitor import (
    load_config,
    login,
    navigate_to_page,
    scrape_monthly_report,
    extract_station_irradiance,
    extract_overview_data,
    fetch_daily_energy_balance_api,
    calculate_hourly_yield_from_power,
)

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SCRIPT_DIR / "config.json"
LOGS_DIR = SCRIPT_DIR / "logs"
ELEXON_DIR = SCRIPT_DIR / "Elexon_Data"
ELEXON_DAILY_DIR = ELEXON_DIR / "bmrs_data"
ELEXON_FETCH_SCRIPT = ELEXON_DIR / "fetch_elexon_data.py"
STARK_SCRAPER_SCRIPT = SCRIPT_DIR / "stark_scraper.py"
STARK_DATA_DIR = SCRIPT_DIR / "stark_data"
LOGS_DIR.mkdir(exist_ok=True)
STARK_DATA_DIR.mkdir(exist_ok=True)

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
NOTION_HH_DB_ID_FILE = SCRIPT_DIR / ".notion_hh_db_id"
DB_NAME = "FusionSolar Daily Generation"
HH_DB_NAME = "FusionSolar HH Site Data"
# Cache: db_id -> {prop_name: prop_type} (populated on first upsert per DB)
_DB_PROP_CACHE: dict = {}
# Cache: db_id -> {prop_name: prop_type} (populated on first upsert per DB)
_DB_PROP_CACHE: dict = {}

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


def save_hh_db_id(db_id):
    with open(NOTION_HH_DB_ID_FILE, "w") as f:
        f.write(db_id)


def load_hh_db_id():
    if NOTION_HH_DB_ID_FILE.exists():
        return NOTION_HH_DB_ID_FILE.read_text().strip()
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
            "Irradiance (kWh/m²)": {"number": {"format": "number"}},
            "PR (%)": {"number": {"format": "number"}},
            "Specific Yield (kWh/kWp)": {"number": {"format": "number"}},
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


def find_or_create_hh_notion_db(target_parent_id, daily_db_id):
    """
    Find or create HH database linked to the main daily database.
    """
    headers = get_notion_headers()

    cached_id = load_hh_db_id()
    if cached_id:
        try:
            r = requests.get(f"https://api.notion.com/v1/databases/{cached_id}", headers=headers)
            if r.status_code == 200:
                log.info("Using cached HH Notion DB: %s", cached_id)
                return cached_id
        except Exception as e:
            log.warning("Failed to verify cached HH DB: %s", e)

    r = requests.post(
        "https://api.notion.com/v1/search",
        headers=headers,
        json={"query": HH_DB_NAME, "filter": {"value": "database", "property": "object"}},
    )
    for db in r.json().get("results", []):
        title_arr = db.get("title", [])
        if title_arr and title_arr[0].get("plain_text") == HH_DB_NAME:
            db_id = db["id"]
            parent = db.get("parent", {})
            if not target_parent_id or (parent.get("type") == "page_id" and parent.get("page_id") == target_parent_id):
                save_hh_db_id(db_id)
                log.info("Found existing HH Notion DB: %s", db_id)
                return db_id

    if not target_parent_id:
        log.error("No notion_parent_page_id configured; cannot create linked HH DB")
        return None

    payload = {
        "parent": {"type": "page_id", "page_id": target_parent_id},
        "title": [{"type": "text", "text": {"content": HH_DB_NAME}}],
        "properties": {
            "HH Key": {"title": {}},
            "Date": {"rich_text": {}},
            "Settlement Period": {"number": {"format": "number"}},
            "Interval End": {"rich_text": {}},
            "Consumption (kWh)": {"number": {"format": "number"}},
            "Site": {"rich_text": {}},
            "Daily Record": {"relation": {"database_id": daily_db_id, "single_property": {}}},
        },
    }
    r = requests.post("https://api.notion.com/v1/databases", headers=headers, json=payload)
    if r.status_code != 200:
        log.error("Error creating HH DB: %s %s", r.status_code, r.text)
        return None

    db_id = r.json()["id"]
    save_hh_db_id(db_id)
    log.info("Created HH Notion DB: %s", db_id)
    return db_id


def query_hh_row(hh_db_id, hh_key):
    headers = get_notion_headers()
    r = requests.post(
        f"https://api.notion.com/v1/databases/{hh_db_id}/query",
        headers=headers,
        json={
            "filter": {
                "property": "HH Key",
                "title": {"equals": hh_key},
            }
        },
    )
    results = r.json().get("results", [])
    return results[0]["id"] if results else None


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


def verify_and_update_db_schema(db_id):
    """Ensure the Notion database has all required properties."""
    headers = get_notion_headers()
    try:
        r = requests.get(f"https://api.notion.com/v1/databases/{db_id}", headers=headers)
        if r.status_code != 200:
            log.error("Failed to fetch DB schema: %s", r.text)
            return

        current_props = r.json().get("properties", {})
        required_props = {
            "Irradiance (kWh/m\u00b2)": {"number": {"format": "number"}},
            "PR (%)": {"number": {"format": "number"}},
            "Specific Yield (kWh/kWp)": {"number": {"format": "number"}},
            "Hourly Yield (kWh)": {"rich_text": {}},
            "Hourly SSP (\u00a3/MWh)": {"rich_text": {}},
            "Daily Revenue (\u00a3)": {"number": {"format": "pound"}},
        }

        missing_props = {}
        for name, spec in required_props.items():
            if name not in current_props:
                missing_props[name] = spec

        if missing_props:
            log.info("Adding missing properties to Notion DB: %s", list(missing_props.keys()))
            payload = {"properties": missing_props}
            r = requests.patch(
                f"https://api.notion.com/v1/databases/{db_id}",
                headers=headers,
                json=payload
            )
            if r.status_code == 200:
                log.info("Successfully updated DB schema.")
            else:
                log.error("Failed to update DB schema: %s %s", r.status_code, r.text)
    except Exception as e:
        log.error("Error verifying DB schema: %s", e)


    return None


def verify_and_update_hh_db_schema(hh_db_id, daily_db_id):
    headers = get_notion_headers()
    try:
        r = requests.get(f"https://api.notion.com/v1/databases/{hh_db_id}", headers=headers)
        if r.status_code != 200:
            log.error("Failed to fetch HH DB schema: %s", r.text)
            return
        current_props = r.json().get("properties", {})
        required_props = {
            "Date": {"rich_text": {}},
            "Settlement Period": {"number": {"format": "number"}},
            "Interval End": {"rich_text": {}},
            "Consumption (kWh)": {"number": {"format": "number"}},
            "SSP (£/MWh)": {"number": {"format": "pound"}},
            "Site": {"rich_text": {}},
            "Daily Record": {"relation": {"database_id": daily_db_id, "single_property": {}}},
        }
        missing = {k: v for k, v in required_props.items() if k not in current_props}
        if missing:
            log.info("Adding missing properties to HH DB: %s", list(missing.keys()))
            r = requests.patch(
                f"https://api.notion.com/v1/databases/{hh_db_id}",
                headers=headers,
                json={"properties": missing},
            )
            if r.status_code == 200:
                log.info("Successfully updated HH DB schema.")
            else:
                log.error("Failed updating HH DB schema: %s %s", r.status_code, r.text)
    except Exception as e:
        log.error("Error verifying HH DB schema: %s", e)


def upsert_hh_notion_row(hh_db_id, hh_key, date_str, settlement_period, interval_end, consumption_kwh,
                         site_name, daily_page_id=None, ssp_gbp_mwh=None):
    headers = get_notion_headers()
    props = {
        "HH Key": {"title": [{"text": {"content": hh_key}}]},
        "Date": {"rich_text": [{"text": {"content": date_str}}]},
        "Settlement Period": {"number": settlement_period},
        "Interval End": {"rich_text": [{"text": {"content": interval_end}}]},
        "Consumption (kWh)": {"number": round(consumption_kwh, 5)},
        "Site": {"rich_text": [{"text": {"content": site_name}}]},
    }
    if ssp_gbp_mwh is not None:
        props["SSP (£/MWh)"] = {"number": round(ssp_gbp_mwh, 4)}
    if daily_page_id:
        props["Daily Record"] = {"relation": [{"id": daily_page_id}]}

    try:
        page_id = query_hh_row(hh_db_id, hh_key)
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
                json={"parent": {"database_id": hh_db_id}, "properties": props},
            )
        return r.status_code in (200, 201)
    except Exception as e:
        log.warning("  Failed upserting HH row %s: %s", hh_key, e)
        return False


def append_hourly_table(page_id, hourly_yield, hourly_ssp=None):
    """
    Append a table block to the Notion page with the hourly yield data.
    """
    if not hourly_yield:
        return

    headers = get_notion_headers()
    
    # Create table rows: Header + Data
    table_rows = []
    
    hourly_ssp = hourly_ssp or {}

    # Header row
    table_rows.append({
        "type": "table_row",
        "table_row": {
            "cells": [
                [{"type": "text", "text": {"content": "Hour"}}],
                [{"type": "text", "text": {"content": "Yield (kWh)"}}],
                [{"type": "text", "text": {"content": "SSP (\u00a3/MWh)"}}],
            ]
        }
    })

    # Data rows
    sorted_hours = sorted(hourly_yield.keys())
    for hour in sorted_hours:
        val = hourly_yield[hour]
        table_rows.append({
            "type": "table_row",
            "table_row": {
                "cells": [
                    [{"type": "text", "text": {"content": hour}}],
                    [{"type": "text", "text": {"content": f"{val:.3f}"}}],
                    [{"type": "text", "text": {"content": f"{hourly_ssp[hour]:.3f}" if hour in hourly_ssp else ""}}],
                ]
            }
        })

    # Construct the table block wrapped in a toggle
    block_data = {
        "children": [
            {
                "object": "block",
                "type": "toggle", # Update: Append toggle block
                "toggle": {
                    "rich_text": [{"type": "text", "text": {"content": "Hourly Yield Breakdown"}}],
                    "children": [
                        {
                            "object": "block",
                            "type": "table",
                            "table": {
                                "table_width": 3,
                                "has_column_header": True,
                                "has_row_header": False,
                                "children": table_rows
                            }
                        }
                    ]
                }
            }
        ]
    }

    try:
        url = f"https://api.notion.com/v1/blocks/{page_id}/children"
        r = requests.patch(url, headers=headers, json=block_data)
        if r.status_code == 200:
            log.info("  Appended hourly table to page %s", page_id)
        else:
            log.warning("  Failed to append table: %s", r.text)
    except Exception as e:
        log.warning("  Exception appending table: %s", e)


def _get_db_prop_types(db_id):
    """Return {prop_name: prop_type} for the given DB, using a module-level cache."""
    if db_id not in _DB_PROP_CACHE:
        headers = get_notion_headers()
        try:
            r = requests.get(f"https://api.notion.com/v1/databases/{db_id}", headers=headers)
            if r.status_code == 200:
                _DB_PROP_CACHE[db_id] = {
                    name: prop.get("type", "unknown")
                    for name, prop in r.json().get("properties", {}).items()
                }
                log.info("  Cached DB schema for %s: %d properties", db_id, len(_DB_PROP_CACHE[db_id]))
            else:
                log.warning("  Could not fetch DB schema for %s: %s", db_id, r.status_code)
                _DB_PROP_CACHE[db_id] = None  # unknown — allow all writes
        except Exception as e:
            log.warning("  Error fetching DB schema for %s: %s", db_id, e)
            _DB_PROP_CACHE[db_id] = None
    return _DB_PROP_CACHE.get(db_id)


def upsert_notion_row(db_id, date_str, pv_kwh, inv_kwh, station_name,
                      alarms=None, irradiance_kwh_m2=None, capacity_kwp=None,
                      hourly_yield_json=None, hourly_ssp_json=None, daily_revenue_gbp=None):
    """Insert or update a row in the Notion database.

    Dynamically adapts to the target DB schema: only writes properties that
    exist in the DB and are not formula columns.  Hourly yield / SSP values
    are expanded into individual column entries (e.g. '07:00', 'SSP 07:00 (£/MWh)')
    when those columns are present in the DB.
    """
    headers = get_notion_headers()

    # --- Schema introspection ---
    db_prop_types = _get_db_prop_types(db_id)  # {name: type} or None

    def can_write(name):
        """True if the property exists in this DB and is not a formula."""
        if db_prop_types is None:
            return True  # unknown schema — optimistically try all
        typ = db_prop_types.get(name)
        return typ is not None and typ != "formula"

    pv_mwh = round(pv_kwh / 1000.0, 3) if pv_kwh else 0
    inv_mwh = round(inv_kwh / 1000.0, 3) if inv_kwh else 0

    # Calculate PR and specific yield if we have the data
    pr = performance_ratio(pv_kwh, irradiance_kwh_m2, capacity_kwp) if irradiance_kwh_m2 and capacity_kwp else None
    sy = specific_yield(pv_kwh, capacity_kwp) if capacity_kwp else None

    # --- Build props dict, guarding every field against missing/formula columns ---
    props = {
        "Date": {"title": [{"text": {"content": date_str}}]},
    }
    if can_write("PV Yield (kWh)"):
        props["PV Yield (kWh)"] = {"number": round(pv_kwh, 2) if pv_kwh else 0}
    if can_write("PV Yield (MWh)"):
        props["PV Yield (MWh)"] = {"number": pv_mwh}
    if can_write("Inverter Yield (kWh)"):
        props["Inverter Yield (kWh)"] = {"number": round(inv_kwh, 2) if inv_kwh else 0}
    if can_write("Inverter Yield (MWh)"):
        props["Inverter Yield (MWh)"] = {"number": inv_mwh}
    if can_write("Station"):
        props["Station"] = {"rich_text": [{"text": {"content": station_name}}]}
    if can_write("Record Date"):
        props["Record Date"] = {"date": {"start": date_str}}
    if hourly_yield_json and can_write("Hourly Yield (kWh)"):
        props["Hourly Yield (kWh)"] = {"rich_text": [{"text": {"content": hourly_yield_json}}]}
    if hourly_ssp_json and can_write("Hourly SSP (\u00a3/MWh)"):
        props["Hourly SSP (\u00a3/MWh)"] = {"rich_text": [{"text": {"content": hourly_ssp_json}}]}
    if daily_revenue_gbp is not None and can_write("Daily Revenue (\u00a3)"):
        props["Daily Revenue (\u00a3)"] = {"number": round(daily_revenue_gbp, 2)}
    if irradiance_kwh_m2 is not None and can_write("Irradiance (kWh/m\u00b2)"):
        props["Irradiance (kWh/m\u00b2)"] = {"number": round(irradiance_kwh_m2, 3)}
    if pr is not None and can_write("PR (%)"):
        props["PR (%)"] = {"number": pr}
    if sy is not None and can_write("Specific Yield (kWh/kWp)"):
        props["Specific Yield (kWh/kWp)"] = {"number": sy}
    if alarms:
        if can_write("Alarms Critical"):
            props["Alarms Critical"] = {"number": alarms.get("critical", 0) or 0}
        if can_write("Alarms Major"):
            props["Alarms Major"] = {"number": alarms.get("major", 0) or 0}
        if can_write("Alarms Minor"):
            props["Alarms Minor"] = {"number": alarms.get("minor", 0) or 0}

    # Expand hourly yield JSON into individual time-slot columns (e.g. '07:00' ... '18:00')
    if hourly_yield_json:
        try:
            for hour, val in json.loads(hourly_yield_json).items():
                if can_write(hour):
                    props[hour] = {"number": round(float(val), 3)}
        except Exception as exc:
            log.warning("  Could not expand hourly yield columns: %s", exc)

    # Expand SSP JSON into individual SSP columns (e.g. 'SSP 07:00 (\u00a3/MWh)')
    if hourly_ssp_json:
        try:
            for hour, val in json.loads(hourly_ssp_json).items():
                col = f"SSP {hour} (\u00a3/MWh)"
                if can_write(col):
                    props[col] = {"number": round(float(val), 4)}
        except Exception as exc:
            log.warning("  Could not expand hourly SSP columns: %s", exc)

    # --- Upsert with retry ---
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
                res_json = r.json()
                page_id = res_json["id"]
                page_url = f"https://notion.so/{page_id.replace('-', '')}"

                irr_str = f", Irr={irradiance_kwh_m2:.3f} kWh/m\u00b2" if irradiance_kwh_m2 else ""
                pr_str = f", PR={pr:.1f}%" if pr else ""

                log.info("  Synced %s: PV=%.1f kWh (%.3f MWh), Inv=%.1f kWh%s%s",
                         date_str, pv_kwh or 0, pv_mwh, inv_kwh or 0, irr_str, pr_str)
                log.info("  Page URL: %s", page_url)

                return page_id
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


def _load_elexon_fetch_module():
    if not ELEXON_FETCH_SCRIPT.exists():
        return None
    spec = importlib.util.spec_from_file_location("elexon_fetch", str(ELEXON_FETCH_SCRIPT))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def ensure_daily_ssp_csv(target_date):
    """
    Ensure Elexon SSP CSV exists for target_date by reusing Elexon_Data/fetch_elexon_data.py.
    Returns the CSV path if available.
    """
    date_str = target_date.strftime("%Y-%m-%d")
    csv_path = ELEXON_DAILY_DIR / f"system_prices_{date_str}.csv"
    if csv_path.exists():
        return csv_path

    module = _load_elexon_fetch_module()
    if not module or not hasattr(module, "fetch_data"):
        log.warning("Elexon fetch script unavailable; SSP for %s will be skipped", date_str)
        return None

    ELEXON_DAILY_DIR.mkdir(parents=True, exist_ok=True)
    old_cwd = os.getcwd()
    try:
        os.chdir(ELEXON_DIR)
        module.fetch_data(target_date, target_date)
    except Exception as e:
        log.warning("Failed fetching Elexon SSP for %s: %s", date_str, e)
    finally:
        os.chdir(old_cwd)

    return csv_path if csv_path.exists() else None


def load_hourly_ssp(target_date):
    """
    Convert Elexon settlement-period SSP (48 half-hours) into 24 hourly SSP values.
    Returns dict like {'00:00': 75.2, ...} where available.
    """
    csv_path = ensure_daily_ssp_csv(target_date)
    if not csv_path:
        return {}

    by_hour = {}
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sp_raw = row.get("SettlementPeriod")
            ssp_raw = row.get("SystemSellPrice")
            if not sp_raw or ssp_raw in (None, ""):
                continue
            try:
                sp = int(sp_raw)
                ssp = float(ssp_raw)
            except (ValueError, TypeError):
                continue
            hour = (sp - 1) // 2
            if hour < 0 or hour > 23:
                continue
            by_hour.setdefault(hour, []).append(ssp)

    hourly = {}
    for hour, values in by_hour.items():
        if not values:
            continue
        hour_key = f"{hour:02d}:00"
        hourly[hour_key] = round(sum(values) / len(values), 3)
    return hourly


def load_settlement_period_ssp(target_date):
    """
    Return SSP by settlement period for a date: {1: 75.65, ..., 48: 80.12}
    """
    csv_path = ensure_daily_ssp_csv(target_date)
    if not csv_path:
        return {}
    result = {}
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            sp_raw = row.get("SettlementPeriod")
            ssp_raw = row.get("SystemSellPrice")
            if not sp_raw or ssp_raw in (None, ""):
                continue
            try:
                sp = int(sp_raw)
                ssp = float(ssp_raw)
            except (ValueError, TypeError):
                continue
            if 1 <= sp <= 48:
                result[sp] = ssp
    return result


def _load_stark_module():
    if not STARK_SCRAPER_SCRIPT.exists():
        return None
    spec = importlib.util.spec_from_file_location("stark_scraper_module", str(STARK_SCRAPER_SCRIPT))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def ensure_stark_hh_csv(cfg, target_date, allow_scrape=True):
    """
    Ensure Stark HH CSV exists for target_date.
    Returns Path or None.
    """
    date_str = target_date.strftime("%Y-%m-%d")
    csv_path = STARK_DATA_DIR / f"stark_hh_data_{date_str}.csv"
    legacy_path = SCRIPT_DIR / f"stark_hh_data_{date_str}.csv"
    if csv_path.exists():
        return csv_path
    if legacy_path.exists():
        return legacy_path
    if not allow_scrape:
        return None

    if not STARK_SCRAPER_SCRIPT.exists():
        log.warning("Stark scraper script unavailable; HH data for %s skipped", date_str)
        return None

    stark_cfg = cfg.get("stark", {}) if isinstance(cfg.get("stark"), dict) else {}
    username = stark_cfg.get("username") or os.environ.get("STARK_USERNAME")
    password = stark_cfg.get("password") or os.environ.get("STARK_PASSWORD")
    site_name = stark_cfg.get("site_name") or os.environ.get("STARK_SITE_NAME") or "Point Lane"
    search_text = (
        stark_cfg.get("search_text")
        or os.environ.get("STARK_SEARCH_TEXT")
        or os.environ.get("STARK_EXPORT_MPAN")
        or "2100042103940"
    )

    cmd = [sys.executable, str(STARK_SCRAPER_SCRIPT), "--date", date_str, "--output-dir", str(STARK_DATA_DIR)]
    if username:
        cmd.extend(["--username", username])
    if password:
        cmd.extend(["--password", password])
    if site_name:
        cmd.extend(["--site-name", site_name])
    if search_text:
        cmd.extend(["--search-text", str(search_text)])

    try:
        proc = subprocess.run(cmd, check=False, capture_output=True, text=True, timeout=180)
        if proc.returncode != 0:
            out = (proc.stdout or "") + "\n" + (proc.stderr or "")
            log.warning("Failed scraping Stark HH for %s (exit %s): %s", date_str, proc.returncode, out[:400])
    except Exception as e:
        log.warning("Failed scraping Stark HH for %s: %s", date_str, e)

    if csv_path.exists():
        return csv_path
    return None


def parse_stark_hh_csv(csv_path):
    """
    Parse Stark CSV rows into 48 settlement periods.
    Returns list of dicts: {settlement_period, interval_end, consumption_kwh}
    """
    rows = []
    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        data = list(reader)

    header_idx = None
    for i, row in enumerate(data):
        if row and row[0].strip() == "Period":
            header_idx = i
            break
    if header_idx is None:
        return rows

    value_header = data[header_idx][1].strip().lower() if len(data[header_idx]) > 1 else ""
    is_power_kw = "power" in value_header and "kw" in value_header

    for row in data[header_idx + 1:]:
        if not row or not row[0].strip():
            continue
        period_text = row[0].strip()
        kwh_text = row[1].strip() if len(row) > 1 else ""
        try:
            interval_end_dt = datetime.strptime(period_text, "%a %d/%m/%Y %H:%M")
            raw_value = float(kwh_text.replace(",", "")) if kwh_text else 0.0
            # If Stark export is Active Power (kW) at HH granularity, convert to energy.
            consumption_kwh = (raw_value * 0.5) if is_power_kw else raw_value
        except Exception:
            continue

        settlement_period = len(rows) + 1
        rows.append({
            "settlement_period": settlement_period,
            "interval_end": interval_end_dt.strftime("%Y-%m-%d %H:%M"),
            "consumption_kwh": consumption_kwh,
        })
        if len(rows) >= 48:
            break
    return rows


def sync_stark_hh_day(cfg, hh_db_id, daily_page_id, target_date, allow_scrape=True):
    """
    Sync Stark half-hour data for one day into the linked HH database.
    """
    if not hh_db_id:
        return 0
    csv_path = ensure_stark_hh_csv(cfg, target_date, allow_scrape=allow_scrape)
    if not csv_path:
        log.warning("  No Stark HH CSV for %s", target_date)
        return 0

    entries = parse_stark_hh_csv(csv_path)
    if not entries:
        log.warning("  Stark CSV parsed 0 HH rows for %s (%s)", target_date, csv_path)
        return 0

    date_str = target_date.strftime("%Y-%m-%d")
    site_name = (cfg.get("stark", {}) or {}).get("site_name") or cfg.get("station_name", "Point Lane")
    ssp_by_sp = load_settlement_period_ssp(target_date)
    upserts = 0
    for row in entries:
        hh_key = f"{date_str}-SP{row['settlement_period']:02d}"
        ok = upsert_hh_notion_row(
            hh_db_id=hh_db_id,
            hh_key=hh_key,
            date_str=date_str,
            settlement_period=row["settlement_period"],
            interval_end=row["interval_end"],
            consumption_kwh=row["consumption_kwh"],
            site_name=site_name,
            daily_page_id=daily_page_id,
            ssp_gbp_mwh=ssp_by_sp.get(row["settlement_period"]),
        )
        if ok:
            upserts += 1
    log.info("  Synced Stark HH rows for %s: %d", date_str, upserts)
    return upserts


def calculate_daily_revenue_gbp(hourly_yield, hourly_ssp):
    """
    Daily revenue in GBP from matching hourly pairs:
      revenue_h = (kWh / 1000) * (GBP per MWh)
    """
    if not hourly_yield or not hourly_ssp:
        return None
    total = 0.0
    matched = 0
    for hour, kwh in hourly_yield.items():
        if hour not in hourly_ssp:
            continue
        try:
            total += (float(kwh) / 1000.0) * float(hourly_ssp[hour])
            matched += 1
        except (ValueError, TypeError):
            continue
    return round(total, 4) if matched else None


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

    # Step 4: Extract column headers to identify irradiance columns
    column_headers = page.evaluate("""
        (() => {
            const headers = [];
            const thead = document.querySelector('.dpdesign-table-thead') ||
                          document.querySelector('.nco-site-table thead') ||
                          document.querySelector('table thead');
            if (!thead) return headers;
            const ths = thead.querySelectorAll('th');
            for (const th of ths) {
                headers.push(th.textContent.trim().toLowerCase());
            }
            return headers;
        })()
    """)
    log.info("  Table headers: %s", column_headers)

    # Identify irradiance column index (match common FusionSolar header labels)
    irr_col_idx = None
    irr_keywords = ['irradiance', 'irradiation', 'global', 'ghi', 'poa', 'solar radiation',
                    'total radiation', 'horizontal irrad']
    for idx, hdr in enumerate(column_headers):
        if any(kw in hdr for kw in irr_keywords):
            irr_col_idx = idx
            log.info("  Found irradiance column at index %d: '%s'", idx, hdr)
            break

    # Step 5: Extract table data (all columns)
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

                        // Collect ALL cell values for dynamic column mapping
                        const allValues = [];
                        for (let i = 0; i < cells.length; i++) {
                            allValues.push(cells[i]?.textContent?.trim() || '');
                        }

                        const pvText = cells[1]?.textContent?.trim() || '';
                        const invText = cells[2]?.textContent?.trim() || '';

                        const pvVal = parseFloat(pvText.replace(/,/g, '')) || 0;
                        const invVal = parseFloat(invText.replace(/,/g, '')) || 0;

                        // Accept YYYY-MM-DD (daily "By month" view)
                        if (dateText && /^\\d{4}-\\d{2}-\\d{2}/.test(dateText)) {
                            const justDate = dateText.substring(0, 10);
                            results.push({
                                date: justDate,
                                pv_kwh: pvVal,
                                inv_kwh: invVal,
                                all_values: allValues
                            });
                        }
                    }
                }
                return results;
            })()
        """)
        log.info("  Page %d: found %d rows", pg + 1, len(rows))

        # Map irradiance from dynamic column index
        for row in rows:
            all_vals = row.pop("all_values", [])
            if irr_col_idx is not None and irr_col_idx < len(all_vals):
                try:
                    irr_text = all_vals[irr_col_idx].replace(",", "")
                    row["irradiance_kwh_m2"] = float(irr_text) if irr_text else 0
                except (ValueError, TypeError):
                    row["irradiance_kwh_m2"] = 0
            else:
                row["irradiance_kwh_m2"] = 0
            # Stash any extra columns for debugging
            row["extra_columns"] = all_vals[3:] if len(all_vals) > 3 else []

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

    log.info("  Scraped %d daily records for %s (irradiance col: %s)",
             len(all_rows), month_str,
             f"idx {irr_col_idx}" if irr_col_idx is not None else "not found")
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


def sync_today_from_report(cfg, db_id, hh_db_id=None):
    """
    Sync today's data using the Report page for the richest data:
    separate PV yield, inverter yield, and irradiance.
    Falls back to overview-based sync if the report page fails.
    """
    from playwright.sync_api import sync_playwright

    today = date.today()
    today_str = today.isoformat()
    station_name = cfg.get("station_name", "Point Lane Solar Farm")
    capacity_kwp = cfg.get("installed_capacity_kwp")

    log.info("Syncing today's generation to Notion (via Report page)...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = context.new_page()

        try:
            # Note: Global imports are used now

            if not login(page, cfg):
                log.error("Login failed -- cannot sync today")
                return False

            # --- Fetch Hourly Data (API) ---
            log.info("  Fetching hourly data via API...")
            power_data = fetch_daily_energy_balance_api(page, cfg, today)
            hourly_yield = calculate_hourly_yield_from_power(power_data)
            hourly_yield_json = json.dumps(hourly_yield, sort_keys=True) if hourly_yield else None
            hourly_ssp = load_hourly_ssp(today)
            hourly_ssp_json = json.dumps(hourly_ssp, sort_keys=True) if hourly_ssp else None
            daily_revenue_gbp = calculate_daily_revenue_gbp(hourly_yield, hourly_ssp)
            
            # --- Primary: Report page (richer data) ---
            try:
                navigate_to_page(page, cfg, "report")
                time.sleep(3)

                month_data = scrape_monthly_report(page, today.year, today.month, is_first_month=True)
                today_row = None
                for row in month_data:
                    if row.get("date") == today_str:
                        today_row = row
                        break

                if today_row:
                    pv_kwh = today_row.get("pv_kwh", 0)
                    inv_kwh = today_row.get("inv_kwh", 0)
                    irradiance_kwh_m2 = today_row.get("irradiance_kwh_m2")
                    if irradiance_kwh_m2 == 0:
                        irradiance_kwh_m2 = None

                    log.info("  Report page data -- PV: %.1f kWh, Inv: %.1f kWh, Irr: %s",
                             pv_kwh, inv_kwh,
                             f"{irradiance_kwh_m2:.3f} kWh/m²" if irradiance_kwh_m2 else "N/A")

                    # Also get alarms from overview page
                    alarms = {}
                    try:
                        navigate_to_page(page, cfg, "overview")
                        overview_data = extract_overview_data(page)
                        alarms = overview_data.get("alarms", {})
                    except Exception as e:
                        log.warning("  Could not fetch alarms from overview: %s", e)

                    page_id = upsert_notion_row(
                        db_id,
                        today_str,
                        pv_kwh=pv_kwh,
                        inv_kwh=inv_kwh,
                        station_name=station_name,
                        alarms=alarms,
                        irradiance_kwh_m2=irradiance_kwh_m2,
                        capacity_kwp=capacity_kwp if capacity_kwp else None,
                        hourly_yield_json=hourly_yield_json,
                        hourly_ssp_json=hourly_ssp_json,
                        daily_revenue_gbp=daily_revenue_gbp,
                    )
                    
                    if page_id and hourly_yield:
                        append_hourly_table(page_id, hourly_yield, hourly_ssp)
                    if page_id:
                        sync_stark_hh_day(cfg, hh_db_id, page_id, today, allow_scrape=True)
                        
                    return True
                else:
                    log.warning("  Today's date (%s) not found in report data -- falling back to overview",
                                today_str)
            except Exception as e:
                log.warning("  Report page scrape failed: %s -- falling back to overview", e)

            # --- Fallback: Overview page + Plants list irradiance ---
            log.info("  Using overview page fallback...")
            navigate_to_page(page, cfg, "overview")
            data = extract_overview_data(page)

            yield_val = data.get("yield_today_value", "0")
            yield_unit = data.get("yield_today_unit", "kWh")
            alarms = data.get("alarms", {})

            try:
                kwh = float(yield_val.replace(",", ""))
                if yield_unit.lower() == "mwh":
                    kwh *= 1000
                elif yield_unit.lower() == "gwh":
                    kwh *= 1000000
            except (ValueError, AttributeError):
                kwh = 0

            irradiance_kwh_m2 = extract_station_irradiance(page, cfg)

            page_id = upsert_notion_row(
                db_id,
                today_str,
                pv_kwh=kwh,
                inv_kwh=kwh,
                station_name=station_name,
                alarms=alarms,
                irradiance_kwh_m2=irradiance_kwh_m2,
                capacity_kwp=capacity_kwp if capacity_kwp else None,
                hourly_yield_json=hourly_yield_json,
                hourly_ssp_json=hourly_ssp_json,
                daily_revenue_gbp=daily_revenue_gbp,
            )
            
            if page_id and hourly_yield:
                append_hourly_table(page_id, hourly_yield, hourly_ssp)
            if page_id:
                sync_stark_hh_day(cfg, hh_db_id, page_id, today, allow_scrape=True)
            
            return True

        except Exception as e:
            log.exception("Error syncing today: %s", e)
            return False
        finally:
            browser.close()


def backfill_range(cfg, db_id, hh_db_id, start_date, end_date):
    """
    Backfill data for a range of dates, including hourly yield.
    Optimized to scrape monthly report once per month.
    """
    from playwright.sync_api import sync_playwright

    log.info("Starting backfill from %s to %s", start_date, end_date)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        try:
            if not login(page, cfg):
                log.error("Login failed -- aborting backfill")
                return

            current_date = start_date
            month_cache = {} # (year, month) -> list of rows
            
            station_name = cfg.get("station_name", "Point Lane Solar Farm")
            capacity_kwp = cfg.get("installed_capacity_kwp", 0)

            while current_date <= end_date:
                log.info("Processing %s...", current_date)
                
                # 1. Get Daily Totals (PV, Inv, Irr) from Report
                # We cache the monthly report to avoid navigating back and forth
                ym = (current_date.year, current_date.month)
                if ym not in month_cache:
                    log.info("  Scraping monthly report for %s-%s...", ym[0], ym[1])
                    navigate_to_page(page, cfg, "report")
                    time.sleep(2)
                    data = scrape_monthly_report(page, ym[0], ym[1])
                    month_cache[ym] = data
                
                day_str = current_date.strftime("%Y-%m-%d")
                daily_record = next((r for r in month_cache.get(ym, []) if r["date"] == day_str), None)
                
                if daily_record:
                    pv_kwh = daily_record.get("pv_kwh", 0)
                    inv_kwh = daily_record.get("inv_kwh", 0)
                    irradiance_kwh_m2 = daily_record.get("irradiance_kwh_m2")
                else:
                    log.warning("  No report data for %s (might be future or missing)", day_str)
                    pv_kwh = 0
                    inv_kwh = 0
                    irradiance_kwh_m2 = None

                # 2. Get Hourly Data via API
                power_data = fetch_daily_energy_balance_api(page, cfg, current_date)
                hourly_yield = calculate_hourly_yield_from_power(power_data)
                hourly_json = json.dumps(hourly_yield, sort_keys=True) if hourly_yield else None
                hourly_ssp = load_hourly_ssp(current_date)
                hourly_ssp_json = json.dumps(hourly_ssp, sort_keys=True) if hourly_ssp else None
                daily_revenue_gbp = calculate_daily_revenue_gbp(hourly_yield, hourly_ssp)
                
                # 3. Upsert to Notion
                page_id = upsert_notion_row(
                    db_id,
                    day_str,
                    pv_kwh=pv_kwh,
                    inv_kwh=inv_kwh,
                    station_name=station_name,
                    alarms={}, # No historical alarms scraping implemented
                    irradiance_kwh_m2=irradiance_kwh_m2,
                    capacity_kwp=capacity_kwp if capacity_kwp else None,
                    hourly_yield_json=hourly_json,
                    hourly_ssp_json=hourly_ssp_json,
                    daily_revenue_gbp=daily_revenue_gbp,
                )

                # 4. Append Hourly Table
                if page_id and hourly_yield:
                    append_hourly_table(page_id, hourly_yield, hourly_ssp)
                if page_id:
                    sync_stark_hh_day(cfg, hh_db_id, page_id, current_date, allow_scrape=True)

                current_date += timedelta(days=1)
                time.sleep(1) # Gentle pace

        except Exception as e:
            log.exception("Backfill failed: %s", e)
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
    # notion_fusionsolar_parent_page_id pins the FusionSolar DB to a specific
    # parent page (separate from the Stark HH parent page)
    fusionsolar_parent = (
        cfg.get("notion_fusionsolar_parent_page_id")
        or cfg.get("notion_parent_page_id")
    )
    db_id = find_or_create_notion_db(target_parent_id=fusionsolar_parent)
    log.info("Notion DB ID: %s", db_id)

    # Verify schema and add missing columns
    verify_and_update_db_schema(db_id)
    hh_db_id = find_or_create_hh_notion_db(
        target_parent_id=cfg.get("notion_parent_page_id"),
        daily_db_id=db_id,
    )
    if hh_db_id:
        verify_and_update_hh_db_schema(hh_db_id, db_id)


    if args.backfill:
        start = date.fromisoformat(args.start_date)
        end = date.fromisoformat(args.end_date) if args.end_date else date.today()

        log.info("=" * 60)
        log.info("BACKFILL: %s to %s", start, end)
        log.info("=" * 60)

        backfill_range(cfg, db_id, hh_db_id, start, end)
        log.info("Backfill complete")

    if args.sync_today:
        log.info("=" * 60)
        log.info("SYNC TODAY: %s", date.today())
        log.info("=" * 60)
        sync_today_from_report(cfg, db_id, hh_db_id=hh_db_id)
        log.info("Today sync complete")


if __name__ == "__main__":
    main()
