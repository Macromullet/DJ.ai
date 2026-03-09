/**
 * Spotify Provider Implementation
 * 
 * Uses Spotify Web API for search and library access.
 * Uses Spotify Web Playback SDK for in-browser playback.
 * Authentication via OAuth 2.0 through our proxy backend.
 */

import { IMusicProvider, SearchResult, AuthenticationResult, TrackRecommendation, PlaybackState } from '../types/IMusicProvider';
import { Track } from '../types';
import { config } from '../config/environment';
import { handleApiResponse } from '../utils/apiError';

const OAUTH_PROXY_BASE = config.oauthProxyUrl;
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

interface SpotifyAuth {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
}

interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, callback: (...args: any[]) => void): void;
  removeListener(event: string): void;
  getCurrentState(): Promise<any>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  seek(positionMs: number): Promise<void>;
}

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: any) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

export class SpotifyProvider implements IMusicProvider {
  readonly providerId = 'spotify' as const;
  readonly providerName = 'Spotify';
  
  private auth: SpotifyAuth | null = null;
  private deviceToken: string;
  private player: SpotifyPlayer | null = null;
  private deviceId: string | null = null;
  
  isAuthenticated: boolean = false;

  constructor() {
    // Get or create device token for OAuth proxy
    this.deviceToken = this.getOrCreateDeviceToken();
    
    // Load saved auth from localStorage
    this.loadAuth();
    
    // Initialize Spotify Web Playback SDK
    this.initializePlayer();
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
    try {
      const saved = localStorage.getItem('djai_spotify_auth');
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
      console.error('Failed to load Spotify auth:', error);
    }
  }

  private saveAuth(): void {
    if (this.auth) {
      localStorage.setItem('djai_spotify_auth', JSON.stringify(this.auth));
    }
  }

  private clearAuth(): void {
    this.auth = null;
    this.isAuthenticated = false;
    localStorage.removeItem('djai_spotify_auth');
  }

  // ============ TOKEN REFRESH ============

  async ensureAuthenticated(): Promise<boolean> {
    if (this.isAuthenticated && this.auth?.expiresAt && Date.now() < this.auth.expiresAt) {
      return true;
    }
    if (this.auth?.refreshToken) {
      await this.refreshTokenIfNeeded();
    }
    // Retry player initialization if auth succeeded but player was skipped
    if (this.isAuthenticated && !this.player) {
      await this.initializePlayer();
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
      const raw = await fetch(`${OAUTH_PROXY_BASE}/oauth/spotify/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Token': this.deviceToken
        },
        body: JSON.stringify({
          refreshToken: this.auth.refreshToken
        })
      });

      const response = await handleApiResponse(raw, 'spotify/refresh');
      const data = await response.json();
      
      this.auth = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || this.auth.refreshToken,
        expiresAt: Date.now() + (data.expiresIn * 1000)
      };
      
      this.saveAuth();
      this.isAuthenticated = true;
      
      console.log('Spotify token refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh Spotify token:', error);
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
    // Check if already authenticated
    if (this.isAuthenticated && this.auth) {
      await this.refreshTokenIfNeeded();
      return { success: true };
    }

    try {
      const redirectUri = this.getRedirectUri();
      
      // Initiate OAuth flow via proxy
      const raw = await fetch(`${OAUTH_PROXY_BASE}/oauth/spotify/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Token': this.deviceToken
        },
        body: JSON.stringify({
          redirectUri
        })
      });

      const response = await handleApiResponse(raw, 'spotify/initiate');
      const data = await response.json();
      
      // Store state for validation and provider resolution
      // Fix 3: Use state-based lookup for provider
      localStorage.setItem(`djai_oauth_state_${data.state}`, 'spotify');
      
      // Fallback for backwards compatibility
      localStorage.setItem('djai_oauth_pending_provider', 'spotify');

