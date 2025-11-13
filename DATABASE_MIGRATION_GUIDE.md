# Database Migration Guide for Neon

## Option 1: Automatic Migration (Recommended)

### Step 1: Set Environment Variable
Make sure your `DATABASE_URL` is set in your environment (Neon connection string):

```bash
export DATABASE_URL="postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require"
```

Or add it to your `.env` file:
```
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/dbname?sslmode=require
```

### Step 2: Create Migration
From the `ticketing-suite/ticketing` directory:

```bash
cd ticketing-suite/ticketing
npx prisma migrate dev --name add_plain_password_field
```

This will:
- Create a new migration file
- Apply it to your Neon database
- Regenerate Prisma client

### Step 3: Verify Migration
```bash
npx prisma migrate status
```

---

## Option 2: Production Deployment (No Prompts)

If you're deploying to production or don't want interactive prompts:

```bash
cd ticketing-suite/ticketing
npx prisma migrate deploy
```

This applies all pending migrations without prompts.

---

## Option 3: Manual SQL (If Automated Fails)

### Step 1: Connect to Neon
Go to your Neon dashboard: https://console.neon.tech/

### Step 2: Open SQL Editor
Click on your project → SQL Editor

### Step 3: Run This SQL
```sql
-- Add plainPassword column to User table
ALTER TABLE "User" ADD COLUMN "plainPassword" TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'User';
```

### Step 4: Update Migration History (Optional)
If you want Prisma to know about this migration:

```bash
cd ticketing-suite/ticketing
npx prisma migrate resolve --applied add_plain_password_field
```

---

## Troubleshooting

### Error: "Environment variable not found: DATABASE_URL"

**Solution:** Set your Neon connection string:
```bash
export DATABASE_URL="your-neon-connection-string"
```

Get your connection string from Neon dashboard → Connection Details

### Error: "Can't reach database server"

**Solution:** Check your Neon database is running and connection string is correct:
```bash
npx prisma db pull
```

### Error: "Migration already applied"

**Solution:** The migration already ran. Check status:
```bash
npx prisma migrate status
```

---

## Verify Migration Worked

### Check Database Schema:
```bash
npx prisma db pull
```

### Check in Neon SQL Editor:
```sql
SELECT * FROM "User" LIMIT 1;
```

You should see the `plainPassword` column.

---

## After Migration

1. **Restart your backend server** to use the new schema
2. **Test user creation** - new users should have plainPassword stored
3. **Test password reset** - resetting password should store plainPassword
4. **Check admin view** - admins should see password column with Show/Hide

---

## Quick Commands Reference

```bash
# Navigate to backend
cd ticketing-suite/ticketing

# Check migration status
npx prisma migrate status

# Create and apply migration (development)
npx prisma migrate dev --name add_plain_password_field

# Apply pending migrations (production)
npx prisma migrate deploy

# Pull current database schema
npx prisma db pull

# Regenerate Prisma client
npx prisma generate
```

---

## Neon-Specific Notes

- Neon databases are always online (no need to start/stop)
- Connection strings include `?sslmode=require` - keep this
- Migrations are instant on Neon (serverless)
- You can view migration history in Neon dashboard → Branches → Schema
- Neon supports branching - consider testing migration on a branch first

---

## Testing on Neon Branch (Recommended)

1. Create a branch in Neon dashboard
2. Get the branch connection string
3. Set `DATABASE_URL` to branch connection string
4. Run migration on branch
5. Test thoroughly
6. If successful, run migration on main branch

---

## Need Help?

- Neon Docs: https://neon.tech/docs/introduction
- Prisma Migrate Docs: https://www.prisma.io/docs/concepts/components/prisma-migrate
- Check migration files: `ticketing-suite/ticketing/prisma/migrations/`
