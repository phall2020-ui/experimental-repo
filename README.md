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

- 🏢 **Multi-tenancy**: Isolated data and operations per tenant
- 🎫 **Ticket Management**: Full CRUD operations with status tracking and priority levels
- 👥 **User Assignment**: Assign tickets to team members
- 💬 **Comments**: Public and internal comments with attachment support
- 📎 **Attachments**: S3-backed file storage with metadata tracking
- 🔍 **Advanced Search**: OpenSearch-powered full-text search
- 🏗️ **Custom Fields**: Flexible field definitions per tenant
- 🏢 **Site Management**: Organize tickets by locations/sites
- 🔐 **Authentication**: JWT-based authentication with Passport
- 📊 **Health Checks**: Built-in health monitoring endpoints
- 🚦 **Rate Limiting**: Protection against abuse
- 📈 **Observability**: OpenTelemetry instrumentation

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

- Docker and Docker Compose (recommended)
- Node.js 18+ (for local development)
- PostgreSQL 16 (for local development without Docker)
- Redis 7 (for local development without Docker)

## Getting Started

### Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/phall2020-ui/Tickets.git
cd Tickets/ticketing-suite
```

2. Start all services:
```bash
docker-compose up
```

This will start:
- PostgreSQL database on port 5432
- Redis on port 6379
- OpenSearch on port 9200
- Backend API on port 3000
- Dashboard UI on port 5173

3. Access the application:
- Dashboard: http://localhost:5173
- API: http://localhost:3000
- API Documentation: http://localhost:3000/api

### Local Development

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

4. Start the development server:
```bash
npm run dev
```

## Available Scripts

### Backend (`ticketing-suite/ticketing`)

- `npm run dev` - Start development server with watch mode
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

## Health Checks

The backend provides health check endpoints:
- `/health` - Overall system health
- `/health/db` - Database health
- `/health/redis` - Redis health
- `/health/opensearch` - OpenSearch health

## License

MIT
