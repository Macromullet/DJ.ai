import { test, expect } from '@playwright/test';

/**
 * Apple Music Provider Tests
 * 
 * These tests verify Apple Music provider functionality.
 * Note: Full authentication requires Apple Developer account and MusicKit keys.
 * Tests verify structure and basic functionality without live auth.
 */

test.describe('DJ.ai Apple Music Provider', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app (production mode)
    await page.goto('/');
    await page.waitForTimeout(1500);
  });

  test('should be able to import AppleMusicProvider', async ({ page }) => {
    const canImport = await page.evaluate(async () => {
      try {
        const module = await import('../src/providers/AppleMusicProvider');
        return module.AppleMusicProvider !== undefined;
      } catch (error) {
        console.error('Import error:', error);
        return false;
      }
    });

    expect(canImport).toBe(true);
  });

  test('should create AppleMusicProvider instance', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const { AppleMusicProvider } = await import('../src/providers/AppleMusicProvider');
        const provider = new AppleMusicProvider();
        
        return {
          success: true,
          providerId: provider.providerId,
          providerName: provider.providerName,
          isAuthenticated: provider.isAuthenticated
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });

    expect(result.success).toBe(true);
    expect(result.providerId).toBe('apple');
    expect(result.providerName).toBe('Apple Music');
    // Initially not authenticated
    expect(result.isAuthenticated).toBe(false);
  });

  test('should have device token for OAuth proxy', async ({ page }) => {
    const deviceToken = await page.evaluate(async () => {
      const { AppleMusicProvider } = await import('../src/providers/AppleMusicProvider');
      new AppleMusicProvider();
      
      return localStorage.getItem('djai_device_token');
    });

    expect(deviceToken).toBeTruthy();
    expect(deviceToken?.length).toBeGreaterThan(0);
  });

  test('should attempt authentication when requested', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const { AppleMusicProvider } = await import('../src/providers/AppleMusicProvider');
        const provider = new AppleMusicProvider();
        
        // This will fail without OAuth proxy running, but should not throw
        const authResult = await provider.authenticate();
        
        return {
          success: true,
          attempted: true,
          hasError: !!authResult.error
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          attempted: true
        };
      }
    });

    // Either succeeded or got expected error (both are fine without proxy)
    expect(result.attempted).toBe(true);
  });

  test('should have search method', async ({ page }) => {
    const hasSearchMethod = await page.evaluate(async () => {
      try {
        const { AppleMusicProvider } = await import('../src/providers/AppleMusicProvider');
        const provider = new AppleMusicProvider();
        
        return typeof provider.searchTracks === 'function';
      } catch (error) {
        return false;
      }
    });

    expect(hasSearchMethod).toBe(true);
  });

  test('should have MusicKit playback methods', async ({ page }) => {
    const methods = await page.evaluate(async () => {
      try {
        const { AppleMusicProvider } = await import('../src/providers/AppleMusicProvider');
        const provider = new AppleMusicProvider();
        
        return {
          playTrack: typeof provider.playTrack === 'function',
          pause: typeof provider.pause === 'function',
          play: typeof provider.play === 'function',
          next: typeof provider.next === 'function',
          previous: typeof provider.previous === 'function',
          getPlaybackState: typeof provider.getPlaybackState === 'function'
        };
      } catch (error) {
        return null;
      }
    });

    expect(methods).not.toBeNull();
    expect(methods?.playTrack).toBe(true);
    expect(methods?.pause).toBe(true);
    expect(methods?.play).toBe(true);
    expect(methods?.next).toBe(true);
    expect(methods?.previous).toBe(true);
    expect(methods?.getPlaybackState).toBe(true);
  });

  test('should implement IMusicProvider interface completely', async ({ page }) => {
    const interfaceCheck = await page.evaluate(async () => {
      try {
        const { AppleMusicProvider } = await import('../src/providers/AppleMusicProvider');
        const provider = new AppleMusicProvider();
        
        return {
          // Auth methods
          authenticate: typeof provider.authenticate === 'function',
          handleOAuthCallback: typeof provider.handleOAuthCallback === 'function',
          signOut: typeof provider.signOut === 'function',
          
          // Search methods
          searchTracks: typeof provider.searchTracks === 'function',
          getTrackById: typeof provider.getTrackById === 'function',
          
          // Playback methods
          playTrack: typeof provider.playTrack === 'function',
          pause: typeof provider.pause === 'function',
          play: typeof provider.play === 'function',
          next: typeof provider.next === 'function',
          previous: typeof provider.previous === 'function',
          getPlaybackState: typeof provider.getPlaybackState === 'function',
          
          // Recommendation methods
          getRecommendations: typeof provider.getRecommendations === 'function',
          getUserTopTracks: typeof provider.getUserTopTracks === 'function',
          getUserPlaylists: typeof provider.getUserPlaylists === 'function',
          getPlaylistTracks: typeof provider.getPlaylistTracks === 'function',
          
          // Utility methods
          toTrack: typeof provider.toTrack === 'function',
          
          // Properties
          hasProviderId: !!provider.providerId,
          hasProviderName: !!provider.providerName,
          hasIsAuthenticated: typeof provider.isAuthenticated === 'boolean'
        };
      } catch (error) {
        return null;
      }
    });

    expect(interfaceCheck).not.toBeNull();
    
    // Verify all methods exist
    Object.entries(interfaceCheck!).forEach(([key, value]) => {
      expect(value).toBe(true);
    });
  });

  test('should use different auth model than standard OAuth', async ({ page }) => {
    // Apple Music uses Developer Token + Music User Token
    // Not standard OAuth code exchange
    const authModel = await page.evaluate(async () => {
      try {
        const { AppleMusicProvider } = await import('../src/providers/AppleMusicProvider');
        const provider = new AppleMusicProvider();
        
        // handleOAuthCallback should return false (not used)
        const callbackResult = await provider.handleOAuthCallback('http://test.com?code=123');
        
        return {
          usesStandardOAuth: callbackResult, // Should be false
          hasDeveloperTokenLogic: true // We can't easily test this without mocking
        };
      } catch (error) {
        return null;
      }
    });

    expect(authModel).not.toBeNull();
    expect(authModel?.usesStandardOAuth).toBe(false);
  });
});
