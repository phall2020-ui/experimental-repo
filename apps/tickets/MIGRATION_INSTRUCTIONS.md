# Ticket History Feature - Migration Instructions

## Running the Migration

Before deploying this feature, you need to run the database migration to create the `TicketHistory` table.

### Development Environment

```bash
cd ticketing-suite/ticketing
npx prisma migrate dev
```

### Production Environment

```bash
cd ticketing-suite/ticketing
npx prisma migrate deploy
```

### Manual Migration (if needed)

If you need to run the migration manually, execute the SQL file:

```bash
psql $DATABASE_URL < ticketing-suite/ticketing/prisma/migrations/20251108173416_add_ticket_history/migration.sql
```

## What the Migration Does

The migration creates:
- A new `TicketHistory` table with columns:
  - `id` (UUID primary key)
  - `tenantId` (tenant isolation)
  - `ticketId` (foreign key to Ticket)
  - `actorUserId` (nullable - user who made the change)
  - `at` (timestamp, defaults to now)
  - `changes` (JSONB - stores field changes as diffs)

- Foreign key constraints to `Tenant` and `Ticket` tables (with CASCADE delete)
- Index on `(tenantId, ticketId, at)` for efficient history queries

## Testing the Feature

After running the migration:

1. Create a new ticket via the API or UI
2. Update the ticket (change status, priority, details, etc.)
3. Fetch the history via `GET /tickets/{id}/history`
4. View the history timeline in the ticket detail page UI

The history will show:
- Timestamp of each change
- User who made the change (from JWT token)
- Field-level diffs (from → to values)
