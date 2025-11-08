# Authentication & Authorization Setup

This document describes the authentication and authorization system added to the Ticketing Suite.

## Overview

The system now includes:
- User accounts with email/password authentication
- Two role types: ADMIN and USER
- JWT-based authentication with 7-day tokens
- Tenant-isolated user management
- Issue type management per tenant
- User assignment for tickets

## Database Schema Changes

### User Model
```prisma
model User {
  id       String   @id @default(uuid())
  tenantId String
  email    String   @unique
  password String   // bcrypt hashed
  name     String
  role     Role     @default(USER)
  tenant   Tenant   @relation(fields: [tenantId], references: [id])
  tickets  Ticket[] @relation("UserTickets")
}

enum Role {
  ADMIN
  USER
}
```

### IssueType Model
```prisma
model IssueType {
  id        String  @id @default(uuid())
  tenantId  String
  key       String
  label     String
  active    Boolean @default(true)
  tenant    Tenant  @relation(fields: [tenantId], references: [id])
  
  @@unique([tenantId, key])
}
```

## API Endpoints

### Authentication

#### POST /auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### POST /auth/register (ADMIN only)
Register a new user. Requires ADMIN role.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "role": "USER",
  "tenantId": "tenant-1"
}
```

**Response:**
```json
{
  "id": "user-id",
  "email": "newuser@example.com",
  "name": "New User",
  "role": "USER",
  "tenantId": "tenant-1"
}
```

### Directory Endpoints

These endpoints provide data for dropdowns in the UI.

#### GET /directory/sites
List all sites for the authenticated user's tenant.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  { "id": "site-1", "name": "Main Office" },
  { "id": "site-2", "name": "West Coast Branch" }
]
```

#### GET /directory/users
List all users for the authenticated user's tenant.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  { 
    "id": "user-1", 
    "name": "Admin User", 
    "email": "admin@example.com",
    "role": "ADMIN" 
  },
  { 
    "id": "user-2", 
    "name": "Regular User", 
    "email": "user@example.com",
    "role": "USER" 
  }
]
```

#### GET /directory/issue-types
List all active issue types for the authenticated user's tenant.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  { "key": "SAFETY", "label": "Safety" },
  { "key": "FAULT", "label": "Fault" },
  { "key": "SECURITY", "label": "Security" }
]
```

## Role-Based Access Control

### ADMIN Role
- Can create, read, update tickets
- Can register new users
- Can view all users, sites, and issue types

### USER Role
- Can create, read, update tickets
- Can view all users, sites, and issue types
- Cannot register new users

## Ticket Validation

When creating or updating tickets, the following validations are enforced:

1. **Site ID**: Must belong to the same tenant
2. **Type Key**: Must exist in IssueType table for the tenant and be active
3. **Assigned User ID**: If provided, must be a user in the same tenant

## Frontend Integration

### Login Page
A login page is available at `/login` where users can authenticate with their email and password.

### Dropdowns
The ticket edit view now includes dropdowns for:
- **Site**: Select from available sites
- **Issue Type**: Select from active issue types
- **Assigned User**: Assign to a user or leave unassigned

## Seeding the Database

### Using TypeScript Seed Script
```bash
cd ticketing-suite/ticketing
npm run seed
```

This will create:
- A test tenant (tenant-1)
- Two sites (Main Office, West Coast Branch)
- Two users:
  - Admin: admin@example.com / admin123
  - User: user@example.com / user123
- Five issue types (Safety, Fault, Security, Maintenance, Other)
- Two sample tickets

### Using SQL Script
```bash
cd ticketing-suite/ticketing
psql $DATABASE_URL -f prisma/seed.sql
```

Note: Update the tenant ID in seed.sql to match your existing tenant.

## Environment Variables

### Backend
```env
JWT_SECRET=your-secret-key-here  # Default: 'dev-secret'
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### Frontend
```env
VITE_API_BASE=http://localhost:3000
```

## Migration

To apply the database migration:

```bash
cd ticketing-suite/ticketing
npx prisma migrate deploy
```

Or in development:
```bash
npx prisma migrate dev
```

## Testing

### Login Test
1. Start the backend: `npm run dev`
2. Start the frontend: `cd ../ticketing-dashboard && npm run dev`
3. Navigate to http://localhost:5173/login
4. Use test credentials:
   - Email: `admin@example.com`
   - Password: `admin123`

### API Test
```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Get sites (use token from login response)
curl -X GET http://localhost:3000/directory/sites \
  -H "Authorization: Bearer <token>"
```

## Security Notes

1. Passwords are hashed using bcrypt with 10 salt rounds
2. JWT tokens expire after 7 days
3. All endpoints except /auth/login require authentication
4. Role-based access control is enforced at the controller level
5. Tenant isolation is enforced at the service level
6. No known vulnerabilities in bcrypt dependency (checked with GitHub Advisory Database)
7. CodeQL analysis passed with 0 alerts
