# Migration Fix Instructions

## Problem
The migration `20251110180000_ticket_id_sequence` failed in your production database (Neon).

## Solution Options

### Option 1: Mark Migration as Resolved (Recommended if table already exists)

If the `SiteTicketSequence` table already exists in your database, you can mark the migration as resolved:

```bash
# Connect to your Neon database and run:
psql "postgresql://[user]:[password]@ep-twilight-math-ad2rilk6-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require" -f ticketing-suite/ticketing/fix-migration.sql
```

Or manually in your database console:

```sql
-- Mark the failed migration as rolled back
UPDATE "_prisma_migrations" 
SET rolled_back_at = NOW(), 
    finished_at = NULL 
WHERE migration_name = '20251110180000_ticket_id_sequence';

-- Then delete the failed migration record
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20251110180000_ticket_id_sequence';
```

Then redeploy your application to retry the migration.

### Option 2: Apply the Fix Script

Run the fix script that handles the migration gracefully:

```bash
# From your local machine or deployment environment
cd ticketing-suite/ticketing
psql "$DATABASE_URL" -f fix-migration.sql
```

### Option 3: Reset and Reapply All Migrations (Nuclear Option)

⚠️ **WARNING: This will delete all data!**

Only use this if you're okay losing all data:

```bash
# Connect to your database
psql "$DATABASE_URL"

# Drop and recreate the schema
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

# Exit psql and run migrations
npx prisma migrate deploy
```

## Verification

After applying the fix, verify the migration status:

```bash
npx prisma migrate status
```

You should see all migrations marked as applied.

## For Railway/Production Deployment

If you're deploying to Railway or another platform:

1. Add the fix script to your deployment
2. Update your start script to run the fix before migrations:

```bash
#!/bin/bash
# In start.sh
psql "$DATABASE_URL" -f fix-migration.sql 2>/dev/null || true
npx prisma migrate deploy
node dist/src/main.js
```

## Quick Fix Command

If you have `psql` installed locally and your DATABASE_URL set:

```bash
cd /workspaces/Tickets/ticketing-suite/ticketing
psql "$DATABASE_URL" -f fix-migration.sql
```
