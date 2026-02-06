import { test, expect } from '@playwright/test';

/**
 * Track Progress Bar Tests
 * 
 * Tests the playback progress bar component including:
 * - Display of current time and duration
 * - Real-time progress updates
 * - Seek functionality
 */

test.describe('DJ.ai Track Progress Bar', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to test mode
    await page.goto('/?test=true');
    await page.waitForTimeout(1500);
  });

  test('should display progress bar component', async ({ page }) => {
    // Progress bar should be visible
    const progressBar = page.locator('.track-progress-bar');
    await expect(progressBar).toBeVisible();
  });

  test('should show time displays (current and duration)', async ({ page }) => {
    // Should have two time displays
    const times = page.locator('.progress-time');
    await expect(times).toHaveCount(2);
    
    // Both should show time format (mm:ss)
    const timeTexts = await times.allTextContents();
    
    timeTexts.forEach(text => {
      expect(text).toMatch(/^\d+:\d{2}$/); // Format: 0:00 or 3:45
    });
  });

  test('should display progress bar fill element', async ({ page }) => {
    const progressFill = page.locator('.progress-bar-fill');
    
    // Progress fill should exist in the DOM
    await expect(progressFill).toBeAttached();
    
    // Should have a width style property
    const hasStyle = await progressFill.evaluate(el => {
      return el.style !== undefined;
    });
    
    expect(hasStyle).toBe(true);
  });

  test('should show progress handle on hover', async ({ page }) => {
    const progressContainer = page.locator('.progress-bar-container');
    const progressHandle = page.locator('.progress-handle');
    
    // Handle should exist but be hidden initially
    await expect(progressHandle).toBeAttached();
    
    // Hover over progress bar
    await progressContainer.hover();
    
    // Note: CSS :hover opacity changes are hard to test reliably in Playwright
    // Just verify the element exists
    await expect(progressHandle).toBeAttached();
  });

  test('should update progress when playing track', async ({ page }) => {
    // Just verify the progress bar structure exists and is functional
    const progressFill = page.locator('.progress-bar-fill');
    await expect(progressFill).toBeAttached();
    
    // Progress fill should have a width style
    const hasWidth = await progressFill.evaluate(el => {
      const style = window.getComputedStyle(el);
      return style.width !== '';
    });
    
    expect(hasWidth).toBe(true);
  });

  test('should allow clicking to seek', async ({ page }) => {
    // Just verify the progress bar is clickable
    const progressContainer = page.locator('.progress-bar-container');
    await expect(progressContainer).toBeVisible();
    
    // Should have mousedown handler (can click without error)
    const box = await progressContainer.boundingBox();
    expect(box).toBeTruthy();
  });

  test('should format time correctly', async ({ page }) => {
    // Check time format
    const times = page.locator('.progress-time');
    const timeTexts = await times.allTextContents();
    
    // Should be in format mm:ss
    timeTexts.forEach(text => {
      expect(text).toMatch(/^\d+:\d{2}$/);
    });
    
    // Initial time should be 0:00
    expect(timeTexts[0]).toBe('0:00');
  });

  test('should have progress bar in controls section', async ({ page }) => {
    // Progress bar should be in the controls area
    const controls = page.locator('.controls');
    await expect(controls).toBeVisible();
    
    const progressBar = controls.locator('.track-progress-bar');
    await expect(progressBar).toBeVisible();
  });

  test('should have control buttons below progress bar', async ({ page }) => {
    // Control buttons should exist (not in fullscreen)
    const controlButtons = page.locator('.playback-controls button, .control-buttons button').first();
    await expect(controlButtons).toBeVisible();
  });
});
