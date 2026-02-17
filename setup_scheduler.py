"""
FusionSolar Scheduler Setup
============================
Creates scheduled tasks for the FusionSolar monitoring script.

Supports:
  - macOS:   launchd plist files (~/Library/LaunchAgents/)
  - Linux:   crontab entries
  - Windows: Task Scheduler (schtasks)

Usage:
    python setup_scheduler.py --install    # Create scheduled tasks
    python setup_scheduler.py --remove     # Remove scheduled tasks
    python setup_scheduler.py --status     # Show status of tasks
"""

import argparse
import json
import os
import platform
import subprocess
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
CONFIG_PATH = SCRIPT_DIR / "config.json"
MONITOR_SCRIPT = SCRIPT_DIR / "fusionsolar_monitor.py"

TASK_PREFIX = "FusionSolar_PointLane"
LAUNCHD_PREFIX = "com.fusionsolar.pointlane"
PYTHON_EXE = sys.executable


def load_config():
    if not CONFIG_PATH.exists():
        print(f"  [FAIL] Config not found: {CONFIG_PATH}")
        print(f"  [TIP]  Copy config.example.json to config.json and fill in your values")
        sys.exit(1)
    with open(CONFIG_PATH, "r") as f:
        return json.load(f)


def get_task_names(cfg):
    """Derive task names dynamically from config schedule."""
    schedule = cfg.get("schedule", {})
    check_times = schedule.get("check_times", ["08:00", "10:30", "13:00", "15:30"])
    report_time = schedule.get("report_time", "22:00")

    tasks = []
    for i, t in enumerate(check_times, 1):
        tasks.append((f"Check_{i}", t, "--check", f"Inverter status check #{i}"))
    tasks.append(("Report", report_time, "--report", "Daily generation report + Notion sync"))
    return tasks


# ---------------------------------------------------------------------------
# macOS — launchd
# ---------------------------------------------------------------------------

LAUNCH_AGENTS_DIR = Path.home() / "Library" / "LaunchAgents"


def _plist_path(task_name):
    return LAUNCH_AGENTS_DIR / f"{LAUNCHD_PREFIX}.{task_name.lower()}.plist"


def _build_plist(task_name, hour, minute, args, description):
    """Generate a launchd plist XML string."""
    label = f"{LAUNCHD_PREFIX}.{task_name.lower()}"
    log_path = SCRIPT_DIR / "logs" / f"launchd_{task_name.lower()}.log"

    arg_elements = "\n".join(f"        <string>{a}</string>" for a in args.split())
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>{label}</string>
    <key>Comment</key>
    <string>FusionSolar: {description}</string>
    <key>ProgramArguments</key>
    <array>
        <string>{PYTHON_EXE}</string>
        <string>{MONITOR_SCRIPT}</string>
{arg_elements}
    </array>
    <key>WorkingDirectory</key>
    <string>{SCRIPT_DIR}</string>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>{hour}</integer>
        <key>Minute</key>
        <integer>{minute}</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>{log_path}</string>
    <key>StandardErrorPath</key>
    <string>{log_path}</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
