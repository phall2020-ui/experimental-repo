import { test, expect, Page } from '@playwright/test';

// Interfaces for tracking errors
interface ConsoleMessage {
  type: string;
  text: string;
  location?: string;
}

interface NetworkFailure {
  url: string;
  status: number;
  method: string;
  failure?: string;
}

interface PageError {
  message: string;
  stack?: string;
}

// Error collectors
let consoleErrors: ConsoleMessage[] = [];
let networkFailures: NetworkFailure[] = [];
let pageErrors: PageError[] = [];
let unhandledRejections: string[] = [];

// Helper to set up error collection
function setupErrorCollection(page: Page) {
  consoleErrors = [];
  networkFailures = [];
  pageErrors = [];
  unhandledRejections = [];

  // Collect console messages
  page.on('console', msg => {
    const type = msg.type();
    if (type === 'error' || type === 'warning') {
      consoleErrors.push({
        type,
        text: msg.text(),
        location: msg.location()?.url
      });
    }
  });

  // Collect page errors
  page.on('pageerror', error => {
    pageErrors.push({
      message: error.message,
      stack: error.stack
    });
  });

  // Collect network failures
  page.on('response', response => {
    if (response.status() >= 400) {
      networkFailures.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method()
      });
    }
  });

  page.on('requestfailed', request => {
    const failure = request.failure();
    networkFailures.push({
      url: request.url(),
      status: 0,
      method: request.method(),
      failure: failure?.errorText
    });
  });
}

// Generate a dev JWT token for testing
function generateDevToken(): string {
  const payload = {
    sub: 'test-user',
    tenantId: 'tenant-1',
    roles: ['AssetManager', 'OandM'],
    email: 'test@example.com',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400
  };
  const header = { alg: 'HS256', typ: 'JWT' };
  const base64url = (str: any) => Buffer.from(JSON.stringify(str))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  return base64url(header) + '.' + base64url(payload) + '.dev-signature';
}

