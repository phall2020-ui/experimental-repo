#!/bin/bash
set -e

echo "🔧 Fixing failed migration 20251110180000_ticket_id_sequence..."

if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo "Please set it to your Neon database connection string:"
    echo "export DATABASE_URL='postgresql://user:pass@ep-twilight-math-ad2rilk6-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require'"
    exit 1
fi

echo "📊 Checking current migration status..."
npx prisma migrate status || true

echo ""
echo "🗃️  Applying migration fix..."
psql "$DATABASE_URL" -f fix-migration.sql

echo ""
echo "✅ Migration fix applied successfully!"
echo ""
echo "📊 Checking migration status again..."
npx prisma migrate status

echo ""
echo "🎉 Done! You can now deploy your application."