      return {
        success: false,
        requiresOAuth: true,
        oauthUrl: data.authUrl
      };
    } catch (error) {
      console.error('Spotify authentication error:', error);
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
        console.error('Spotify OAuth error:', error);
        return false;
      }

      if (!code || !state) {
        console.error('Missing code or state in callback');
        return false;
      }

      // Validate state (CSRF protection)
      const providerName = localStorage.getItem(`djai_oauth_state_${state}`);
      if (!providerName || providerName !== 'spotify') {
        console.error('State mismatch or invalid provider - possible CSRF attack');
        return false;
      }

      localStorage.removeItem(`djai_oauth_state_${state}`);
      localStorage.removeItem('djai_oauth_pending_provider');

      // Exchange code for tokens via proxy
      const raw = await fetch(`${OAUTH_PROXY_BASE}/oauth/spotify/exchange`, {
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

      const response = await handleApiResponse(raw, 'spotify/exchange');
      const data = await response.json();
      
      this.auth = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresAt: Date.now() + (data.expiresIn * 1000)
      };
      
      this.saveAuth();
      this.isAuthenticated = true;
      await this.initializePlayer();

      console.log('Spotify authenticated successfully');
      return true;
    } catch (error) {
      console.error('OAuth callback error:', error);
      return false;
    }
  }

  async signOut(): Promise<void> {
    this.clearAuth();
    
    // Disconnect player
    if (this.player) {
      this.player.disconnect();
      this.player = null;
    }
    
    console.log('Signed out from Spotify');
  }

  // ============ SPOTIFY WEB PLAYBACK SDK ============

  private async initializePlayer(): Promise<void> {
    // Idempotency: skip if a player instance already exists
    if (this.player) {
      console.log('Spotify player already initialized');
      return;
    }

    // Load SDK if not already loaded
    if (!window.Spotify) {
      await this.loadSpotifySDK();
    }

    // Wait for SDK to be ready
    await new Promise<void>((resolve) => {
      if (window.Spotify) {
        resolve();
      } else {
        window.onSpotifyWebPlaybackSDKReady = () => resolve();
      }
    });

    if (!this.isAuthenticated || !this.auth) {
      console.log('Not authenticated, skipping player initialization');
      return;
    }

    try {
      this.player = new window.Spotify!.Player({
        name: 'DJ.ai Web Player',
        getOAuthToken: async (cb: (token: string) => void) => {
          await this.refreshTokenIfNeeded();
          if (this.auth) {
            cb(this.auth.accessToken);
          }
        },
        volume: 0.8
      });

      // Error handling
      this.player.addListener('initialization_error', ({ message }) => {
        console.error('Spotify player initialization error:', message);
      });

      this.player.addListener('authentication_error', ({ message }) => {
        console.error('Spotify player authentication error:', message);
        this.clearAuth();
      });

      this.player.addListener('account_error', ({ message }) => {
        console.error('Spotify player account error:', message);
      });

      this.player.addListener('playback_error', ({ message }) => {
        console.error('Spotify playback error:', message);
      });

      // Ready
      this.player.addListener('ready', ({ device_id }) => {
        console.log('Spotify Web Playback SDK ready with device ID:', device_id);
        this.deviceId = device_id;
      });

      this.player.addListener('not_ready', ({ device_id }) => {
        console.log('Spotify device has gone offline:', device_id);
      });

      // Connect to the player
      const connected = await this.player.connect();
      
      if (!connected) {
        console.error('Failed to connect Spotify player');
      }
    } catch (error) {
      console.error('Error initializing Spotify player:', error);
      this.isAuthenticated = false;
      this.clearAuth();
    }
  }

  private loadSpotifySDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://sdk.scdn.co/spotify-player.js';
      script.async = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Spotify SDK'));
      
      document.body.appendChild(script);
    });
  }

  // ============ API HELPERS ============

  private async spotifyFetch(endpoint: string, options?: RequestInit, isRetry: boolean = false): Promise<any> {
    await this.refreshTokenIfNeeded();
    
    if (!this.auth) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.auth.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (response.status === 401 && !isRetry) {
      // Token expired, try to refresh once
      await this.refreshAccessToken();
      return this.spotifyFetch(endpoint, options, true);
    }

    if (response.status === 401 && isRetry) {
      throw new Error('Spotify authentication failed after token refresh. Please reconnect.');
    }

    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.statusText}`);
    }

    // Spotify returns 204 No Content for some endpoints (e.g., PUT /me/player/play)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null;
    }

    return response.json();
  }

  // ============ SEARCH ============

  async searchTracks(query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      const data = await this.spotifyFetch(
        `/search?q=${encodeURIComponent(query)}&type=track&limit=${limit}`
      );

      return data.tracks.items.map((track: any) => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map((a: any) => a.name).join(', '),
        album: track.album.name,
        thumbnailUrl: track.album.images[0]?.url,
        durationMs: track.duration_ms,
        providerData: {
          uri: track.uri,
          spotifyId: track.id,
          previewUrl: track.preview_url
        }
      }));
    } catch (error) {
      console.error('Spotify search error:', error);
      return [];
    }
  }

  async getTrackById(id: string): Promise<SearchResult | null> {
    try {
      const track = await this.spotifyFetch(`/tracks/${id}`);

      return {
        id: track.id,
        title: track.name,
        artist: track.artists.map((a: any) => a.name).join(', '),
        album: track.album.name,
        thumbnailUrl: track.album.images[0]?.url,
        durationMs: track.duration_ms,
        providerData: {
          uri: track.uri,
          spotifyId: track.id,
          previewUrl: track.preview_url
        }
      };
    } catch (error) {
      console.error('Error fetching Spotify track:', error);
      return null;
    }
  }

  // ============ PLAYBACK ============

  async playTrack(searchResult: SearchResult): Promise<string> {
    if (!this.deviceId) {
      throw new Error('Spotify player not ready');
    }

    try {
      await this.spotifyFetch(`/me/player/play?device_id=${this.deviceId}`, {
        method: 'PUT',
        body: JSON.stringify({
          uris: [searchResult.providerData.uri]
        })
      });

      return searchResult.providerData.uri;
    } catch (error) {
      console.error('Spotify playback error:', error);
      throw error;
    }
  }

  async pause(): Promise<void> {
    if (this.player) {
      await this.player.pause();
    }
  }

  async play(): Promise<void> {
    if (this.player) {
      await this.player.resume();
    }
  }

  async next(): Promise<void> {
    if (this.player) {
      await this.player.nextTrack();
    }
  }

  async previous(): Promise<void> {
    if (this.player) {
      await this.player.previousTrack();
    }
  }

  async getPlaybackState(): Promise<PlaybackState> {
    if (!this.player) {
      return {
        isPlaying: false,
        currentTrack: null,
        positionMs: 0,
        durationMs: 0
      };
    }

    try {
      const state = await this.player.getCurrentState();
      
      if (!state) {
        return {
          isPlaying: false,
          currentTrack: null,
          positionMs: 0,
          durationMs: 0
        };
      }

      const track = state.track_window?.current_track;
      
      return {
        isPlaying: !state.paused,
        currentTrack: track ? {
          id: track.id,
          name: track.name,
          artist: track.artists.map((a: any) => a.name).join(', '),
          album: track.album?.name || '',
          albumArtUrl: track.album?.images[0]?.url,
          durationMs: track.duration_ms
        } : null,
        positionMs: state.position,
        durationMs: state.duration
      };
    } catch (error) {
      console.error('Error getting playback state:', error);
      return {
        isPlaying: false,
        currentTrack: null,
        positionMs: 0,
        durationMs: 0
      };
    }
  }

  // ============ RECOMMENDATIONS ============

  async getRecommendations(currentTrack: SearchResult, count: number = 10): Promise<TrackRecommendation[]> {
    try {
      const data = await this.spotifyFetch(
        `/recommendations?seed_tracks=${currentTrack.id}&limit=${count}`
      );

      return data.tracks.map((track: any) => ({
        track: {
          id: track.id,
          title: track.name,
          artist: track.artists.map((a: any) => a.name).join(', '),
          album: track.album.name,
          thumbnailUrl: track.album.images[0]?.url,
          durationMs: track.duration_ms,
          providerData: {
            uri: track.uri,
            spotifyId: track.id,
            previewUrl: track.preview_url
          }
        },
        reason: `Recommended based on ${currentTrack.title}`,
        confidence: 0.8
      }));
    } catch (error) {
      console.error('Error getting Spotify recommendations:', error);
      return [];
    }
  }

  async getUserTopTracks(limit: number = 20): Promise<SearchResult[]> {
    try {
      const data = await this.spotifyFetch(
        `/me/top/tracks?limit=${limit}&time_range=medium_term`
      );

      return data.items.map((track: any) => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map((a: any) => a.name).join(', '),
        album: track.album.name,
        thumbnailUrl: track.album.images[0]?.url,
        durationMs: track.duration_ms,
        providerData: {
          uri: track.uri,
          spotifyId: track.id,
          previewUrl: track.preview_url
        }
      }));
    } catch (error) {
      console.error('Error getting user top tracks:', error);
      return [];
    }
  }

  async getUserPlaylists(): Promise<Array<{ id: string; name: string; trackCount: number }>> {
    try {
      const data = await this.spotifyFetch('/me/playlists?limit=50');

      return data.items.map((playlist: any) => ({
        id: playlist.id,
        name: playlist.name,
        trackCount: playlist.tracks.total
      }));
    } catch (error) {
      console.error('Error getting user playlists:', error);
      return [];
    }
  }

  async getPlaylistTracks(playlistId: string): Promise<SearchResult[]> {
    try {
      const data = await this.spotifyFetch(`/playlists/${playlistId}/tracks`);

      return data.items.map((item: any) => {
        const track = item.track;
        return {
          id: track.id,
          title: track.name,
          artist: track.artists.map((a: any) => a.name).join(', '),
          album: track.album.name,
          thumbnailUrl: track.album.images[0]?.url,
          durationMs: track.duration_ms,
          providerData: {
            uri: track.uri,
            spotifyId: track.id,
            previewUrl: track.preview_url
          }
        };
      });
    } catch (error) {
      console.error('Error getting playlist tracks:', error);
      return [];
    }
  }

  // ============ UTILITIES ============

  toTrack(searchResult: SearchResult): Track {
    return {
      id: searchResult.id,
      name: searchResult.title,
      artist: searchResult.artist,
      album: searchResult.album || '',
      albumArtUrl: searchResult.thumbnailUrl,
      durationMs: searchResult.durationMs || 0
    };
  }
}
