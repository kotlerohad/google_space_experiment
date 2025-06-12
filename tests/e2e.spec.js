const { test, expect } = require('@playwright/test');

test.describe('AI Productivity Assistant E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app before each test
    await page.goto('http://localhost:3000');
    // Wait for the main content to be loaded
    await page.waitForSelector('.app-main', { timeout: 15000 });
  });

  test('should display the main layout and components', async ({ page }) => {
    // Check for the header
    await expect(page.locator('header.app-header h1')).toHaveText('AI Productivity Assistant');

    // Check for the two main panes
    await expect(page.locator('.email-pane')).toBeVisible();
    await expect(page.locator('.triage-pane')).toBeVisible();
    
    // Check for the footer components
    await expect(page.locator('.llm-monitoring')).toBeVisible();
    await expect(page.locator('h3:has-text("Core Prompts")')).toBeVisible();
  });

  test('should fetch and display emails', async ({ page }) => {
    // Click the "Fetch Emails" button
    await page.click('button:has-text("Fetch Emails")');

    // Wait for the email list to appear and check for at least one email
    await page.waitForSelector('tr.hover\\:bg-gray-50');
    const emailItems = await page.locator('tr.hover\\:bg-gray-50').count();
    expect(emailItems).toBeGreaterThan(0);

    // Check for the "Triage All" button
    await expect(page.locator('button:has-text("Triage All")')).toBeVisible();
  });

  test('should perform triage on a single email', async ({ page }) => {
    // First, fetch emails
    await page.click('button:has-text("Fetch Emails")');
    await page.waitForSelector('tr.hover\\:bg-gray-50');

    // Click the first "Triage" button
    await page.locator('button:has-text("Triage")').first().click();

    // Wait for the triage result to appear
    await page.waitForSelector('td[colspan="6"]');
    await expect(page.locator('td[colspan="6"]')).toBeVisible();
    
    // Check for summary and category
    await expect(page.locator('.font-mono.bg-purple-100')).not.toBeEmpty();
    await expect(page.locator('span.text-sm.text-gray-700')).not.toBeEmpty();
  });

  test('should interact with Monday.com integration', async ({ page }) => {
    // Wait for the Monday.com boards to load
    await page.waitForSelector('button.p-3.rounded-lg.border');
    
    // Check that at least one board is listed
    const boardItems = await page.locator('button.p-3.rounded-lg.border').count();
    expect(boardItems).toBeGreaterThan(0);

    // Click on the first board
    await page.locator('button.p-3.rounded-lg.border').first().click();
    
    // Check if board items are loaded
    await page.waitForSelector('.space-y-2.max-h-60');
    await expect(page.locator('.space-y-2.max-h-60')).toBeVisible();
  });

  test('should open and close the prompt editor', async ({ page }) => {
    // The prompt editor content is hidden by default
    await expect(page.locator('.p-4 > .space-y-6')).not.toBeVisible();
    
    // Click to expand the prompt editor, targeting the one in the footer
    await page.locator('.app-footer button:has-text("Expand")').click();
    
    // Wait for the content to be visible before proceeding
    await expect(page.locator('.p-4 > .space-y-6')).toBeVisible();

    // Click both "Edit" buttons to reveal the textareas
    await page.locator('button[title="Edit"]').first().click();
    await page.locator('button[title="Edit"]').last().click();
    
    // Check for the two text areas
    await expect(page.locator('textarea').nth(0)).toBeVisible();
    await expect(page.locator('textarea').nth(1)).toBeVisible();

    // Click to collapse it again
    await page.locator('.app-footer button:has-text("Collapse")').click();
    await expect(page.locator('.p-4 > .space-y-6')).not.toBeVisible();
  });
}); 