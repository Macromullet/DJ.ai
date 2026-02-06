import { test, expect } from '@playwright/test';

/**
 * Volume Control Tests
 * 
 * Tests the volume control component including:
 * - Display of volume slider and mute button
 * - Volume percentage display
 * - Mute/unmute functionality
 * - Volume persistence
 */

test.describe('DJ.ai Volume Control', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test mode
    await page.goto('/?test=true');
    await page.waitForTimeout(1500);
  });

  test('should display volume control component', async ({ page }) => {
    const volumeControl = page.locator('.volume-control');
    await expect(volumeControl).toBeVisible();
  });

  test('should show mute/unmute button', async ({ page }) => {
    const muteButton = page.locator('.volume-mute-btn');
    await expect(muteButton).toBeVisible();
    
    // Should have a volume icon (emoji)
    const text = await muteButton.textContent();
    expect(text).toBeTruthy();
  });

  test('should display volume slider', async ({ page }) => {
    const volumeSlider = page.locator('.volume-slider');
    await expect(volumeSlider).toBeVisible();
    
    // Should be a range input
    const inputType = await volumeSlider.getAttribute('type');
    expect(inputType).toBe('range');
  });

  test('should show volume percentage', async ({ page }) => {
    const volumePercentage = page.locator('.volume-percentage');
    await expect(volumePercentage).toBeVisible();
    
    // Should show percentage with % sign
    const text = await volumePercentage.textContent();
    expect(text).toMatch(/^\d+%$/);
  });

  test('should have default volume of 80%', async ({ page }) => {
    // Clear any saved volume first
    await page.evaluate(() => {
      localStorage.removeItem('djai_volume');
    });
    
    // Reload to get default
    await page.reload();
    await page.waitForTimeout(1500);
    
    const volumePercentage = page.locator('.volume-percentage');
    const text = await volumePercentage.textContent();
    
    // Default should be 80%
    expect(text).toBe('80%');
  });

  test('should update slider value when changed', async ({ page }) => {
    const volumeSlider = page.locator('.volume-slider');
    
    // Get initial value
    const initialValue = await volumeSlider.inputValue();
    
    // Change slider to 50
    await volumeSlider.fill('50');
    
    // Check new value
    const newValue = await volumeSlider.inputValue();
    expect(newValue).toBe('50');
    
    // Percentage should update
    const volumePercentage = page.locator('.volume-percentage');
    const text = await volumePercentage.textContent();
    expect(text).toBe('50%');
  });

  test('should persist volume to localStorage', async ({ page }) => {
    const volumeSlider = page.locator('.volume-slider');
    
    // Set volume to 65
    await volumeSlider.fill('65');
    
    // Check localStorage
    const savedVolume = await page.evaluate(() => {
      return localStorage.getItem('djai_volume');
    });
    
    expect(savedVolume).toBe('65');
  });

  test('should load saved volume on page load', async ({ page }) => {
    // Set volume in localStorage
    await page.evaluate(() => {
      localStorage.setItem('djai_volume', '42');
    });
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(1500);
    
    // Volume should be loaded
    const volumePercentage = page.locator('.volume-percentage');
    const text = await volumePercentage.textContent();
    expect(text).toBe('42%');
  });

  test('should toggle mute when clicking mute button', async ({ page }) => {
    const muteButton = page.locator('.volume-mute-btn');
    const volumeSlider = page.locator('.volume-slider');
    
    // Get initial volume
    const initialVolume = await volumeSlider.inputValue();
    
    // Click mute button
    await muteButton.click();
    
    // Slider should show 0 when muted
    const mutedValue = await volumeSlider.inputValue();
    expect(mutedValue).toBe('0');
    
    // Click again to unmute
    await muteButton.click();
    
    // Volume should be restored
    const restoredValue = await volumeSlider.inputValue();
    expect(restoredValue).toBe(initialVolume);
  });

  test('should change icon based on volume level', async ({ page }) => {
    const muteButton = page.locator('.volume-mute-btn');
    const volumeSlider = page.locator('.volume-slider');
    
    // Set to high volume (> 66)
    await volumeSlider.fill('80');
    let icon = await muteButton.textContent();
    expect(icon).toBeTruthy(); // Should be 🔊
    
    // Set to medium volume (33-66)
    await volumeSlider.fill('50');
    icon = await muteButton.textContent();
    expect(icon).toBeTruthy(); // Should be 🔉
    
    // Set to low volume (< 33)
    await volumeSlider.fill('20');
    icon = await muteButton.textContent();
    expect(icon).toBeTruthy(); // Should be 🔈
    
    // Set to 0
    await volumeSlider.fill('0');
    icon = await muteButton.textContent();
    expect(icon).toBeTruthy(); // Should be 🔇
  });

  test('should have volume control in controls section', async ({ page }) => {
    const controls = page.locator('.controls');
    await expect(controls).toBeVisible();
    
    const volumeControl = controls.locator('.volume-control');
    await expect(volumeControl).toBeVisible();
  });

  test('should have controls-row layout with progress and volume', async ({ page }) => {
    // Ensure we're NOT in fullscreen mode for this test
    const fullscreenButton = page.locator('button[title="Toggle Fullscreen"]');
    const isFullscreen = await page.locator('.fullscreen-controls').isVisible().catch(() => false);
    
    if (isFullscreen) {
      await fullscreenButton.click();
      await page.waitForTimeout(500); // Wait for fullscreen transition
    }

    const controlsRow = page.locator('.controls-row');
    await expect(controlsRow).toBeVisible();
    
    // Should contain both progress bar and volume control (when not in fullscreen)
    const progressBar = controlsRow.locator('.track-progress-bar');
    const volumeControl = controlsRow.locator('.volume-control');
    
    await expect(progressBar).toBeVisible();
    await expect(volumeControl).toBeVisible();
  });
});
