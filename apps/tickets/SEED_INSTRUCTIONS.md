# Database Seeding Instructions

## Prerequisites

You need a PostgreSQL database running. You can either:

### Option 1: Use Docker Compose (Recommended)
```bash
cd ticketing-suite
docker compose up -d db
```

### Option 2: Use Local PostgreSQL
Make sure PostgreSQL is installed and running locally.

## Setup Environment

Create a `.env` file in `ticketing-suite/ticketing/` with:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ticketing?schema=public"
REDIS_URL="redis://localhost:6379"
S3_BUCKET="ticketing-attachments"
AWS_REGION="eu-west-2"
OPENSEARCH_NODE="http://localhost:9200"
OPENSEARCH_USER="admin"
OPENSEARCH_PASS="admin"
NODE_ENV="development"
PORT=3000
```

## Run Migrations

```bash
cd ticketing-suite/ticketing
npm run prisma:generate
npm run prisma:deploy
```

## Run Seed Script

```bash
cd ticketing-suite/ticketing
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ticketing?schema=public"
npm run seed
```

Or if you have a `.env` file:
```bash
cd ticketing-suite/ticketing
npm run seed
```

## What Gets Seeded

The seed script creates:

- **1 Tenant**: Test Tenant
- **8 Sites**: Main Office, West Coast Branch, Chicago Facility, Dallas Warehouse, Boston Office, Seattle Branch, Miami Location, Denver Site
- **10 Users**:
  - 2 Admin users (admin@example.com, manager@example.com)
  - 8 Regular users (user@example.com, john.doe@example.com, etc.)
- **5 Issue Types**: Safety, Fault, Security, Maintenance, Other
- **2 Sample Tickets**

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

