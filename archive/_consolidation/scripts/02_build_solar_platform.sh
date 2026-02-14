#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${1:-/Users/peterhall/Documents/GitHub/solar-platform}"

if [[ -e "$TARGET_DIR" ]] && [[ -n "$(ls -A "$TARGET_DIR" 2>/dev/null || true)" ]]; then
  echo "ERROR: target exists and is not empty: $TARGET_DIR"
  echo "Use a new directory or remove existing files first."
  exit 1
fi

mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR"

if [[ ! -d .git ]]; then
  git init -b main
fi

cat > README.md <<'MD'
# solar-platform

Consolidated monorepo for solar operations and analytics.
MD

git add README.md
git commit -m "chore: initialize solar-platform" >/dev/null

# Add local source repos as remotes
git remote add unified "/Users/peterhall/Documents/GitHub/Unified app"
git remote add monthly "/Users/peterhall/Documents/GitHub/Unified app/Monthly reporting"
git remote add toolkit "/Users/peterhall/Documents/GitHub/Unified app/Solar Toolkit"
git remote add juggle "/Users/peterhall/Documents/GitHub/inverter-data-juggle"
git remote add dailychecks "/Users/peterhall/Documents/GitHub/Inverter-daily-checks"

# Fetch all
git fetch unified main
git fetch monthly main
git fetch toolkit main
git fetch juggle main
git fetch dailychecks main

# Import unified app into compatibility path
git subtree add --prefix="platform" unified main -m "import: Unified app -> platform"

# Replace gitlink placeholders with full histories where needed
if git ls-files -s "platform/Monthly reporting" | awk '$1==160000 {found=1} END {exit !found}'; then
  git rm --cached -r "platform/Monthly reporting"
  rm -rf "platform/Monthly reporting"
  git commit -m "chore: remove Monthly reporting gitlink placeholder"
fi

if git ls-files -s "platform/Solar Toolkit" | awk '$1==160000 {found=1} END {exit !found}'; then
  git rm --cached -r "platform/Solar Toolkit"
  rm -rf "platform/Solar Toolkit"
  git commit -m "chore: remove Solar Toolkit gitlink placeholder"
fi

git subtree add --prefix="platform/Monthly reporting" monthly main -m "import: Monthly reporting history"
git subtree add --prefix="platform/Solar Toolkit" toolkit main -m "import: Solar Toolkit history"
git subtree add --prefix="tools/inverter-data-juggle" juggle main -m "import: inverter-data-juggle history"
git subtree add --prefix="jobs/inverter-daily-checks" dailychecks main -m "import: Inverter-daily-checks history"

cat > .gitignore <<'GI'
# Python
__pycache__/
*.py[cod]
*.so
.venv/
venv/

# Node
node_modules/

# OS/IDE
.DS_Store
.vscode/
.idea/

# Data artifacts
*.db
*.db-shm
*.db-wal
*.sqlite
*.sqlite3
*.csv
*.parquet
logs/
reports/
GI

git add .gitignore
git commit -m "chore: add monorepo baseline .gitignore"

echo
echo "Built consolidated repo at: $TARGET_DIR"
echo "Recent commits:"
git --no-pager log --oneline -n 12
