import { test, expect } from '@playwright/test';

test.describe('DJ.ai TTS and Auto-DJ Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test mode
    await page.goto('/?test=true');
    await page.waitForTimeout(1500);
  });

  test('should display mode badges when TTS and Auto-DJ are enabled via localStorage', async ({ page }) => {
    // Set settings directly in localStorage (bypass UI)
    await page.evaluate(() => {
      const settings = {
        currentProvider: 'youtube',
        providers: {
          youtube: { isConnected: true },
          spotify: { isConnected: false },
          apple: { isConnected: false }
        },
        aiProvider: 'openai',
        openaiApiKey: '',
        anthropicApiKey: '',
        elevenLabsApiKey: '',
        ttsEnabled: true,
        ttsProvider: 'openai',
        ttsVoice: 'onyx',
        autoDJMode: true
      };
      localStorage.setItem('djAiSettings', JSON.stringify(settings));
    });

    // Reload to apply settings
    await page.reload();
    await page.waitForTimeout(1500);

    // Check for TTS badge
    const ttsBadge = page.locator('.mode-badge').filter({ hasText: /TTS|🔊/ }).first();
    await expect(ttsBadge).toBeVisible({ timeout: 10000 });

    // Check for Auto-DJ badge
    const autoDJBadge = page.locator('.mode-badge').filter({ hasText: /Auto.?DJ|🎧/ }).first();
    await expect(autoDJBadge).toBeVisible({ timeout: 10000 });
  });

  test('should persist TTS and Auto-DJ settings in localStorage', async ({ page }) => {
    // Set settings via localStorage
    await page.evaluate(() => {
      const settings = {
        currentProvider: 'youtube',
        providers: {
          youtube: { isConnected: true },
          spotify: { isConnected: false },
          apple: { isConnected: false }
        },
        aiProvider: 'openai',
        openaiApiKey: '',
        anthropicApiKey: '',
        elevenLabsApiKey: '',
        ttsEnabled: true,
        ttsProvider: 'openai',
        ttsVoice: 'onyx',
        autoDJMode: true
      };
      localStorage.setItem('djAiSettings', JSON.stringify(settings));
    });

    // Reload page
    await page.reload();
    await page.waitForTimeout(1500);

    // Verify settings persisted
    const localStorageData = await page.evaluate(() => {
      return localStorage.getItem('djAiSettings');
    });
    
    expect(localStorageData).toBeTruthy();
    const settings = JSON.parse(localStorageData || '{}');
    expect(settings.ttsEnabled).toBe(true);
    expect(settings.autoDJMode).toBe(true);

    // Verify badges still show
    const ttsBadge = page.locator('.mode-badge').filter({ hasText: /TTS|🔊/ }).first();
    await expect(ttsBadge).toBeVisible();
  });

  test('should show mode badges reflect current settings state', async ({ page }) => {
    // Start with TTS disabled
    await page.evaluate(() => {
      const settings = JSON.parse(localStorage.getItem('djAiSettings') || '{}');
      settings.ttsEnabled = false;
      settings.autoDJMode = false;
      localStorage.setItem('djAiSettings', JSON.stringify(settings));
    });

    await page.reload();
    await page.waitForTimeout(1500);

    // Badges should NOT be visible
    const ttsBadge = page.locator('.mode-badge').filter({ hasText: /TTS|🔊/ });
    const autoDJBadge = page.locator('.mode-badge').filter({ hasText: /Auto.?DJ|🎧/ });
    
    await expect(ttsBadge).not.toBeVisible();
    await expect(autoDJBadge).not.toBeVisible();
  });
});