"""


def create_task_macos(task_name, time_str, args, description):
    """Create a macOS launchd plist and load it."""
    LAUNCH_AGENTS_DIR.mkdir(parents=True, exist_ok=True)
    hour, minute = map(int, time_str.split(":"))
    plist = _plist_path(task_name)

    content = _build_plist(task_name, hour, minute, args, description)
    plist.write_text(content)

    print(f"  Creating: {plist.name}")
    print(f"    Time:    {time_str}")
    print(f"    Command: {PYTHON_EXE} {MONITOR_SCRIPT} {args}")

    # Unload first if already loaded (ignore errors)
    subprocess.run(["launchctl", "unload", str(plist)],
                   capture_output=True, text=True)
    # Load the plist
    result = subprocess.run(["launchctl", "load", str(plist)],
                            capture_output=True, text=True)
    if result.returncode == 0:
        print(f"    [OK] Loaded successfully")
        return True
    else:
        print(f"    [FAIL] {result.stderr.strip()}")
        return False


def remove_task_macos(task_name):
    """Unload and remove a macOS launchd plist."""
    plist = _plist_path(task_name)
    if plist.exists():
        subprocess.run(["launchctl", "unload", str(plist)],
                       capture_output=True, text=True)
        plist.unlink()
        print(f"  [OK] Removed: {plist.name}")
        return True
    else:
        print(f"  [!] Not found: {plist.name}")
        return False


def query_tasks_macos(cfg):
    """Show status of macOS launchd tasks."""
    tasks = get_task_names(cfg)
    result = subprocess.run(["launchctl", "list"],
                            capture_output=True, text=True)
    loaded_labels = result.stdout if result.returncode == 0 else ""

    for task_name, time_str, args, desc in tasks:
        label = f"{LAUNCHD_PREFIX}.{task_name.lower()}"
        plist = _plist_path(task_name)
        installed = plist.exists()
        loaded = label in loaded_labels

        status = "Loaded" if loaded else ("Installed (not loaded)" if installed else "Not installed")
        print(f"  {label}")
        print(f"    Scheduled: {time_str}")
        print(f"    Status:    {status}")
        if installed:
            print(f"    Plist:     {plist}")
        log_file = SCRIPT_DIR / "logs" / f"launchd_{task_name.lower()}.log"
        if log_file.exists():
            stat = log_file.stat()
            from datetime import datetime
            mtime = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
            print(f"    Last log:  {mtime} ({stat.st_size} bytes)")
        print()


# ---------------------------------------------------------------------------
# Linux — crontab
# ---------------------------------------------------------------------------

CRON_TAG = "# FusionSolar_PointLane"


def create_task_linux(task_name, time_str, args, description):
    """Add a crontab entry."""
    hour, minute = map(int, time_str.split(":"))
    command = f"{PYTHON_EXE} {MONITOR_SCRIPT} {args}"
    log_path = SCRIPT_DIR / "logs" / f"cron_{task_name.lower()}.log"
    cron_line = f"{minute} {hour} * * * cd {SCRIPT_DIR} && {command} >> {log_path} 2>&1 {CRON_TAG}_{task_name}"

    print(f"  Creating cron entry: {task_name}")
    print(f"    Time:    {time_str}")
    print(f"    Command: {command}")

    # Get existing crontab
    result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
    existing = result.stdout if result.returncode == 0 else ""

    # Remove any existing entry for this task
    tag = f"{CRON_TAG}_{task_name}"
    lines = [l for l in existing.splitlines() if tag not in l]
    lines.append(cron_line)

    # Write back
    new_crontab = "\n".join(lines) + "\n"
    proc = subprocess.run(["crontab", "-"], input=new_crontab,
                          capture_output=True, text=True)
    if proc.returncode == 0:
        print(f"    [OK] Added to crontab")
        return True
    else:
        print(f"    [FAIL] {proc.stderr.strip()}")
        return False


def remove_task_linux(task_name):
    """Remove a crontab entry."""
    result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  [!] No crontab found")
        return False

    tag = f"{CRON_TAG}_{task_name}"
    lines = result.stdout.splitlines()
    filtered = [l for l in lines if tag not in l]

    if len(filtered) == len(lines):
        print(f"  [!] Entry not found: {task_name}")
        return False

    new_crontab = "\n".join(filtered) + "\n" if filtered else ""
    subprocess.run(["crontab", "-"], input=new_crontab,
                   capture_output=True, text=True)
    print(f"  [OK] Removed: {task_name}")
    return True


def query_tasks_linux(cfg):
    """Show FusionSolar crontab entries."""
    result = subprocess.run(["crontab", "-l"], capture_output=True, text=True)
    if result.returncode != 0:
        print("  No crontab entries found")
        return

    tasks = get_task_names(cfg)
    for task_name, time_str, args, desc in tasks:
        tag = f"{CRON_TAG}_{task_name}"
        found = any(tag in line for line in result.stdout.splitlines())
        status = "Installed" if found else "Not found"
        print(f"  {TASK_PREFIX}_{task_name}")
        print(f"    Scheduled: {time_str}")
        print(f"    Status:    {status}")
        log_file = SCRIPT_DIR / "logs" / f"cron_{task_name.lower()}.log"
        if log_file.exists():
            stat = log_file.stat()
            from datetime import datetime
            mtime = datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
            print(f"    Last log:  {mtime} ({stat.st_size} bytes)")
        print()


# ---------------------------------------------------------------------------
# Windows — Task Scheduler
# ---------------------------------------------------------------------------

def create_task_windows(task_name, time_str, args, description):
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
        print(f"    [FAIL] {result.stderr.strip()}")
        if "Access is denied" in result.stderr:
            print("    [TIP] Try running this script as Administrator")
    return result.returncode == 0


def remove_task_windows(task_name):
    """Remove a Windows scheduled task."""
    full_name = f"{TASK_PREFIX}_{task_name}"
    cmd = ["schtasks", "/delete", "/tn", full_name, "/f"]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"  [OK] Removed: {full_name}")
    else:
        print(f"  [!] Could not remove {full_name}: {result.stderr.strip()}")
    return result.returncode == 0


def query_tasks_windows(cfg):
    """Query the status of FusionSolar scheduled tasks on Windows."""
    tasks = get_task_names(cfg)
    for task_name, time_str, args, desc in tasks:
        full_name = f"{TASK_PREFIX}_{task_name}"
        cmd = ["schtasks", "/query", "/tn", full_name, "/fo", "LIST"]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
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


# ---------------------------------------------------------------------------
# Platform dispatcher
# ---------------------------------------------------------------------------

def detect_platform():
    """Return 'macos', 'linux', or 'windows'."""
    system = platform.system().lower()
    if system == "darwin":
        return "macos"
    elif system == "linux":
        return "linux"
    elif system == "windows":
        return "windows"
    else:
        print(f"  [WARN] Unknown platform: {system}, defaulting to linux (crontab)")
        return "linux"


def install_tasks(cfg):
    """Install all scheduled tasks for the current platform."""
    plat = detect_platform()
    tasks = get_task_names(cfg)

    print("\n" + "=" * 50)
    print(f"  FusionSolar Scheduler Setup ({plat})")
    print("=" * 50 + "\n")

    create_fn = {
        "macos": create_task_macos,
        "linux": create_task_linux,
        "windows": create_task_windows,
    }[plat]

    success_count = 0
    for task_name, time_str, args, desc in tasks:
        if create_fn(task_name, time_str, args, desc):
            success_count += 1
        print()

    print(f"  Created {success_count}/{len(tasks)} tasks")
    print()

    if success_count < len(tasks):
        if plat == "windows":
            print("  [!] Some tasks failed. Make sure you're running as Administrator.")
        else:
            print("  [!] Some tasks failed. Check the errors above.")
    else:
        print("  [OK] All tasks created successfully!")
    print()


def remove_all_tasks(cfg):
    """Remove all FusionSolar scheduled tasks."""
    plat = detect_platform()
    tasks = get_task_names(cfg)

    print(f"\n  Removing all FusionSolar scheduled tasks ({plat})...\n")

    remove_fn = {
        "macos": remove_task_macos,
        "linux": remove_task_linux,
        "windows": remove_task_windows,
    }[plat]

    for task_name, _, _, _ in tasks:
        remove_fn(task_name)
    print()


def show_status(cfg):
    """Show current status of scheduled tasks."""
    plat = detect_platform()

    print("\n" + "=" * 50)
    print(f"  FusionSolar Scheduled Tasks ({plat})")
    print("=" * 50 + "\n")

    query_fn = {
        "macos": query_tasks_macos,
        "linux": query_tasks_linux,
        "windows": query_tasks_windows,
    }[plat]

    query_fn(cfg)

    # Also check if GitHub Actions workflow exists
    workflow_path = SCRIPT_DIR / ".github" / "workflows" / "fusionsolar_schedule.yml"
    if workflow_path.exists():
        print("  GitHub Actions workflow: FOUND")
        print(f"    Path: {workflow_path.relative_to(SCRIPT_DIR)}")
        print("    (Runs on schedule even if local tasks are not installed)")
    else:
        print("  GitHub Actions workflow: NOT FOUND")
    print()


def main():
    parser = argparse.ArgumentParser(
        description="FusionSolar Scheduler Setup (macOS/Linux/Windows)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
Platform: {platform.system()}
Supports: macOS (launchd), Linux (crontab), Windows (Task Scheduler)
        """
    )
    parser.add_argument("--install", action="store_true", help="Create scheduled tasks")
    parser.add_argument("--remove", action="store_true", help="Remove all scheduled tasks")
    parser.add_argument("--status", action="store_true", help="Show task status")

    args = parser.parse_args()

    if not any([args.install, args.remove, args.status]):
        parser.print_help()
        sys.exit(1)

    cfg = load_config()

    if args.install:
        install_tasks(cfg)
    elif args.remove:
        remove_all_tasks(cfg)
    elif args.status:
        show_status(cfg)


if __name__ == "__main__":
    main()
