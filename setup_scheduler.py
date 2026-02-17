"""
FusionSolar Scheduler Setup
============================
Creates Windows Task Scheduler entries for the FusionSolar monitoring script.

Usage (run as Administrator for task creation):
    python setup_scheduler.py --install    # Create scheduled tasks
    python setup_scheduler.py --remove     # Remove scheduled tasks
    python setup_scheduler.py --status     # Show status of tasks
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SCRIPT_DIR / "config.json"
MONITOR_SCRIPT = SCRIPT_DIR / "fusionsolar_monitor.py"

TASK_PREFIX = "FusionSolar_PointLane"
PYTHON_EXE = sys.executable  # Use the same Python that runs this script


def load_config():
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)


def create_task(task_name, time_str, args, description):
    """Create a Windows scheduled task using schtasks."""
    full_name = f"{TASK_PREFIX}_{task_name}"
    command = f'"{PYTHON_EXE}" "{MONITOR_SCRIPT}" {args}'

    cmd = [
        "schtasks", "/create",
        "/tn", full_name,
        "/tr", command,
        "/sc", "daily",
        "/st", time_str,
        "/f",  # Force overwrite if exists
    ]

    print(f"  Creating task: {full_name}")
    print(f"    Time:    {time_str}")
    print(f"    Command: {command}")

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"    [OK] Created successfully")
    else:
        print(f"    [FAIL] Failed: {result.stderr.strip()}")
        if "Access is denied" in result.stderr:
            print("    [TIP] Try running this script as Administrator")
    return result.returncode == 0


def remove_task(task_name):
    """Remove a Windows scheduled task."""
    full_name = f"{TASK_PREFIX}_{task_name}"
    cmd = ["schtasks", "/delete", "/tn", full_name, "/f"]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"  [OK] Removed: {full_name}")
    else:
        print(f"  [!] Could not remove {full_name}: {result.stderr.strip()}")
    return result.returncode == 0


def query_tasks():
    """Query the status of all FusionSolar scheduled tasks."""
    cmd = ["schtasks", "/query", "/fo", "TABLE", "/v"]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        print(f"  [FAIL] Error querying tasks: {result.stderr.strip()}")
        return

    # Filter for our tasks
    lines = result.stdout.split("\n")
    header_printed = False
    for line in lines:
        if TASK_PREFIX in line or (header_printed and line.strip() and not line.startswith("\\")):
            if not header_printed:
                # Print the header line too
                for h in lines[:3]:
                    if h.strip():
                        print(f"  {h.strip()}")
                header_printed = True
            print(f"  {line.strip()}")


def install_tasks(cfg):
    """Install all scheduled tasks."""
    schedule = cfg.get("schedule", {})
    check_times = schedule.get("check_times", ["08:00", "10:30", "13:00", "15:30"])
    report_time = schedule.get("report_time", "22:00")

    print("\n" + "=" * 50)
    print("  FusionSolar Task Scheduler Setup")
    print("=" * 50 + "\n")

    tasks = []
    for i, t in enumerate(check_times, 1):
        tasks.append((f"Check_{i}", t, "--check", f"Inverter check #{i}"))

    tasks.append(("Report", report_time, "--report", "Daily generation report"))

    success_count = 0
    for task_name, time_str, args, desc in tasks:
        if create_task(task_name, time_str, args, desc):
            success_count += 1
        print()

    print(f"  Created {success_count}/{len(tasks)} tasks")
    print()

    if success_count < len(tasks):
        print("  [!] Some tasks failed. Make sure you're running as Administrator.")
    else:
        print("  [OK] All tasks created successfully!")
    print()


def remove_all_tasks():
    """Remove all FusionSolar scheduled tasks."""
    print("\n  Removing all FusionSolar scheduled tasks...\n")
    task_names = ["Check_1", "Check_2", "Check_3", "Check_4", "Report"]
    for name in task_names:
        remove_task(name)
    print()


def show_status():
    """Show current status of scheduled tasks."""
    print("\n" + "=" * 50)
    print("  FusionSolar Scheduled Tasks Status")
    print("=" * 50 + "\n")

    # Simpler query just for our tasks
    task_names = ["Check_1", "Check_2", "Check_3", "Check_4", "Report"]
    for name in task_names:
        full_name = f"{TASK_PREFIX}_{name}"
        cmd = ["schtasks", "/query", "/tn", full_name, "/fo", "LIST"]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            # Parse key info
            lines = result.stdout.strip().split("\n")
            info = {}
            for line in lines:
                if ":" in line:
                    key, _, val = line.partition(":")
                    info[key.strip()] = val.strip()
            status = info.get("Status", "Unknown")
            next_run = info.get("Next Run Time", "Unknown")
            last_run = info.get("Last Run Time", "Unknown")
            print(f"  {full_name}")
            print(f"    Status:   {status}")
            print(f"    Next run: {next_run}")
            print(f"    Last run: {last_run}")
            print()
        else:
            print(f"  {full_name}: NOT FOUND")
            print()


def main():
    parser = argparse.ArgumentParser(
        description="FusionSolar Task Scheduler Setup",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--install", action="store_true", help="Create scheduled tasks")
    parser.add_argument("--remove", action="store_true", help="Remove all scheduled tasks")
    parser.add_argument("--status", action="store_true", help="Show task status")

    args = parser.parse_args()

    if not any([args.install, args.remove, args.status]):
        parser.print_help()
        sys.exit(1)

    if args.install:
        cfg = load_config()
        install_tasks(cfg)
    elif args.remove:
        remove_all_tasks()
    elif args.status:
        show_status()


if __name__ == "__main__":
    main()
