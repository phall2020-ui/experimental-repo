#!/bin/sh
set -e

echo "🔧 Starting container. PWD=$(pwd) PORT=${PORT} NODE_ENV=${NODE_ENV}"

# Show what's actually in the image (helps debugging)
echo "📂 Listing /app (top)…"; ls -la | sed -n '1,120p' || true
echo "📂 Listing /app/dist (top)…"; ls -la dist 2>/dev/null | sed -n '1,200p' || true

# Pick whichever build artifact exists
ENTRY=""
if [ -f "dist/src/main.js" ]; then
  ENTRY="dist/src/main.js"
elif [ -f "dist/main.js" ]; then
  ENTRY="dist/main.js"
fi

if [ -z "$ENTRY" ]; then
  echo "❌ No build artifact found at dist/src/main.js or dist/main.js"
  exit 1
fi
echo "✅ Using entry: $ENTRY"

echo "🗃️  Running prisma migrate deploy…"
npx prisma migrate deploy

echo "🚀 Launching app…"
exec node "$ENTRY"
