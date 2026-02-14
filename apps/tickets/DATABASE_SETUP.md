# Database Setup Guide

## Prerequisites

You need PostgreSQL installed and running. Choose one of the following options:

### Option 1: Docker (Recommended - Easiest)

If you have Docker installed:

```bash
cd ticketing-suite
docker compose up -d db
```

This will start PostgreSQL in a container. Wait a few seconds for it to be ready.

### Option 2: Local PostgreSQL Installation

#### macOS (using Homebrew):
```bash
brew install postgresql@16
brew services start postgresql@16
createdb ticketing
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb ticketing
```

#### Windows:
Download and install PostgreSQL from https://www.postgresql.org/download/windows/
Create a database named `ticketing` using pgAdmin or psql.

## Setup and Seed

Once PostgreSQL is running, run the setup script:

```bash
cd ticketing-suite/ticketing
./setup-and-seed.sh
```

Or manually:

```bash
cd ticketing-suite/ticketing

# Create .env file if it doesn't exist (update DATABASE_URL if needed)
# Default: postgresql://postgres:postgres@localhost:5432/ticketing?schema=public

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:deploy

# Seed database
npm run seed
```

## Verify Setup

After seeding, you should see output like:

```
✅ Setup complete! Database has been seeded with:
   - 1 Tenant
   - 8 Sites
   - 10 Users (2 admins, 8 regular users)
   - 5 Issue Types
   - 2 Sample Tickets
```

## Test Credentials

### Admin Users
- **Admin User**: admin@example.com / admin123
- **Manager User**: manager@example.com / manager123

### Regular Users
- **Regular User**: user@example.com / user123
- **John Doe**: john.doe@example.com / password123
- **Jane Smith**: jane.smith@example.com / password123
- **Bob Jones**: bob.jones@example.com / password123
- **Alice Brown**: alice.brown@example.com / password123
- **Charlie Wilson**: charlie.wilson@example.com / password123
- **Diana Miller**: diana.miller@example.com / password123
- **Edward Davis**: edward.davis@example.com / password123

## Troubleshooting

### "Can't reach database server"
- Ensure PostgreSQL is running
- Check that the port (default 5432) is correct
- Verify DATABASE_URL in .env file

### "database does not exist"
- Create the database: `createdb ticketing` (or use pgAdmin)
- Or update DATABASE_URL to point to an existing database

### "password authentication failed"
- Update DATABASE_URL with correct username/password
- Default Docker setup: postgres/postgres
- Default local setup: your system user (no password) or postgres/postgres

