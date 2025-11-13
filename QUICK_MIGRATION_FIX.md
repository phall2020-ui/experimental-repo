# Quick Fix: Internal Server Error on Save Template

## Problem
Getting "Internal Server Error" when trying to save a ticket as template.

## Cause
The `TicketTemplate` table doesn't exist in the database yet. The migration needs to be run.

## Solution: Run This SQL in Neon

### Option 1: Neon Dashboard (Easiest)

1. Go to https://console.neon.tech/
2. Open your project
3. Click **SQL Editor**
4. Copy and paste this SQL:

```sql
-- Create TicketTemplate table
CREATE TABLE "TicketTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "typeKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "details" TEXT,
    "priority" "TicketPriority" NOT NULL,
    "status" "TicketStatus" NOT NULL,
    "assignedUserId" TEXT,
    "customFields" JSONB NOT NULL DEFAULT '{}',
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "frequency" "RecurrenceFrequency",
    "intervalValue" INTEGER,
    "leadTimeDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "TicketTemplate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TicketTemplate_tenantId_idx" ON "TicketTemplate"("tenantId");
CREATE INDEX "TicketTemplate_tenantId_name_idx" ON "TicketTemplate"("tenantId", "name");

ALTER TABLE "TicketTemplate" ADD CONSTRAINT "TicketTemplate_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

5. Click **Run** or press Ctrl+Enter
6. Verify success message

### Option 2: Prisma Migrate (If you have DATABASE_URL set)

```bash
cd ticketing-suite/ticketing
export DATABASE_URL="your-neon-connection-string"
npx prisma migrate deploy
```

## Verify It Worked

After running the migration:

1. Refresh your application
2. Open a ticket
3. Click "💾 Save as Template"
4. Enter a template name
5. Click "Save Template"
6. Should see success message: "Template saved successfully"

## Check Database

In Neon SQL Editor:
```sql
SELECT * FROM "TicketTemplate";
```

Should return empty result (no error) if table exists.

## Still Having Issues?

Check:
1. Backend server restarted after migration
2. No typos in SQL
3. Database connection is working
4. User has proper permissions

## Alternative: Use Prisma Studio

```bash
cd ticketing-suite/ticketing
export DATABASE_URL="your-neon-connection-string"
npx prisma studio
```

This will show you all tables including the new TicketTemplate table.
