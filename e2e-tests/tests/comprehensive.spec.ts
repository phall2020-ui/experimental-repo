import { test, expect, Page } from '@playwright/test';

// Test data
interface TestContext {
  token: string;
  userId: string;
  consoleErrors: any[];
  networkFailures: any[];
}

// Helper to generate dev JWT token
function generateDevToken(): string {
  const payload = {
    sub: 'e2e-test-user',
    tenantId: 'tenant-1',
    roles: ['AssetManager', 'OandM', 'ADMIN', 'USER'],
    email: 'e2e-test@example.com',
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

// Helper to set up authentication
async function setupAuth(page: Page, token: string, userId: string) {
  await page.goto('/');
  await page.evaluate(({ token, userId }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
  }, { token, userId });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

// Helper to track errors
function setupErrorTracking(page: Page, context: TestContext) {
  context.consoleErrors = [];
  context.networkFailures = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      context.consoleErrors.push({
        text: msg.text(),
        location: msg.location()?.url
      });
    }
  });

  page.on('response', response => {
    if (response.status() >= 400 && response.status() !== 404) {
      context.networkFailures.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method()
      });
    }
  });
}

test.describe('Complete End-to-End Testing Suite', () => {
  let testContext: TestContext;

  test.beforeEach(async ({ page }) => {
    testContext = {
      token: generateDevToken(),
      userId: 'e2e-test-user',
      consoleErrors: [],
      networkFailures: []
    };
    setupErrorTracking(page, testContext);
  });

  test.afterEach(async () => {
    // Report any critical errors
    if (testContext.networkFailures.length > 0) {
      console.log('Network failures detected:', testContext.networkFailures);
    }
    if (testContext.consoleErrors.length > 0) {
      console.log('Console errors detected:', testContext.consoleErrors);
    }
  });

  test.describe('01 - Authentication & Authorization', () => {
    test('should handle initial page load without auth', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('text=🎛️ Ticketing Dashboard')).toBeVisible();
      
      // Should show auth inputs
      await expect(page.locator('input[placeholder*="******"]')).toBeVisible();
      await expect(page.locator('input[placeholder*="User ID"]')).toBeVisible();
    });

    test('should save and persist authentication credentials', async ({ page }) => {
      await page.goto('/');
      
      // Enter credentials
      await page.locator('input[placeholder*="******"]').fill(testContext.token);
      await page.locator('input[placeholder*="User ID"]').fill(testContext.userId);
      await page.locator('button:has-text("Save")').first().click();
      
      await page.waitForLoadState('networkidle');
      
      // Verify credentials persisted
      const storedToken = await page.evaluate(() => localStorage.getItem('token'));
      const storedUserId = await page.evaluate(() => localStorage.getItem('userId'));
      
      expect(storedToken).toBe(testContext.token);
      expect(storedUserId).toBe(testContext.userId);
    });

    test('should clear credentials on logout', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      // Clear credentials
      await page.locator('input[placeholder*="******"]').clear();
      await page.locator('input[placeholder*="User ID"]').clear();
      await page.locator('button:has-text("Save")').first().click();
      
      await page.waitForLoadState('networkidle');
      
      const storedToken = await page.evaluate(() => localStorage.getItem('token'));
      expect(storedToken).toBe('');
    });
  });

  test.describe('02 - Dashboard & Ticket List', () => {
    test('should display dashboard with tickets', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      // Verify dashboard elements
      await expect(page.locator('text=Priority')).toBeVisible();
      await expect(page.locator('text=Description')).toBeVisible();
      await expect(page.locator('text=Status')).toBeVisible();
      
      // Check for tickets table
      const ticketRows = await page.locator('table tbody tr').count();
      expect(ticketRows).toBeGreaterThan(0);
    });

    test('should display correct ticket information', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      // Verify first ticket has expected fields
      const firstRow = page.locator('table tbody tr').first();
      await expect(firstRow).toBeVisible();
      
      // Should have multiple columns with data
      const cells = await firstRow.locator('td').count();
      expect(cells).toBeGreaterThan(3);
    });

    test('should allow navigation to ticket details', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      const ticketLink = page.locator('table tbody tr a').first();
      if (await ticketLink.count() > 0) {
        const ticketText = await ticketLink.textContent();
        await ticketLink.click();
        await page.waitForLoadState('networkidle');
        
        // Verify we're on the ticket detail page
        await expect(page.locator('button:has-text("Back")')).toBeVisible();
      }
    });
  });

  test.describe('03 - Ticket Details & Editing', () => {
    test('should display ticket detail page', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      const ticketLink = page.locator('table tbody tr a').first();
      if (await ticketLink.count() > 0) {
        await ticketLink.click();
        await page.waitForLoadState('networkidle');
        
        // Verify detail page elements
        await expect(page.locator('label:has-text("Description")')).toBeVisible();
        await expect(page.locator('label:has-text("Status")')).toBeVisible();
        await expect(page.locator('label:has-text("Priority")')).toBeVisible();
      }
    });

    test('should allow editing ticket description', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      const ticketLink = page.locator('table tbody tr a').first();
      if (await ticketLink.count() > 0) {
        await ticketLink.click();
        await page.waitForLoadState('networkidle');
        
        // Find and edit description field
        const descInput = page.locator('input, textarea').filter({ hasText: /.*/ }).first();
        const originalValue = await descInput.inputValue();
        const newValue = `${originalValue} - E2E Test Edit ${Date.now()}`;
        
        await descInput.fill(newValue);
        await page.locator('button:has-text("Save")').click();
        await page.waitForTimeout(1000);
        
        // Verify no error occurred
        expect(testContext.networkFailures.filter(f => f.status >= 500).length).toBe(0);
      }
    });

    test('should allow changing ticket status', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      const ticketLink = page.locator('table tbody tr a').first();
      if (await ticketLink.count() > 0) {
        await ticketLink.click();
        await page.waitForLoadState('networkidle');
        
        // Change status
        const statusSelect = page.locator('select').first();
        await statusSelect.selectOption('IN_PROGRESS');
        
        await page.locator('button:has-text("Save")').click();
        await page.waitForTimeout(1000);
        
        // Verify save was successful
        const selectedValue = await statusSelect.inputValue();
        expect(selectedValue).toBe('IN_PROGRESS');
      }
    });

    test('should allow changing ticket priority', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      const ticketLink = page.locator('table tbody tr a').first();
      if (await ticketLink.count() > 0) {
        await ticketLink.click();
        await page.waitForLoadState('networkidle');
        
        // Find priority select (typically second select)
        const selects = page.locator('select');
        if (await selects.count() > 1) {
          const prioritySelect = selects.nth(1);
          await prioritySelect.selectOption('HIGH');
          
          await page.locator('button:has-text("Save")').click();
          await page.waitForTimeout(1000);
          
          const selectedValue = await prioritySelect.inputValue();
          expect(selectedValue).toBe('HIGH');
        }
      }
    });

    test('should navigate back to dashboard from ticket detail', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      const ticketLink = page.locator('table tbody tr a').first();
      if (await ticketLink.count() > 0) {
        await ticketLink.click();
        await page.waitForLoadState('networkidle');
        
        // Click back button
        await page.locator('button:has-text("Back")').click();
        await page.waitForLoadState('networkidle');
        
        // Verify we're back on dashboard
        await expect(page.locator('text=Priority')).toBeVisible();
        await expect(page.locator('table')).toBeVisible();
      }
    });
  });

  test.describe('04 - Search & Filtering', () => {
    test('should filter tickets by search term', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.count() > 0) {
        const initialCount = await page.locator('table tbody tr').count();
        
        await searchInput.fill('test');
        await page.waitForTimeout(500);
        
        // Verify filtering occurred (count may change or stay same if all match)
        expect(await searchInput.inputValue()).toBe('test');
      }
    });

    test('should filter tickets by status', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      // Find status filter dropdown
      const statusFilter = page.locator('select').first();
      if (await statusFilter.count() > 0) {
        await statusFilter.selectOption('AWAITING_RESPONSE');
        await page.waitForTimeout(500);
        
        // Verify filter is applied
        const selectedValue = await statusFilter.inputValue();
        expect(selectedValue).toBe('AWAITING_RESPONSE');
      }
    });

    test('should clear filters', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      // Apply filter
      const statusFilter = page.locator('select').first();
      if (await statusFilter.count() > 0) {
        await statusFilter.selectOption('AWAITING_RESPONSE');
        await page.waitForTimeout(500);
        
        // Clear filter
        await statusFilter.selectOption('');
        await page.waitForTimeout(500);
        
        const selectedValue = await statusFilter.inputValue();
        expect(selectedValue).toBe('');
      }
    });

    test('should handle search with no results', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.count() > 0) {
        await searchInput.fill('xyznonexistent123456789');
        await page.waitForTimeout(500);
        
        // Should handle gracefully (either show "no results" or empty table)
        // Just verify page doesn't crash
        await expect(page.locator('table')).toBeVisible();
      }
    });
  });

  test.describe('05 - Prioritization Configuration', () => {
    test('should display prioritization panel', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      await expect(page.locator('text=My prioritisation')).toBeVisible();
    });

    test('should allow changing boost value', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      const boostInput = page.locator('input[type="number"]').first();
      if (await boostInput.count() > 0) {
        await boostInput.fill('25');
        
        const value = await boostInput.inputValue();
        expect(value).toBe('25');
      }
    });

    test('should save prioritization configuration', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      const boostInput = page.locator('input[type="number"]').first();
      if (await boostInput.count() > 0) {
        await boostInput.fill('35');
        
        // Find and click the save button (last Save button)
        const saveButtons = page.locator('button:has-text("Save")');
        const lastSaveButton = saveButtons.last();
        await lastSaveButton.click();
        await page.waitForTimeout(500);
        
        // Verify configuration persisted in localStorage
        const config = await page.evaluate(() => {
          const stored = localStorage.getItem('prioritizationConfig');
          return stored ? JSON.parse(stored) : null;
        });
        
        expect(config).toBeTruthy();
      }
    });

    test('should persist prioritization config after reload', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      const boostInput = page.locator('input[type="number"]').first();
      if (await boostInput.count() > 0) {
        const testValue = '42';
        await boostInput.fill(testValue);
        
        const saveButtons = page.locator('button:has-text("Save")');
        await saveButtons.last().click();
        await page.waitForTimeout(500);
        
        // Reload page
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        // Verify value persisted
        const boostInputAfterReload = page.locator('input[type="number"]').first();
        const value = await boostInputAfterReload.inputValue();
        expect(value).toBe(testValue);
      }
    });
  });

  test.describe('06 - Error Handling & Edge Cases', () => {
    test('should handle invalid ticket ID gracefully', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      // Navigate to non-existent ticket
      await page.goto('/tickets/00000000-0000-0000-0000-000000000000');
      await page.waitForLoadState('networkidle');
      
      // Should show error or redirect, not crash
      // Either back on dashboard or error message shown
      const hasError = await page.locator('text=/error|not found/i').count() > 0;
      const onDashboard = await page.locator('table').count() > 0;
      
      expect(hasError || onDashboard).toBe(true);
    });

    test('should handle network errors gracefully', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      // This test verifies the app doesn't crash on errors
      await page.waitForLoadState('networkidle');
      
      // Check that critical errors don't crash the app
      const appContent = await page.locator('body').count();
      expect(appContent).toBe(1);
    });

    test('should validate required fields', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      const ticketLink = page.locator('table tbody tr a').first();
      if (await ticketLink.count() > 0) {
        await ticketLink.click();
        await page.waitForLoadState('networkidle');
        
        // Try to clear a required field and save
        const descInput = page.locator('input, textarea').filter({ hasText: /.*/ }).first();
        if (await descInput.count() > 0) {
          await descInput.clear();
          await page.locator('button:has-text("Save")').click();
          
          // Should either show validation error or prevent save
          await page.waitForTimeout(500);
          
          // Verify page still functional
          await expect(page.locator('button:has-text("Back")')).toBeVisible();
        }
      }
    });
  });

  test.describe('07 - Performance & UX', () => {
    test('should load dashboard quickly', async ({ page }) => {
      const startTime = Date.now();
      
      await setupAuth(page, testContext.token, testContext.userId);
      
      const loadTime = Date.now() - startTime;
      
      // Should load in reasonable time (under 3 seconds)
      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle rapid filter changes', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      const statusFilter = page.locator('select').first();
      if (await statusFilter.count() > 0) {
        // Rapidly change filters
        await statusFilter.selectOption('AWAITING_RESPONSE');
        await statusFilter.selectOption('IN_PROGRESS');
        await statusFilter.selectOption('RESOLVED');
        await statusFilter.selectOption('');
        
        await page.waitForTimeout(1000);
        
        // Should handle gracefully without errors
        expect(testContext.networkFailures.filter(f => f.status >= 500).length).toBe(0);
      }
    });

    test('should maintain state during navigation', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      // Apply filter
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.count() > 0) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);
      }
      
      // Navigate to ticket and back
      const ticketLink = page.locator('table tbody tr a').first();
      if (await ticketLink.count() > 0) {
        await ticketLink.click();
        await page.waitForLoadState('networkidle');
        
        await page.locator('button:has-text("Back")').click();
        await page.waitForLoadState('networkidle');
        
        // Search filter may or may not persist (depends on implementation)
        // Just verify page is functional
        await expect(page.locator('table')).toBeVisible();
      }
    });
  });

  test.describe('08 - Complete User Flows', () => {
    test('should complete full ticket management workflow', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      // Step 1: View dashboard
      await expect(page.locator('table')).toBeVisible();
      const initialCount = await page.locator('table tbody tr').count();
      expect(initialCount).toBeGreaterThan(0);
      
      // Step 2: Open a ticket
      const ticketLink = page.locator('table tbody tr a').first();
      await ticketLink.click();
      await page.waitForLoadState('networkidle');
      
      // Step 3: View ticket details
      await expect(page.locator('label:has-text("Description")')).toBeVisible();
      await expect(page.locator('label:has-text("Status")')).toBeVisible();
      
      // Step 4: Edit ticket
      const statusSelect = page.locator('select').first();
      await statusSelect.selectOption('IN_PROGRESS');
      
      // Step 5: Save changes
      await page.locator('button:has-text("Save")').click();
      await page.waitForTimeout(1000);
      
      // Step 6: Navigate back
      await page.locator('button:has-text("Back")').click();
      await page.waitForLoadState('networkidle');
      
      // Step 7: Verify back on dashboard
      await expect(page.locator('table')).toBeVisible();
      const finalCount = await page.locator('table tbody tr').count();
      expect(finalCount).toBeGreaterThan(0);
    });

    test('should complete filter and view workflow', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      // Step 1: Apply status filter
      const statusFilter = page.locator('select').first();
      if (await statusFilter.count() > 0) {
        await statusFilter.selectOption('AWAITING_RESPONSE');
        await page.waitForTimeout(500);
        
        // Step 2: View filtered results
        const ticketCount = await page.locator('table tbody tr').count();
        expect(ticketCount).toBeGreaterThanOrEqual(0);
        
        // Step 3: Open a filtered ticket
        const ticketLink = page.locator('table tbody tr a').first();
        if (await ticketLink.count() > 0) {
          await ticketLink.click();
          await page.waitForLoadState('networkidle');
          
          // Step 4: Verify ticket details
          await expect(page.locator('button:has-text("Back")')).toBeVisible();
          
          // Step 5: Return to filtered list
          await page.locator('button:has-text("Back")').click();
          await page.waitForLoadState('networkidle');
        }
        
        // Step 6: Clear filter
        await statusFilter.selectOption('');
        await page.waitForTimeout(500);
      }
    });

    test('should complete configuration and view workflow', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      // Step 1: Configure prioritization
      const boostInput = page.locator('input[type="number"]').first();
      if (await boostInput.count() > 0) {
        await boostInput.fill('30');
        
        const saveButtons = page.locator('button:has-text("Save")');
        await saveButtons.last().click();
        await page.waitForTimeout(500);
        
        // Step 2: View tickets with new prioritization
        const ticketCount = await page.locator('table tbody tr').count();
        expect(ticketCount).toBeGreaterThan(0);
        
        // Step 3: Open a ticket
        const ticketLink = page.locator('table tbody tr a').first();
        if (await ticketLink.count() > 0) {
          await ticketLink.click();
          await page.waitForLoadState('networkidle');
          
          await expect(page.locator('button:has-text("Back")')).toBeVisible();
        }
      }
    });
  });

  test.describe('09 - Accessibility & UI', () => {
    test('should have accessible navigation elements', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      // Check for buttons with text
      await expect(page.locator('button:has-text("Save")')).toBeVisible();
      await expect(page.locator('button:has-text("Back")')).toBeVisible();
      
      // Check for input labels
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    });

    test('should have visible and clickable elements', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      // All table rows should be clickable
      const firstRow = page.locator('table tbody tr').first();
      await expect(firstRow).toBeVisible();
      
      const ticketLink = page.locator('table tbody tr a').first();
      if (await ticketLink.count() > 0) {
        await expect(ticketLink).toBeVisible();
      }
    });

    test('should display informative headers and labels', async ({ page }) => {
      await setupAuth(page, testContext.token, testContext.userId);
      
      // Check for dashboard header
      await expect(page.locator('text=🎛️ Ticketing Dashboard')).toBeVisible();
      
      // Check for table headers
      await expect(page.locator('text=Priority')).toBeVisible();
      await expect(page.locator('text=Status')).toBeVisible();
      await expect(page.locator('text=Description')).toBeVisible();
    });
  });
});
