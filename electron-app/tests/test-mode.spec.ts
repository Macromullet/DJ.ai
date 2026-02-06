import { test, expect } from '@playwright/test';

test.describe('DJ.ai Test Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test mode
    await page.goto('/?test=true');
  });

  test('should load the application', async ({ page }) => {
    await expect(page).toHaveTitle('DJ.ai');
    await expect(page.locator('h1')).toContainText('DJ.ai');
  });

  test('should show test mode indicator', async ({ page }) => {
    // Check for the orange test mode banner
    const testModeIndicator = page.locator('div').filter({ hasText: '🧪 TEST MODE' }).first();
    await expect(testModeIndicator).toBeVisible({ timeout: 10000 });
  });

  test('should show test mode in provider badge', async ({ page }) => {
    // Check provider badge shows test mode
    const providerBadge = page.locator('.provider-badge');
    await expect(providerBadge).toContainText('🧪 Test Mode');
    await expect(providerBadge).toContainText('✅');
  });

  test('should display search suggestions in test mode banner', async ({ page }) => {
    // Verify test mode banner shows search suggestions
    const banner = page.locator('div').filter({ hasText: 'Try searching for:' }).first();
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Test Track 1');
    await expect(banner).toContainText('Test Artist 1');
  });

  test('should search for test tracks', async ({ page }) => {
    // Enter search query
    const searchInput = page.locator('input[type="text"]').first();
    await searchInput.fill('test');
    
    // Click search button or press Enter
    await searchInput.press('Enter');
    
    // Wait for search results
    await page.waitForTimeout(1000);
    
    // Should see "Found X results" message in DJ commentary
    const commentary = page.locator('.dj-commentary');
    await expect(commentary).toContainText(/Found \d+ results/);
  });

  test('should have playback controls', async ({ page }) => {
    // Check for play/pause button
    const playPauseBtn = page.locator('button').filter({ hasText: /Play|Pause|▶|⏸/ }).first();
    await expect(playPauseBtn).toBeVisible();
    
    // Check for next button
    const nextBtn = page.locator('button').filter({ hasText: /Next|⏭/ }).first();
    await expect(nextBtn).toBeVisible();
    
    // Check for previous button  
    const prevBtn = page.locator('button').filter({ hasText: /Previous|⏮/ }).first();
    await expect(prevBtn).toBeVisible();
  });

  test('should collapse/expand test mode banner', async ({ page }) => {
    // Find the expand/collapse button (− or +)
    const toggleBtn = page.locator('button').filter({ hasText: /−|\+/ }).first();
    await expect(toggleBtn).toBeVisible();
    
    // Click to collapse
    await toggleBtn.click();
    await page.waitForTimeout(300);
    
    // Click to expand
    await toggleBtn.click();
    await page.waitForTimeout(300);
    
    // Banner should still be visible
    const banner = page.locator('div').filter({ hasText: '🧪 TEST MODE' }).first();
    await expect(banner).toBeVisible();
  });
});
