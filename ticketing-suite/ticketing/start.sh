#!/bin/sh
set -e

echo "🔧 Starting container. PORT=${PORT} NODE_ENV=${NODE_ENV}"

# Ensure build output exists
if [ ! -f "dist/src/main.js" ]; then
  echo "❌ dist/src/main.js not found. Built files:"
  ls -R dist | sed -n '1,200p' || true
  exit 1
fi

echo "🗃️ Running prisma migrate deploy..."
npx prisma migrate deploy

echo "🚀 Launching app..."
exec node dist/src/main.js
