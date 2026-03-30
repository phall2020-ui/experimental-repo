# PostgreSQL Installation Guide

## Option 1: Install via Homebrew (Recommended for macOS)

### Step 1: Install Homebrew (if not installed)

Open Terminal and run:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the prompts. This may ask for your password.

### Step 2: Install PostgreSQL

```bash
brew install postgresql@16
```

### Step 3: Start PostgreSQL Service

```bash
brew services start postgresql@16
```

### Step 4: Create the Database

```bash
createdb ticketing
```

### Step 5: Run Setup and Seed

```bash
cd ticketing-suite/ticketing
./setup-and-seed.sh
```

---

## Option 2: Install PostgreSQL.app (GUI - macOS)

1. Download PostgreSQL.app from: https://postgresapp.com/
2. Install and launch the app
3. Click "Initialize" to create a new server
4. Open Terminal and add PostgreSQL to your PATH:
   ```bash
   sudo mkdir -p /etc/paths.d &&
   echo /Applications/Postgres.app/Contents/Versions/latest/bin | sudo tee /etc/paths.d/postgresapp
   ```
5. Restart Terminal or run:
   ```bash
   export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"
   ```
6. Create the database:
   ```bash
   createdb ticketing
   ```
7. Run setup:
   ```bash
   cd ticketing-suite/ticketing
   ./setup-and-seed.sh
   ```

---

## Option 3: Use Docker (If Docker is Available)

```bash
cd ticketing-suite
docker compose up -d db
cd ticketing
./setup-and-seed.sh
```

---

## Option 4: Download Official Installer

1. Visit: https://www.postgresql.org/download/macosx/
2. Download the installer for macOS
3. Run the installer and follow the setup wizard
4. During installation, note the port (default: 5432) and password you set
5. Update DATABASE_URL in `.env` file if you set a custom password
6. Create the database:
   ```bash
   createdb ticketing
   ```
7. Run setup:
   ```bash
   cd ticketing-suite/ticketing
   ./setup-and-seed.sh
   ```

---

## Verify Installation

After installation, verify PostgreSQL is running:

```bash
# Check if PostgreSQL is running
pg_isready

# Or check the version
psql --version

# Connect to PostgreSQL
psql postgres
```

---

## Troubleshooting

### "command not found: createdb"
- Make sure PostgreSQL bin directory is in your PATH
- For Homebrew: `/opt/homebrew/bin` or `/usr/local/bin`
- For PostgreSQL.app: `/Applications/Postgres.app/Contents/Versions/latest/bin`

### "Connection refused"
- Ensure PostgreSQL service is running
- Check the port (default: 5432)
- Verify DATABASE_URL in `.env` file

### "database does not exist"
- Create it: `createdb ticketing`
- Or update DATABASE_URL to use a different database name

---

## Quick Start (After Installation)

Once PostgreSQL is installed and running:

```bash
# Create database
createdb ticketing

# Navigate to project
cd ticketing-suite/ticketing

# Run setup and seed
./setup-and-seed.sh
```

This will:
1. Generate Prisma Client
2. Run migrations
3. Seed with 8 sites, 10 users, and sample data

