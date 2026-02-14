#!/usr/bin/env bash
set -euo pipefail

repos=(
  "/Users/peterhall/Documents/GitHub/Fitness-app"
  "/Users/peterhall/Documents/GitHub/Inverter-daily-checks"
  "/Users/peterhall/Documents/GitHub/Polymarket bot/Polymarket-spike-bot-v1"
  "/Users/peterhall/Documents/GitHub/Tickets"
  "/Users/peterhall/Documents/GitHub/Unified app"
  "/Users/peterhall/Documents/GitHub/Unified app/Monthly reporting"
  "/Users/peterhall/Documents/GitHub/Unified app/Solar Toolkit"
  "/Users/peterhall/Documents/GitHub/inverter-data-juggle"
)

echo "== Repo preflight =="
for r in "${repos[@]}"; do
  if [[ ! -d "$r/.git" ]]; then
    echo "MISSING GIT: $r"
    continue
  fi
  branch=$(git -C "$r" rev-parse --abbrev-ref HEAD)
  head=$(git -C "$r" rev-parse --short HEAD)
  dirty=$(git -C "$r" status --porcelain | wc -l | tr -d ' ')
  remote=$(git -C "$r" remote get-url origin 2>/dev/null || echo "-")
  echo "$r"
  echo "  branch=$branch head=$head dirty=$dirty"
  echo "  origin=$remote"
  if [[ "$dirty" != "0" ]]; then
    echo "  WARN: uncommitted changes exist; they will not be imported"
  fi
done

echo
echo "== Unified app gitlink check =="
git -C "/Users/peterhall/Documents/GitHub/Unified app" ls-files -s \
  | awk '$1==160000 {sub(/^[^\t]*\t/, ""); print "gitlink: " $0}' || true

echo
echo "== inverter-data-juggle .gitignore sanity =="
if rg -n '`n' "/Users/peterhall/Documents/GitHub/inverter-data-juggle/.gitignore" >/dev/null 2>&1; then
  echo "WARN: .gitignore contains literal backtick-n sequences and should be rewritten"
else
  echo "OK: .gitignore newline format looks normal"
fi
