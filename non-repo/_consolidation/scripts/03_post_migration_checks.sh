#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-/Users/peterhall/Documents/GitHub/solar-platform}"
cd "$TARGET_DIR"

echo "== Required path checks =="
required=(
  "platform/app.py"
  "platform/Monthly reporting/README.md"
  "platform/Solar Toolkit/README.md"
  "tools/inverter-data-juggle/inverter_pipeline.py"
  "jobs/inverter-daily-checks/inverter_monitor.py"
)

for p in "${required[@]}"; do
  if [[ -e "$p" ]]; then
    echo "OK   $p"
  else
    echo "MISS $p"
    exit 1
  fi
done

echo
echo "== Gitlink residue check =="
if git ls-files -s | awk '$1==160000 {print}' | rg . >/dev/null 2>&1; then
  echo "FAIL: gitlinks still present"
  git ls-files -s | awk '$1==160000 {print}'
  exit 1
fi
echo "OK   no gitlinks"

echo
echo "== Quick code link checks =="
rg -n "Monthly reporting|Solar Toolkit" platform/app.py platform/app_config/base.py || true

echo
echo "== Repo status =="
git status --short

echo
echo "Post-migration checks complete."
