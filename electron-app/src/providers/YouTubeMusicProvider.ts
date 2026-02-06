/**
 * YouTube Music Provider Implementation
 * 
 * Uses YouTube Data API v3 for search and YouTube IFrame Player API for playback.
 * Authentication via OAuth 2.0 through our proxy backend.
 */

import { IMusicProvider, SearchResult, AuthenticationResult, TrackRecommendation, PlaybackState } from '../types/IMusicProvider';
import { Track } from '../types';
import { config } from '../config/environment';
import { handleApiResponse } from '../utils/apiError';

const OAUTH_PROXY_BASE = config.oauthProxyUrl;

interface YouTubeAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

export class YouTubeMusicProvider implements IMusicProvider {
  readonly providerId = 'youtube' as const;
  readonly providerName = 'YouTube Music';
  
  private auth: YouTubeAuth | null = null;
  private deviceToken: string;
  private apiKey: string = '';
  
  isAuthenticated: boolean = false;

  constructor(config?: { apiKey?: string; accessToken?: string; refreshToken?: string }) {
    // Get or create device token for OAuth proxy
    this.deviceToken = this.getOrCreateDeviceToken();
    
    // Support API key for backwards compatibility
    if (config?.apiKey) {
      this.apiKey = config.apiKey;
      this.isAuthenticated = true;
    }

    // Support pre-loaded OAuth tokens
    if (config?.accessToken && config?.refreshToken) {
      this.auth = {
        accessToken: config.accessToken,
        refreshToken: config.refreshToken,
        expiresAt: Date.now() + 3600 * 1000
      };
      this.isAuthenticated = true;
    }
    
    // Load saved auth from localStorage
    this.loadAuth();
  }

  // ============ DEVICE TOKEN MANAGEMENT ============

