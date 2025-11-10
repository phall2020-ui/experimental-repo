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

if [ "${RUN_SEED}" = "1" ]; then
  echo "🌱 Seeding base data (RUN_SEED=1)..."
  npm run seed || { echo "❌ seed failed"; exit 1; }
fi

if [ "${RUN_TEST_SEED}" = "1" ]; then
  echo "🌱 Seeding test data (RUN_TEST_SEED=1)..."
  npm run seed:test || { echo "❌ seed:test failed"; exit 1; }
fi

echo "🚀 Launching app…"
exec node "$ENTRY"