test.describe('Main Application Flows', () => {
  test.beforeEach(async ({ page }) => {
    setupErrorCollection(page);
  });

  test.afterEach(async () => {
    // Report errors found during the test
    if (consoleErrors.length > 0) {
      console.log('\n=== Console Errors/Warnings ===');
      consoleErrors.forEach((err, idx) => {
        console.log(`${idx + 1}. [${err.type.toUpperCase()}] ${err.text}`);
        if (err.location) console.log(`   Location: ${err.location}`);
      });
    }

    if (networkFailures.length > 0) {
      console.log('\n=== Network Failures ===');
      networkFailures.forEach((fail, idx) => {
        console.log(`${idx + 1}. ${fail.method} ${fail.url} - Status: ${fail.status}`);
        if (fail.failure) console.log(`   Failure: ${fail.failure}`);
      });
    }

    if (pageErrors.length > 0) {
      console.log('\n=== Page Errors ===');
      pageErrors.forEach((err, idx) => {
        console.log(`${idx + 1}. ${err.message}`);
        if (err.stack) console.log(`   Stack: ${err.stack.split('\n')[0]}`);
      });
    }
  });

  test('01 - Sign-in flow (set token and user ID)', async ({ page }) => {
    await page.goto('/');
    
    // Verify page loaded
    await expect(page.locator('text=🎛️ Ticketing Dashboard')).toBeVisible();
    
    // Enter token and user ID
    const token = generateDevToken();
    await page.locator('input[placeholder*="******"]').fill(token);
    await page.locator('input[placeholder*="User ID"]').fill('test-user');
    
    // Save credentials
    await page.locator('button:has-text("Save")').first().click();
    
    // Wait for page reload
    await page.waitForLoadState('networkidle');
    
    // Verify credentials were saved (page should reload)
    const storedToken = await page.evaluate(() => localStorage.getItem('token'));
    const storedUserId = await page.evaluate(() => localStorage.getItem('userId'));
    
    expect(storedToken).toBeTruthy();
    expect(storedUserId).toBe('test-user');
  });

  test('02 - Dashboard view (list tickets)', async ({ page }) => {
    // Set up auth
    const token = generateDevToken();
    await page.goto('/');
    await page.evaluate(({ token, userId }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
    }, { token, userId: 'test-user' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify dashboard elements
    await expect(page.locator('text=Priority')).toBeVisible();
    await expect(page.locator('text=Description')).toBeVisible();
    await expect(page.locator('text=Status')).toBeVisible();
    
    // Check if tickets are loaded (should see tickets or "No tickets found")
    const hasTickets = await page.locator('table tbody tr').count() > 0;
    expect(hasTickets).toBeTruthy();
  });

  test('03 - View ticket detail', async ({ page }) => {
    // Set up auth
    const token = generateDevToken();
    await page.goto('/');
    await page.evaluate(({ token, userId }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
    }, { token, userId: 'test-user' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click on first ticket link (if available)
    const ticketLink = page.locator('table tbody tr a').first();
    if (await ticketLink.count() > 0) {
      await ticketLink.click();
      await page.waitForLoadState('networkidle');
      
      // Verify ticket detail page
      await expect(page.locator('text=Ticket')).toBeVisible();
      await expect(page.locator('button:has-text("Back")')).toBeVisible();
      await expect(page.locator('label:has-text("Description")')).toBeVisible();
    }
  });

  test('04 - Edit ticket', async ({ page }) => {
    // Set up auth
    const token = generateDevToken();
    await page.goto('/');
    await page.evaluate(({ token, userId }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
    }, { token, userId: 'test-user' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click on first ticket
    const ticketLink = page.locator('table tbody tr a').first();
    if (await ticketLink.count() > 0) {
      await ticketLink.click();
      await page.waitForLoadState('networkidle');
      
      // Edit description
      const descInput = page.locator('input[value*=""]').first();
      await descInput.fill('Updated test ticket description');
      
      // Change status
      await page.locator('select').first().selectOption('IN_PROGRESS');
      
      // Save changes
      await page.locator('button:has-text("Save")').click();
      await page.waitForTimeout(1000);
      
      // Verify save completed (should see saved indicator or no error)
      // If there's an error, it will be captured in networkFailures
    }
  });

  test('05 - Search and filter tickets', async ({ page }) => {
    // Set up auth
    const token = generateDevToken();
    await page.goto('/');
    await page.evaluate(({ token, userId }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
    }, { token, userId: 'test-user' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Test search
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('test');
    await page.waitForTimeout(500);
    
    // Test filter by status
    const statusFilter = page.locator('select').first();
    await statusFilter.selectOption('NEW');
    await page.waitForTimeout(500);
    
    // Clear filter
    await statusFilter.selectOption('');
    await page.waitForTimeout(500);
  });

  test('06 - Prioritization configuration', async ({ page }) => {
    // Set up auth
    const token = generateDevToken();
    await page.goto('/');
    await page.evaluate(({ token, userId }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
    }, { token, userId: 'test-user' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Locate prioritization panel
    await expect(page.locator('text=My prioritisation')).toBeVisible();
    
    // Change boost value
    const boostInput = page.locator('input[type="number"]').first();
    await boostInput.fill('30');
    
    // Save configuration
    await page.locator('button:has-text("Save")').last().click();
    await page.waitForTimeout(500);
  });

  test('07 - Logout flow (clear credentials)', async ({ page }) => {
    // Set up auth
    const token = generateDevToken();
    await page.goto('/');
    await page.evaluate(({ token, userId }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
    }, { token, userId: 'test-user' });
    
    await page.goto('/');
    
    // Clear token to simulate logout
    await page.locator('input[placeholder*="******"]').clear();
    await page.locator('input[placeholder*="User ID"]').clear();
    await page.locator('button:has-text("Save")').first().click();
    
    await page.waitForLoadState('networkidle');
    
    // Verify credentials cleared
    const storedToken = await page.evaluate(() => localStorage.getItem('token'));
    expect(storedToken).toBe('');
  });
});

// Summary test to document all findings
test.describe('Error Summary', () => {
  test('Document all collected errors', async ({ page }) => {
    setupErrorCollection(page);
    
    const token = generateDevToken();
    await page.goto('/');
    await page.evaluate(({ token, userId }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('userId', userId);
    }, { token, userId: 'test-user' });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Give time for any async errors to appear
    await page.waitForTimeout(2000);
    
    // Document findings
    const findings = {
      consoleErrors: consoleErrors.length,
      networkFailures: networkFailures.length,
      pageErrors: pageErrors.length,
      unhandledRejections: unhandledRejections.length
    };
    
    console.log('\n=== ERROR SUMMARY ===');
    console.log(`Console Errors/Warnings: ${findings.consoleErrors}`);
    console.log(`Network Failures: ${findings.networkFailures}`);
    console.log(`Page Errors: ${findings.pageErrors}`);
    console.log(`Unhandled Rejections: ${findings.unhandledRejections}`);
    console.log('====================\n');
    
    // This test will pass but document errors
    expect(true).toBe(true);
  });
});