  private getOrCreateDeviceToken(): string {
    let token = localStorage.getItem('djai_device_token');
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem('djai_device_token', token);
    }
    return token;
  }

  // ============ AUTH PERSISTENCE ============

  private loadAuth(): void {
    // Don't overwrite auth if already configured via constructor (e.g., API key)
    if (this.auth && this.isAuthenticated) {
      return;
    }

    try {
      const saved = localStorage.getItem('djai_youtube_auth');
      if (saved) {
        this.auth = JSON.parse(saved);
        
        // Check if token is still valid
        if (this.auth && this.auth.expiresAt > Date.now()) {
          this.isAuthenticated = true;
        } else {
          // Token expired, try to refresh
          this.refreshTokenIfNeeded();
        }
      }
    } catch (error) {
      console.error('Failed to load YouTube auth:', error);
    }
  }

  private saveAuth(): void {
    if (this.auth) {
      localStorage.setItem('djai_youtube_auth', JSON.stringify(this.auth));
    }
  }

  private clearAuth(): void {
    this.auth = null;
    this.isAuthenticated = false;
    localStorage.removeItem('djai_youtube_auth');
  }

  // ============ TOKEN REFRESH ============

  async ensureAuthenticated(): Promise<boolean> {
    if (this.isAuthenticated && this.auth?.expiresAt && Date.now() < this.auth.expiresAt) {
      return true;
    }
    if (this.auth?.refreshToken) {
      await this.refreshTokenIfNeeded();
    }
    return this.isAuthenticated;
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    if (!this.auth || !this.auth.refreshToken) return;
    
    // Refresh if token expires in the next 5 minutes
    if (this.auth.expiresAt - Date.now() < 5 * 60 * 1000) {
      await this.refreshAccessToken();
    }
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.auth?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const raw = await fetch(`${OAUTH_PROXY_BASE}/oauth/youtube/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Token': this.deviceToken
        },
        body: JSON.stringify({
          refreshToken: this.auth.refreshToken
        })
      });

      const response = await handleApiResponse(raw, 'youtube/refresh');
      const data = await response.json();
      
      this.auth = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || this.auth.refreshToken,
        expiresAt: Date.now() + (data.expiresIn * 1000)
      };
      
      this.saveAuth();
      this.isAuthenticated = true;
      
      console.log('YouTube token refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh YouTube token:', error);
      this.clearAuth();
      throw error;
    }
  }

  // ============ REDIRECT URI ============

  private getRedirectUri(): string {
    return window.location.protocol === 'file:'
      ? 'djai://oauth/callback'
      : `${window.location.origin}/oauth/callback`;
  }

  // ============ AUTHENTICATION ============

  async authenticate(): Promise<AuthenticationResult> {
    // Check if already authenticated (OAuth or API key)
    if (this.isAuthenticated && (this.auth || this.apiKey)) {
      if (this.auth) {
        await this.refreshTokenIfNeeded();
      }
      return { success: true };
    }

    try {
      const redirectUri = this.getRedirectUri();
      
      // Initiate OAuth flow via proxy
      const raw = await fetch(`${OAUTH_PROXY_BASE}/oauth/youtube/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Token': this.deviceToken
        },
        body: JSON.stringify({
          redirectUri
        })
      });

      const response = await handleApiResponse(raw, 'youtube/initiate');
      const data = await response.json();
      
      // Store state for validation and provider resolution
      // Fix 3: Use state-based lookup for provider
      localStorage.setItem(`djai_oauth_state_${data.state}`, 'youtube');
      
      // Fallback for backwards compatibility
      localStorage.setItem('djai_oauth_pending_provider', 'youtube');

      return {
        success: false,
        requiresOAuth: true,
        oauthUrl: data.authUrl
      };
    } catch (error) {
      console.error('YouTube authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async handleOAuthCallback(callbackUrl: string): Promise<boolean> {
    try {
      const url = new URL(callbackUrl);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        console.error('YouTube OAuth error:', error);
        return false;
      }

      if (!code || !state) {
        console.error('Missing code or state in callback');
        return false;
      }

      // Validate state (CSRF protection)
      const providerName = localStorage.getItem(`djai_oauth_state_${state}`);
      if (!providerName || providerName !== 'youtube') {
        console.error('State mismatch or invalid provider - possible CSRF attack');
        return false;
      }

      localStorage.removeItem(`djai_oauth_state_${state}`);
      localStorage.removeItem('djai_oauth_pending_provider');

      // Exchange code for tokens via proxy
      const raw = await fetch(`${OAUTH_PROXY_BASE}/oauth/youtube/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Token': this.deviceToken
        },
        body: JSON.stringify({
          code,
          state,
          redirectUri: this.getRedirectUri()
        })
      });

      const response = await handleApiResponse(raw, 'youtube/exchange');
      const data = await response.json();
      
      this.auth = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn * 1000)
      };
      
      this.saveAuth();
      this.isAuthenticated = true;
      
      // Clear API key if we have OAuth now
      this.apiKey = '';

      console.log('YouTube authenticated successfully');
      return true;
    } catch (error) {
      console.error('OAuth callback error:', error);
      return false;
    }
  }

  async signOut(): Promise<void> {
    this.clearAuth();
    this.apiKey = '';
  }

  // ============ SEARCH ============

  async searchTracks(query: string, limit: number = 10): Promise<SearchResult[]> {
    // Prefer OAuth, fallback to API key
    const headers: Record<string, string> = {};
    if (this.auth?.accessToken) {
      headers['Authorization'] = `Bearer ${this.auth.accessToken}`;
    }
    
    const apiKeyParam = !this.auth?.accessToken && this.apiKey 
      ? `&key=${this.apiKey}` 
      : '';

    if (!this.auth?.accessToken && !this.apiKey) {
      throw new Error('YouTube authentication required (OAuth or API key)');
    }

    try {
      // Refresh token if needed before making API call
      if (this.auth?.accessToken) {
        await this.refreshTokenIfNeeded();
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&` +
        `q=${encodeURIComponent(query)}&` +
        `type=video&` +
        `videoCategoryId=10&` +
        `maxResults=${limit}${apiKeyParam}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      return data.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        album: 'YouTube Music',
        thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        durationMs: 0,
        providerData: {
          videoId: item.id.videoId,
          channelId: item.snippet.channelId,
          description: item.snippet.description
        }
      }));
    } catch (error: any) {
      console.error('YouTube search error:', error);
      throw error;
    }
  }

  async getTrackById(id: string): Promise<SearchResult | null> {
    const headers: Record<string, string> = {};
    if (this.auth?.accessToken) {
      headers['Authorization'] = `Bearer ${this.auth.accessToken}`;
    }
    
    const apiKeyParam = !this.auth?.accessToken && this.apiKey 
      ? `&key=${this.apiKey}` 
      : '';

    if (!this.auth?.accessToken && !this.apiKey) return null;

    try {
      if (this.auth?.accessToken) {
        await this.refreshTokenIfNeeded();
      }

      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?` +
        `part=snippet&` +
        `id=${id}${apiKeyParam}`,
        { headers }
      );

      const data = await response.json();
      if (!data.items || data.items.length === 0) return null;

      const item = data.items[0];
      return {
        id: item.id,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails.medium?.url,
        providerData: { videoId: item.id }
      };
    } catch (error) {
      console.error('Get track error:', error);
      return null;
    }
  }

  // ============ PLAYBACK ============

  async playTrack(searchResult: SearchResult): Promise<string> {
    return searchResult.providerData.videoId || searchResult.id;
  }

  async pause(): Promise<void> {
    // Handled by YouTube IFrame Player in App component
  }

  async play(): Promise<void> {
    // Handled by YouTube IFrame Player in App component
  }

  async next(): Promise<void> {
    // Handled by playlist logic in App component
  }

  async previous(): Promise<void> {
    // Handled by playlist logic in App component
  }

  async getPlaybackState(): Promise<PlaybackState> {
    return {
      isPlaying: false,
      currentTrack: null,
      positionMs: 0,
      durationMs: 0
    };
  }

  // ============ RECOMMENDATIONS ============

  async getRecommendations(currentTrack: SearchResult, count: number = 3): Promise<TrackRecommendation[]> {
    if (!this.apiKey) return [];

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&` +
        `relatedToVideoId=${currentTrack.providerData.videoId}&` +
        `type=video&` +
        `videoCategoryId=10&` +
        `maxResults=${count}&` +
        `key=${this.apiKey}`
      );

      const data = await response.json();
      
      return data.items.map((item: any, index: number) => ({
        track: {
          id: item.id.videoId,
          title: item.snippet.title,
          artist: item.snippet.channelTitle,
          thumbnailUrl: item.snippet.thumbnails.medium?.url,
          providerData: { videoId: item.id.videoId }
        },
        reason: 'Related to current track',
        confidence: 1 - (index * 0.1)
      }));
    } catch (error) {
      console.error('Recommendations error:', error);
      return [];
    }
  }

  async getUserTopTracks(_limit: number = 50): Promise<SearchResult[]> {
    return [];
  }

  async getUserPlaylists(): Promise<Array<{ id: string; name: string; trackCount: number }>> {
    return [];
  }

  async getPlaylistTracks(playlistId: string): Promise<SearchResult[]> {
    if (!this.apiKey) return [];

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?` +
        `part=snippet&` +
        `playlistId=${playlistId}&` +
        `maxResults=50&` +
        `key=${this.apiKey}`
      );

      const data = await response.json();
      
      return data.items.map((item: any) => ({
        id: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails.medium?.url,
        providerData: { videoId: item.snippet.resourceId.videoId }
      }));
    } catch (error) {
      console.error('Playlist tracks error:', error);
      return [];
    }
  }

  // ============ UTILITIES ============

  toTrack(searchResult: SearchResult): Track {
    return {
      id: searchResult.id,
      name: searchResult.title,
      artist: searchResult.artist,
      album: searchResult.album || 'YouTube Music',
      albumArtUrl: searchResult.thumbnailUrl,
      durationMs: searchResult.durationMs || 0,
      serviceUrl: `https://www.youtube.com/watch?v=${searchResult.providerData.videoId}`
    };
  }
}
