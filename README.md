# Tickets

Enterprise-grade multi-tenant ticketing system for asset management platforms.

## Overview

This repository contains a complete ticketing solution with a RESTful API backend service and a modern React-based dashboard. The system is designed for multi-tenant environments and provides comprehensive ticket management capabilities including custom fields, attachments, comments, user assignments, and advanced search functionality.

## Architecture

The system consists of three main components:

- **Backend Service** (`ticketing-suite/ticketing`): NestJS-based RESTful API with multi-tenant support
- **Dashboard UI** (`ticketing-suite/ticketing-dashboard`): React + Vite frontend for ticket management
- **Infrastructure**: PostgreSQL, Redis, and OpenSearch for data persistence, caching, and search

## Features

### Core Functionality
- 🏢 **Multi-tenancy**: Isolated data and operations per tenant
- 🎫 **Ticket Management**: Full CRUD operations with status tracking and priority levels
- 👥 **User Assignment**: Assign tickets to team members
- 💬 **Comments**: Public and internal comments with edit/delete capabilities
- 📎 **Attachments**: S3-backed file storage with upload, download, and delete operations
- 🔍 **Advanced Search**: OpenSearch-powered full-text search with date range filtering
- 🏗️ **Custom Fields**: Flexible field definitions per tenant with filtering support
- 🏢 **Site Management**: Organize tickets by locations/sites
- 🔐 **Authentication**: JWT-based authentication with Passport
- 📊 **Health Checks**: Built-in health monitoring endpoints
- 🚦 **Rate Limiting**: Protection against abuse
- 📈 **Observability**: OpenTelemetry instrumentation

### Admin Features
- 👤 **User Management**: Create, update, delete users and reset passwords (admin only)
- 🏷️ **Issue Type Management**: Create, edit, and deactivate issue types (admin only)
- ⚙️ **Field Definition Management**: Create, update, and delete custom field definitions (admin only)

### Filtering & Search
- Filter tickets by status, priority, type, site, assigned user
- Date range filtering (created date)
- Custom field filtering (one field at a time)
- Full-text search across descriptions, details, and types
- Save and restore filter preferences

## Technology Stack

### Backend
- **Framework**: NestJS 10.x
- **Database**: PostgreSQL 16 with Prisma ORM
- **Cache**: Redis 7
- **Search**: OpenSearch 2.11
- **Storage**: AWS S3
- **Language**: TypeScript 5.x

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **Routing**: React Router 6
- **HTTP Client**: Axios
- **Language**: TypeScript 5.x

## Prerequisites

