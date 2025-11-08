# Comprehensive End-to-End Testing Guide

## Overview

This repository now includes comprehensive end-to-end testing for both the backend API and frontend dashboard, covering all major functions and user workflows.

## Test Structure

### Backend E2E Tests
**Location**: `ticketing-suite/ticketing/test/app.e2e-spec.ts`

The backend E2E test suite uses Jest and Supertest to test all API endpoints with real HTTP requests.

#### Test Coverage

**Health Checks** (1 test)
- ✅ GET /health - System health status

**Directory Module** (4 tests)
- ✅ GET /directory/sites - List tenant sites
- ✅ GET /directory/users - List tenant users  
- ✅ GET /directory/issue-types - List issue types
- ✅ Authentication required validation

**Tickets Module** (11 tests)
- ✅ POST /tickets - Create new ticket
- ✅ GET /tickets - List all tickets
- ✅ GET /tickets?status=NEW - Filter by status
- ✅ GET /tickets?priority=MEDIUM - Filter by priority
- ✅ GET /tickets?search=test - Search functionality
- ✅ GET /tickets/:id - Get specific ticket
- ✅ PATCH /tickets/:id - Update ticket
- ✅ GET /tickets/:id/history - Ticket history
- ✅ Authentication validation
- ✅ Required field validation

**Comments Module** (4 tests)
- ✅ POST /tickets/:ticketId/comments - Add comment
- ✅ GET /tickets/:ticketId/comments - List comments
- ✅ Authentication validation
- ✅ Body field validation

**Attachments Module** (4 tests)
- ✅ POST /tickets/:ticketId/attachments/presign - Get presigned URL
- ✅ POST /tickets/:ticketId/attachments/:id/finalize - Finalize upload
- ✅ Authentication validation
- ✅ Required field validation

**Multi-tenancy Isolation** (3 tests)
- ✅ Tenant isolation for tickets
- ✅ Tenant isolation for sites
- ✅ Tenant isolation for directory access

**Error Handling** (3 tests)
- ✅ 404 for non-existent tickets
- ✅ 404 for update on non-existent tickets
- ✅ 404 for comments on non-existent tickets

**Integration Flow** (1 test)
- ✅ Complete ticket lifecycle:
  - Create ticket
  - Add comment
  - Update status to IN_PROGRESS
  - Assign user
  - Add another comment
  - Create attachment presigned URL
  - Finalize attachment
  - Get comments list
  - Get ticket history
  - Update status to RESOLVED
  - Verify final state

**Total Backend Tests**: 31 comprehensive test cases

### Frontend E2E Tests
**Location**: `e2e-tests/tests/comprehensive.spec.ts`

The frontend E2E test suite uses Playwright to test the UI with real browser automation.

#### Test Coverage

**Authentication & Authorization** (3 tests)
- ✅ Initial page load without auth
- ✅ Save and persist authentication credentials
- ✅ Clear credentials on logout

**Dashboard & Ticket List** (3 tests)
- ✅ Display dashboard with tickets
- ✅ Display correct ticket information
- ✅ Navigation to ticket details

**Ticket Details & Editing** (5 tests)
- ✅ Display ticket detail page
- ✅ Edit ticket description
- ✅ Change ticket status
- ✅ Change ticket priority
- ✅ Navigate back to dashboard

**Search & Filtering** (4 tests)
- ✅ Filter tickets by search term
- ✅ Filter tickets by status
- ✅ Clear filters
- ✅ Handle search with no results

**Prioritization Configuration** (4 tests)
- ✅ Display prioritization panel
- ✅ Change boost value
- ✅ Save prioritization configuration
- ✅ Persist configuration after reload

**Error Handling & Edge Cases** (3 tests)
- ✅ Handle invalid ticket ID gracefully
- ✅ Handle network errors gracefully
- ✅ Validate required fields

**Performance & UX** (3 tests)
- ✅ Load dashboard quickly (< 3s)
- ✅ Handle rapid filter changes
- ✅ Maintain state during navigation

**Complete User Flows** (3 tests)
- ✅ Full ticket management workflow
- ✅ Filter and view workflow
- ✅ Configuration and view workflow

**Accessibility & UI** (3 tests)
- ✅ Accessible navigation elements
- ✅ Visible and clickable elements
- ✅ Informative headers and labels

**Total Frontend Tests**: 31 comprehensive test cases

### Legacy Frontend Tests
**Location**: `e2e-tests/tests/main-flows.spec.ts`

Original Playwright tests covering basic flows (7 tests).

## Running the Tests

### Prerequisites

1. **For Backend Tests**:
   - PostgreSQL database running
   - Redis running
   - OpenSearch running (optional, tests can run without it)
   - Environment variables configured

2. **For Frontend Tests**:
   - Backend API running on http://localhost:3000
   - Frontend dashboard running on http://localhost:5173

### Backend E2E Tests

```bash
# Navigate to backend directory
cd ticketing-suite/ticketing

# Install dependencies (if not already installed)
npm install

# Set up environment variables
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ticketing?schema=public"
export REDIS_URL="redis://localhost:6379"
export S3_BUCKET="ticketing-attachments"
export AWS_REGION="eu-west-2"
export OPENSEARCH_NODE="http://localhost:9200"
export NODE_ENV="development"

# Run database migrations
npm run prisma:generate
npm run prisma:deploy

# Run E2E tests
npm run test:e2e
```

