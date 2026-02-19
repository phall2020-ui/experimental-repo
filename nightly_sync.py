#!/usr/bin/env python3
"""
nightly_sync.py
================
Consolidated nightly pipeline that runs sequentially:
  1. FusionSolar daily data -> Notion (notion_sync.py --sync-today)
  2. Fetch Elexon SSP data for recent dates
  3. Scrape Stark HH generation data & sync to Notion

Designed to run after/alongside the FusionSolar daily report (22:00 UTC).
Scheduled at 22:30 UTC via GitHub Actions and/or local launchd.

Even if fusionsolar_monitor.py --report already triggers notion_sync on success,
this pipeline guarantees FusionSolar data is synced regardless of monitor outcome.

Usage:
    python nightly_sync.py                   # yesterday + today (default)
    python nightly_sync.py --days 3          # last 3 days + today
    python nightly_sync.py --no-fusion       # skip FusionSolar sync (Elexon + Stark only)
"""

import argparse
import subprocess
import sys
import time
from datetime import date, timedelta
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent


def run_step(label, cmd, cwd=None, timeout=300):
    """Run a subprocess step and return (success, elapsed_seconds)."""
    print(f"\n{'=' * 60}")
    print(f"  {label}")
    print(f"  Command: {' '.join(str(c) for c in cmd)}")
    print(f"{'=' * 60}\n")
    sys.stdout.flush()

    t0 = time.time()
    try:
        result = subprocess.run(
            cmd, cwd=str(cwd) if cwd else None,
            timeout=timeout,
        )
        elapsed = time.time() - t0
        ok = result.returncode == 0
        status = "OK" if ok else f"FAILED (exit {result.returncode})"
        print(f"\n  [{status}] {label} -- {elapsed:.1f}s")
        sys.stdout.flush()
        return ok, elapsed
    except subprocess.TimeoutExpired:
        elapsed = time.time() - t0
        print(f"\n  [TIMEOUT] {label} -- {elapsed:.1f}s (limit {timeout}s)")
        sys.stdout.flush()
        return False, elapsed
    except Exception as e:
        elapsed = time.time() - t0
        print(f"\n  [ERROR] {label} -- {e}")
        sys.stdout.flush()
        return False, elapsed


def main():
    parser = argparse.ArgumentParser(
        description="Nightly sync: FusionSolar + Elexon SSP + Stark HH generation -> Notion"
    )
    parser.add_argument(
        "--days", type=int, default=2,
        help="Number of days to sync (default: 2 = yesterday + today)"
    )
    parser.add_argument(
        "--no-fusion", action="store_true",
        help="Skip FusionSolar notion sync (run Elexon + Stark only)"
    )
    args = parser.parse_args()

    end_date = date.today()
    start_date = end_date - timedelta(days=args.days - 1)
    start_str = start_date.isoformat()
    end_str = end_date.isoformat()

    print(f"\n{'=' * 60}")
    print(f"  NIGHTLY SYNC PIPELINE")
    print(f"  Range: {start_str} -> {end_str}")
    print(f"{'=' * 60}")
    sys.stdout.flush()

    results = []
    total_steps = 2 if args.no_fusion else 3
    step = 0

    # ------------------------------------------------------------------
    # Step 1: FusionSolar daily data -> Notion  (notion_sync --sync-today)
    # ------------------------------------------------------------------
    if not args.no_fusion:
        step += 1
        notion_sync = SCRIPT_DIR / "notion_sync.py"
        if notion_sync.exists():
            ok, elapsed = run_step(
                f"Step {step}/{total_steps}: FusionSolar -> Notion",
                [sys.executable, str(notion_sync), "--sync-today"],
                cwd=SCRIPT_DIR,
                timeout=300,
            )
        else:
            print(f"  [SKIP] notion_sync.py not found at {notion_sync}")
            ok, elapsed = True, 0.0  # non-fatal
        results.append(("FusionSolar notion sync", ok, elapsed))

    # ------------------------------------------------------------------
    # Step 2: Fetch Elexon SSP data
    # ------------------------------------------------------------------
    step += 1
    ok, elapsed = run_step(
        f"Step {step}/{total_steps}: Fetch Elexon SSP data",
        [sys.executable, str(SCRIPT_DIR / "Elexon_Data" / "fetch_elexon_data.py"),
         "--start", start_str, "--end", end_str],
        cwd=SCRIPT_DIR / "Elexon_Data",
        timeout=120,
    )
    results.append(("Elexon SSP fetch", ok, elapsed))

    # ------------------------------------------------------------------
    # Step 3: Stark HH generation sync to Notion
    # ------------------------------------------------------------------
    step += 1
    ok, elapsed = run_step(
        f"Step {step}/{total_steps}: Stark HH generation -> Notion",
        [sys.executable, str(SCRIPT_DIR / "stark_daily_sync.py"),
         "--start", start_str, "--end", end_str],
        cwd=SCRIPT_DIR,
        timeout=600,
    )
    results.append(("Stark HH sync", ok, elapsed))

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print(f"\n{'=' * 60}")
    print("  NIGHTLY SYNC SUMMARY")
    print(f"{'=' * 60}")
    all_ok = True
    for name, ok, elapsed in results:
        icon = "[OK]  " if ok else "[FAIL]"
        print(f"  {icon}  {name:<30s}  {elapsed:>6.1f}s")
        if not ok:
            all_ok = False
    print(f"{'=' * 60}")

    if not all_ok:
        print("\n  [!] Some steps failed -- check logs above")
        sys.exit(1)
    else:
        print("\n  All steps completed successfully")


if __name__ == "__main__":
    main()
