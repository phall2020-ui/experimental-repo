# Testing Environment Setup Guide

## Overview

This guide will help you set up a complete testing environment with comprehensive seed data for the ticketing system.

## Quick Start

### 1. Start the Backend Services

```bash
cd ticketing-suite/ticketing

# Install dependencies (if not already done)
npm install

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:deploy

# Seed the database with test data
npm run seed:test
```

### 2. Start the Frontend

```bash
cd ticketing-suite/ticketing-dashboard

# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev
```

The dashboard will be available at: **http://localhost:5173**

## Test Credentials

### Admin Account
- **Email:** `admin@acme.com`
- **Password:** `password123`
- **Role:** ADMIN (full access)

### User Accounts
All users have the same password: `password123`

| Email | Name | Role |
|-------|------|------|
| john@acme.com | John Smith | USER |
| sarah@acme.com | Sarah Johnson | USER |
| mike@acme.com | Mike Chen | USER |
| emma@acme.com | Emma Davis | USER |
| alex@acme.com | Alex Rodriguez | USER |

## Seeded Data

### Tenant
- **Name:** Acme Corporation
- **ID:** test-tenant-001

### Sites (5 locations)
1. **Headquarters** - New York, NY
2. **West Coast Office** - San Francisco, CA
3. **Midwest Hub** - Chicago, IL
4. **Southern Branch** - Austin, TX
5. **East Coast Center** - Boston, MA

### Issue Types (8 types)
- Bug Report
- Feature Request
- Support Request
- Incident
- Maintenance
- Security Issue
- Documentation
- Infrastructure

### Custom Fields (4 fields)
1. **Severity** (enum): Critical, High, Medium, Low
2. **Environment** (enum): Production, Staging, Development, Testing
3. **Estimated Hours** (number)
4. **Customer Impact** (boolean)

### Tickets (15 diverse tickets)

The seed data includes a variety of tickets with different:
- **Statuses:** NEW, TRIAGE, IN_PROGRESS, PENDING, RESOLVED, CLOSED
- **Priorities:** P1 (Critical), P2 (High), P3 (Medium), P4 (Low)
- **Types:** All 8 issue types represented
- **Assignments:** Mix of assigned and unassigned tickets
- **Custom Fields:** Various combinations of custom field values

#### Sample Tickets Include:
- 🔴 **P1 Critical:** Login page not loading on mobile devices
- 🔴 **P1 Critical:** Database connection timeout errors
- 🔴 **P1 Critical:** Potential SQL injection vulnerability
- 🟠 **P2 High:** User unable to reset password
- 🟠 **P2 High:** Export to CSV function not working
- 🟡 **P3 Medium:** Add dark mode support to dashboard
- 🟡 **P3 Medium:** Scheduled server maintenance
- 🔵 **P4 Low:** Update API documentation

### Comments (4 comments)
Sample comments on various tickets demonstrating:
- Public comments (visible to all)
- Internal comments (team-only)
- Different authors

## Testing Scenarios

### 1. Login Flow
1. Navigate to http://localhost:5173
2. You'll be redirected to the login page
3. Use any of the test credentials above
4. Successfully login to access the dashboard

### 2. Dashboard Features
- **Saved Views:** Test the built-in views (My Tickets, Unassigned, High Priority)
- **Bulk Operations:** Select multiple tickets and change status/priority/assignment
- **Quick View:** Click the 👁️ View button to preview tickets inline
- **Templates:** Press `T` or click Templates button to use ticket templates
- **Keyboard Shortcuts:** Press `?` to see all available shortcuts

### 3. Ticket Management
- **Create Ticket:** Click "+ Create Ticket" button
- **Edit Ticket:** Click on any ticket to view/edit details
- **Filter Tickets:** Use the filter panel to narrow down tickets
- **Search:** Use the search bar to find specific tickets
- **Sort:** Click column headers to sort tickets

### 4. Site Management
- Click "Sites" in the navigation bar
- View all 5 seeded sites
- Create new sites
- Edit existing sites
- Delete sites (ADMIN only)

### 5. User Management (ADMIN only)
- Click "Users" in the navigation bar
- View all 6 seeded users
- Create new users
- Edit user details
- Reset passwords

## Modern UI Features

### Clean, Bright Design
- **Light Mode Default:** Modern, clean white interface
- **Vibrant Colors:** Blue (#0066FF) primary, purple accents
- **Smooth Animations:** Subtle hover effects and transitions
- **Rounded Corners:** Modern 12px border radius
- **Soft Shadows:** Elegant depth without heaviness

### Login Page
- **Gradient Background:** Purple gradient with radial overlay
- **Glassmorphism:** Semi-transparent card with backdrop blur
- **Branded Icon:** Gradient icon box with shadow
- **Modern Typography:** Clean, readable fonts

### Dashboard
- **Bright Background:** #F8F9FA light gray
- **White Cards:** Clean white panels with subtle shadows
- **Color-Coded Priorities:** Visual indicators with icons
- **Smooth Interactions:** Hover effects on buttons and cards

## Resetting Test Data

To reset the database and reseed with fresh test data:

```bash
cd ticketing-suite/ticketing

# Drop and recreate the database (WARNING: This deletes all data!)
npm run prisma:dev

# Or just reseed (keeps existing data structure)
npm run seed:test
```

## Environment Variables

### Backend (.env in ticketing-suite/ticketing)
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
JWT_SECRET="your-secret-key-here"
```

### Frontend (.env in ticketing-suite/ticketing-dashboard)
```env
VITE_API_BASE=http://localhost:3000
```

## Troubleshooting

### Login Issues
**Problem:** Can't login with test credentials
**Solution:** 
1. Ensure backend is running on port 3000
2. Check that seed script ran successfully
3. Verify DATABASE_URL is correct
4. Try running `npm run seed:test` again

### No Tickets Showing
**Problem:** Dashboard is empty
**Solution:**
1. Check browser console for errors
2. Verify backend API is accessible
3. Ensure you're logged in with a valid token
4. Run seed script: `npm run seed:test`

### Theme Not Bright
**Problem:** UI is still dark
**Solution:**
1. Clear browser localStorage
2. Refresh the page
3. Click the theme toggle icon in the navigation bar

### Port Already in Use
**Problem:** Port 3000 or 5173 is already in use
**Solution:**
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
```

## API Testing

You can also test the API directly using the seeded data:

### Get Auth Token
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"password123"}'
```

### List Tickets
```bash
curl http://localhost:3000/tickets \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Ticket
```bash
curl -X POST http://localhost:3000/tickets \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "site-hq",
    "type": "BUG",
    "description": "Test ticket",
    "status": "NEW",
    "priority": "P3"
  }'
```

## Next Steps

1. **Explore the Dashboard:** Login and navigate through all features
2. **Test Workflows:** Create, edit, and manage tickets
3. **Try Bulk Operations:** Select multiple tickets and perform actions
4. **Use Keyboard Shortcuts:** Press `?` to see all shortcuts
5. **Customize Views:** Save your own filter combinations
6. **Test Templates:** Use ticket templates for faster creation

## Support

For issues or questions:
1. Check the main README.md
2. Review the PHASE_1_2_IMPLEMENTATION.md for feature details
3. Check browser console for errors
4. Verify all services are running

---

**Happy Testing! 🚀**