### Minimal Setup (Free Tier)
- Node.js 18+
- Free accounts for:
  - [Neon](https://neon.tech) - Serverless Postgres (free tier available)
  - [Upstash](https://upstash.com) - Serverless Redis (free tier available)

### Full Setup (All Features)
- All minimal requirements plus:
- Docker and Docker Compose (for local development)
- AWS Account (for S3 attachments)
- OpenSearch instance (for full-text search)

## Getting Started

### Free Setup with Neon + Upstash (Recommended for Development)

This setup allows you to run the application using free managed services without installing any databases locally.

1. **Create a Neon Postgres Database**
   - Sign up at https://neon.tech
   - Create a new project and database
   - Copy your connection string (it should include `sslmode=require`)
   - Example: `postgresql://user:pass@ep-xxx-yyy.us-east-2.aws.neon.tech/neondb?sslmode=require`

2. **Create an Upstash Redis Database**
   - Sign up at https://upstash.com
   - Create a new Redis database
   - Copy your connection string (starts with `rediss://` for TLS)
   - Example: `rediss://default:password@region.upstash.io:6379`

3. **Clone and configure the repository**
   ```bash
   git clone https://github.com/phall2020-ui/Tickets.git
   cd Tickets/ticketing-suite/ticketing
   ```

4. **Create a `.env` file**
   ```bash
   # Required
   DATABASE_URL="postgresql://user:pass@your-neon-host.neon.tech:5432/neondb?sslmode=require"
   REDIS_URL="rediss://default:pass@your-upstash-host.upstash.io:6379"
   
   # Optional (defaults shown)
   NODE_ENV="development"
   PORT=3000
   
   # Optional features (leave empty to disable)
   OPENSEARCH_NODE=""
   OPENSEARCH_USER=""
   OPENSEARCH_PASS=""
   S3_BUCKET=""
   AWS_REGION=""
   ```

5. **Verify your configuration**
   ```bash
   npm install
   npm run check:env
   ```

6. **Run database migrations**
   ```bash
   npm run prisma:generate
   npm run prisma:deploy
   ```

7. **Start the development server**
   ```bash
   npm run dev:neon
   ```

8. **Set up the frontend** (in a new terminal)
   ```bash
   cd ../ticketing-dashboard
   npm install
   
   # Create .env file
   echo "VITE_API_BASE=http://localhost:3000" > .env
   
   npm run dev
   ```

9. **Access the application**
   - Dashboard: http://localhost:5173
   - API: http://localhost:3000
   - API Documentation: http://localhost:3000/docs
   - Feature Status: http://localhost:3000/features

**Note:** With this setup:
- ✓ Core ticketing features work fully
- ✓ Database operations via Neon
- ✓ Caching via Upstash Redis
- ✗ Search is disabled (requires OpenSearch)
- ✗ Attachments are disabled (requires S3)

### Using Docker Compose with Managed Services

You can also use Docker Compose with external managed services:

1. Create a `.env` file in `ticketing-suite/` with your Neon and Upstash credentials
2. Run: `docker-compose up`
   - The `docker-compose.override.yml` file automatically disables local DB/Redis services

### Using Docker Compose (Local Services)

For fully local development with all services:

1. Clone the repository:
```bash
git clone https://github.com/phall2020-ui/Tickets.git
cd Tickets/ticketing-suite
```

2. Rename or remove `docker-compose.override.yml`:
```bash
mv docker-compose.override.yml docker-compose.override.yml.disabled
```

3. Start all services:
```bash
docker-compose up
```

This will start:
- PostgreSQL database on port 5432
- Redis on port 6379
- OpenSearch on port 9200
- Backend API on port 3000
- Dashboard UI on port 5173

4. Access the application:
- Dashboard: http://localhost:5173
- API: http://localhost:3000
- API Documentation: http://localhost:3000/docs

### Local Development (Without Docker)

#### Backend Setup

1. Navigate to the backend directory:
```bash
cd ticketing-suite/ticketing
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create a .env file with:
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

4. Run database migrations:
```bash
npm run prisma:generate
npm run prisma:deploy
```

5. (Optional) Seed the database:
```bash
npm run seed
```

6. Start the development server:
```bash
npm run dev
```

#### Frontend Setup

1. Navigate to the dashboard directory:
```bash
cd ticketing-suite/ticketing-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create a .env file with:
VITE_API_BASE=http://localhost:3000
```

#### Hide debug controls in the header

```
# Hide debug controls in the header
VITE_SHOW_DEBUG_CONTROLS=false  # default
```

4. Start the development server:
```bash
npm run dev
```

## Available Scripts

### Backend (`ticketing-suite/ticketing`)

- `npm run dev` - Start development server with watch mode
- `npm run dev:neon` - Start development server with environment validation (for external DBs)
- `npm run check:env` - Verify environment configuration and show feature availability
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run prisma:dev` - Run database migrations (development)
- `npm run prisma:deploy` - Deploy database migrations (production)
- `npm run prisma:generate` - Generate Prisma client
- `npm run seed` - Seed database with sample data

### Frontend (`ticketing-suite/ticketing-dashboard`)

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Project Structure

```
Tickets/
├── .devcontainer/          # Dev container configuration
├── ticketing-suite/
│   ├── docker-compose.yml  # Docker orchestration
│   ├── ticketing/          # Backend NestJS service
│   │   ├── prisma/         # Database schema and migrations
│   │   ├── src/
│   │   │   ├── tickets/    # Ticket management module
│   │   │   ├── comments/   # Comment management module
│   │   │   ├── attachments/# Attachment management module
│   │   │   ├── auth/       # Authentication module
│   │   │   ├── health/     # Health check endpoints
│   │   │   ├── infra/      # Infrastructure (DB, cache, search)
│   │   │   └── common/     # Shared utilities
│   │   └── Dockerfile
│   └── ticketing-dashboard/# Frontend React application
│       ├── src/
│       └── Dockerfile
└── README.md
```

## Database Schema

The system uses PostgreSQL with the following main entities:

- **Tenant**: Multi-tenant isolation
- **Site**: Physical locations/sites
- **User**: System users per tenant
- **Ticket**: Core ticket entity with status, priority, assignments
- **TicketFieldDef**: Custom field definitions
- **Comment**: Ticket comments (public/internal)
- **Attachment**: File attachments for tickets and comments
- **Outbox**: Event outbox for eventual consistency

## API Documentation

Once the backend is running, API documentation is available at:
- Swagger UI: http://localhost:3000/api

## Environment Variables

### Backend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `S3_BUCKET` | AWS S3 bucket name | `ticketing-attachments` |
| `AWS_REGION` | AWS region | `eu-west-2` |
| `OPENSEARCH_NODE` | OpenSearch endpoint | `http://localhost:9200` |
| `OPENSEARCH_USER` | OpenSearch username | `admin` |
| `OPENSEARCH_PASS` | OpenSearch password | `admin` |
| `NODE_ENV` | Environment | `development` or `production` |
| `PORT` | Server port | `3000` |

### Frontend Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE` | Backend API base URL | `http://localhost:3000` |

## Feature Availability

The application supports optional features that can be enabled or disabled via environment configuration:

### Full-Text Search
- **Status Check**: `GET /features` returns `{ search: boolean }`
- **Requirements**: 
  - `OPENSEARCH_NODE` - OpenSearch endpoint
  - `OPENSEARCH_USER` - OpenSearch username
  - `OPENSEARCH_PASS` - OpenSearch password
- **When Disabled**: Search falls back to database filtering (case-insensitive substring matching)
- **UI Behavior**: Search interface is hidden/disabled when unavailable

### Attachments
- **Status Check**: `GET /features` returns `{ attachments: boolean }`
- **Requirements**:
  - `S3_BUCKET` - AWS S3 bucket name
  - `AWS_REGION` - AWS region
  - AWS credentials (via environment or IAM role)
- **When Disabled**: Returns 501 (Not Implemented) on attachment operations
- **UI Behavior**: Attachment UI is hidden/disabled when unavailable

### Adding OpenSearch Later

1. Set up an OpenSearch instance (local or managed)
2. Add environment variables:
   ```
   OPENSEARCH_NODE=https://your-opensearch-host:9200
   OPENSEARCH_USER=admin
   OPENSEARCH_PASS=your-password
   ```
3. Restart the application
4. Search will be automatically enabled

### Adding S3 Attachments Later

1. Create an S3 bucket in AWS
2. Configure AWS credentials (environment variables or IAM role)
3. Add environment variables:
   ```
   S3_BUCKET=your-bucket-name
   AWS_REGION=your-region
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   ```
4. Restart the application
5. Attachments will be automatically enabled

## Health Checks

The backend provides health check endpoints:
- `/health` - Overall system health
- `/health/db` - Database health
- `/health/redis` - Redis health
- `/features` - Feature availability status

## Using Neon Postgres

Neon is a serverless Postgres platform with a generous free tier, perfect for development and small deployments.

### Connection String Format
```
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

**Important**: Always include `?sslmode=require` for Neon connections.

### Example
```
DATABASE_URL="postgresql://myuser:mypass@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### Migrations
Prisma migrations work seamlessly with Neon:
```bash
npm run prisma:deploy
```

## Testing

### Running Tests

The application includes comprehensive test suites that work with minimal configuration:

```bash
cd ticketing-suite/ticketing

# Run unit tests
npm run test

# Run e2e tests (requires database)
npm run test:e2e
```

### Testing with Optional Features Disabled

Tests are designed to work whether optional features (search, attachments) are enabled or not:

- **Features endpoint test**: Verifies that feature flags correctly reflect environment configuration
- **Core CRUD tests**: Work without OpenSearch or S3 configured
- **Search tests**: Use database filtering when OpenSearch is unavailable
- **Attachment tests**: Can be skipped when S3 is not configured

To run tests with minimal configuration (no OpenSearch/S3):
```bash
# Set only required environment variables
export DATABASE_URL="postgresql://..."
export REDIS_URL="redis://..."

# Run tests
npm run test:e2e
```

## License

MIT
# Predictive-maintenance
