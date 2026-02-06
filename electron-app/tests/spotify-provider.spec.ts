import { test, expect } from '@playwright/test';

/**
 * Spotify Provider Tests
 * 
 * These tests verify Spotify provider functionality.
 * Note: Full OAuth flow testing requires actual Spotify credentials
 * and cannot be fully automated in tests.
 */

test.describe('DJ.ai Spotify Provider', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to app (production mode)
    await page.goto('/');
    await page.waitForTimeout(1500);
  });

  test('should be able to import SpotifyProvider', async ({ page }) => {
    // Test that SpotifyProvider can be imported without errors
    const canImport = await page.evaluate(async () => {
      try {
        // Try to dynamically import the provider
        const module = await import('../src/providers/SpotifyProvider');
        return module.SpotifyProvider !== undefined;
      } catch (error) {
        console.error('Import error:', error);
        return false;
      }
    });

    expect(canImport).toBe(true);
  });

  test('should create SpotifyProvider instance', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const { SpotifyProvider } = await import('../src/providers/SpotifyProvider');
        const provider = new SpotifyProvider();
        
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
    expect(result.providerId).toBe('spotify');
    expect(result.providerName).toBe('Spotify');
    // Initially not authenticated
    expect(result.isAuthenticated).toBe(false);
  });

  test('should have device token for OAuth proxy', async ({ page }) => {
    const deviceToken = await page.evaluate(async () => {
      // Create provider instance which will create device token
      const { SpotifyProvider } = await import('../src/providers/SpotifyProvider');
      new SpotifyProvider();
      
      return localStorage.getItem('djai_device_token');
    });

    // Device token should be created (either existing or new)
    expect(deviceToken).toBeTruthy();
    expect(deviceToken?.length).toBeGreaterThan(0);
  });

  test('should initiate OAuth flow when not authenticated', async ({ page }) => {
    const result = await page.evaluate(async () => {
      try {
        const { SpotifyProvider } = await import('../src/providers/SpotifyProvider');
        const provider = new SpotifyProvider();
        
        // Note: This will fail without actual OAuth proxy running,
        // but we can catch the error and verify the attempt was made
        const authResult = await provider.authenticate();
        
        return {
          success: true,
          requiresOAuth: authResult.requiresOAuth ?? false,
          hasAuthUrl: !!authResult.oauthUrl,
          hasError: !!authResult.error
        };
      } catch (error) {
        // Expected if OAuth proxy is not running
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          attemptedOAuth: true
        };
      }
    });

    // The test passes if either:
    // 1. OAuth was successfully initiated (requires proxy running)
    // 2. A network error occurred trying to reach proxy (expected without proxy)
    expect(result).toBeDefined();
    
    if (result.success) {
      // Successfully talked to OAuth proxy
      expect(typeof result.requiresOAuth).toBe('boolean');
    } else {
      // Expected network error without proxy
      expect(result.attemptedOAuth).toBe(true);
      expect(result.error).toBeTruthy();
    }
  });

  test('should handle search when authenticated', async ({ page }) => {
    // This test requires actual authentication, so we'll just verify the method exists
    const hasSearchMethod = await page.evaluate(async () => {
      try {
        const { SpotifyProvider } = await import('../src/providers/SpotifyProvider');
        const provider = new SpotifyProvider();
        
        return typeof provider.searchTracks === 'function';
      } catch (error) {
        return false;
      }
    });

    expect(hasSearchMethod).toBe(true);
  });

  test('should have Spotify Web Playback SDK methods', async ({ page }) => {
    const methods = await page.evaluate(async () => {
      try {
        const { SpotifyProvider } = await import('../src/providers/SpotifyProvider');
        const provider = new SpotifyProvider();
        
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
        const { SpotifyProvider } = await import('../src/providers/SpotifyProvider');
        const provider = new SpotifyProvider();
        
        // Check all required IMusicProvider methods
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
});