#### Using Docker Compose (Recommended)

```bash
# Start all services
cd ticketing-suite
docker-compose up -d

# Wait for services to be healthy
docker-compose ps

# Run tests
cd ticketing
npm run test:e2e
```

### Frontend E2E Tests

```bash
# Navigate to e2e-tests directory
cd e2e-tests

# Install dependencies (if not already installed)
npm install

# Make sure backend and frontend are running
# Backend: http://localhost:3000
# Frontend: http://localhost:5173

# Run comprehensive tests
npm test

# Run tests in headed mode (see browser)
npm run test:headed

# Run specific test file
npx playwright test tests/comprehensive.spec.ts

# Run legacy tests
npx playwright test tests/main-flows.spec.ts
```

## Test Features

### Backend Tests

1. **Authentication Testing**
   - Dev mode JWT token generation
   - Token validation
   - Role-based access control

2. **Multi-tenancy Testing**
   - Creates separate test tenants
   - Validates data isolation
   - Tests cross-tenant access prevention

3. **Integration Testing**
   - Tests complete workflows
   - Validates data persistence
   - Tests relationships between entities

4. **Error Handling**
   - Tests 404 responses
   - Tests validation errors
   - Tests authentication failures

### Frontend Tests

1. **User Flow Testing**
   - Complete workflows from start to finish
   - Navigation between pages
   - State management

2. **Error Tracking**
   - Monitors console errors
   - Tracks network failures
   - Reports issues after each test

3. **Performance Testing**
   - Measures page load times
   - Tests rapid user interactions
   - Validates responsiveness

4. **Accessibility Testing**
   - Validates visible elements
   - Tests keyboard navigation
   - Checks for informative labels

## Test Configuration

### Jest Configuration
**File**: `ticketing-suite/ticketing/jest.e2e.config.js`

```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.e2e-spec.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  testEnvironment: 'node',
  testTimeout: 30000,
  maxWorkers: 1,
};
```

### Playwright Configuration
**File**: `e2e-tests/playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd ticketing-suite/ticketing && npm install
      - run: cd ticketing-suite/ticketing && npm run prisma:deploy
      - run: cd ticketing-suite/ticketing && npm run test:e2e

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install Playwright
        run: cd e2e-tests && npm install && npx playwright install chromium
      - name: Start services
        run: docker-compose up -d
      - name: Wait for services
        run: sleep 30
      - name: Run tests
        run: cd e2e-tests && npm test
```

## Test Results

After running the tests, you'll get detailed results including:

### Backend Test Output
- Number of tests passed/failed
- Execution time
- Coverage information (if enabled)
- Detailed error messages for failures

### Frontend Test Output
- HTML report in `e2e-tests/playwright-report/`
- Screenshots for failed tests
- Test traces for debugging
- Console and network error logs

## Best Practices

1. **Run tests locally before pushing**
   - Ensures tests pass in your environment
   - Catches issues early

2. **Keep test data isolated**
   - Use unique IDs for test data
   - Clean up after tests

3. **Test realistic scenarios**
   - Use production-like data
   - Test complete workflows

4. **Monitor test performance**
   - Keep tests fast (< 30s per test)
   - Parallelize when possible

5. **Update tests with new features**
   - Add tests for new functionality
   - Update tests when APIs change

## Troubleshooting

### Backend Tests Failing

1. **Database connection errors**
   - Verify DATABASE_URL is correct
   - Check if PostgreSQL is running
   - Run migrations: `npm run prisma:deploy`

2. **Redis connection errors**
   - Verify REDIS_URL is correct
   - Check if Redis is running

3. **Timeout errors**
   - Increase timeout in jest config
   - Check for slow database queries

### Frontend Tests Failing

1. **Services not running**
   - Start backend: `cd ticketing-suite/ticketing && npm run dev`
   - Start frontend: `cd ticketing-suite/ticketing-dashboard && npm run dev`

2. **Authentication errors**
   - Check if backend is in dev mode (no OIDC_ISSUER)
   - Verify token generation logic

3. **Element not found**
   - Check if UI has changed
   - Update selectors in tests
   - Increase wait times if needed

## Future Enhancements

1. **Visual regression testing**
   - Add screenshot comparison
   - Detect UI changes automatically

2. **Performance monitoring**
   - Track API response times
   - Monitor page load times
   - Set performance budgets

3. **Load testing**
   - Test with many concurrent users
   - Stress test API endpoints

4. **Integration with monitoring**
   - Send test results to monitoring tools
   - Alert on test failures

5. **Contract testing**
   - Test API contracts
   - Ensure frontend-backend compatibility

## Conclusion

This comprehensive test suite ensures that all major functions of the ticketing system work correctly from end to end. With 62 total test cases covering both backend and frontend, we have confidence that:

- All API endpoints work correctly
- Multi-tenancy isolation is maintained
- User workflows function as expected
- Error handling is robust
- Performance meets expectations

Run these tests regularly to catch regressions early and maintain high quality.
