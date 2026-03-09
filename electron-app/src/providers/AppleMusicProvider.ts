/**
 * Apple Music Provider Implementation
 * 
 * Uses Apple MusicKit JS SDK for authentication, search, and playback.
 * Apple Music uses a different auth model than standard OAuth:
 * - Developer Token (JWT signed with ES256)
 * - Music User Token (obtained via MusicKit.authorize())
 */

import { IMusicProvider, SearchResult, AuthenticationResult, TrackRecommendation, PlaybackState } from '../types/IMusicProvider';
import { Track } from '../types';
import { config } from '../config/environment';
import { handleApiResponse } from '../utils/apiError';

const OAUTH_PROXY_BASE = config.oauthProxyUrl;

declare global {
  interface Window {
    MusicKit?: any;
    musickitLoaded?: boolean;
  }
}

export class AppleMusicProvider implements IMusicProvider {
  readonly providerId = 'apple' as const;
  readonly providerName = 'Apple Music';
  
  private developerToken: string = '';
  private musicUserToken: string = '';
  private deviceToken: string;
  private musicKitInstance: any = null;
  
  isAuthenticated: boolean = false;

  constructor() {
    // Get or create device token for OAuth proxy
    this.deviceToken = this.getOrCreateDeviceToken();
    
    // Load saved tokens from localStorage
    this.loadAuth();
    
    // Initialize MusicKit JS SDK
    this.initializeMusicKit();
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
      const savedDevToken = localStorage.getItem('djai_apple_developer_token');
      const savedUserToken = localStorage.getItem('djai_apple_user_token');
      
      if (savedDevToken && savedUserToken) {
        this.developerToken = savedDevToken;
        this.musicUserToken = savedUserToken;
        this.isAuthenticated = true;
      }
    } catch (error) {
      console.error('Failed to load Apple Music auth:', error);
    }
  }

  private saveAuth(): void {
    if (this.developerToken && this.musicUserToken) {
      localStorage.setItem('djai_apple_developer_token', this.developerToken);
      localStorage.setItem('djai_apple_user_token', this.musicUserToken);
    }
  }

  private clearAuth(): void {
    this.developerToken = '';
    this.musicUserToken = '';
    this.isAuthenticated = false;
    localStorage.removeItem('djai_apple_developer_token');
    localStorage.removeItem('djai_apple_user_token');
  }

  // ============ MUSICKIT JS SDK ============

  private async initializeMusicKit(): Promise<void> {
    // Load MusicKit JS SDK if not already loaded
    if (!window.MusicKit) {
      await this.loadMusicKitSDK();
    }

    // Wait for SDK to be ready
    await this.waitForMusicKitReady();

    // Don't configure yet if we don't have a developer token
    if (!this.developerToken) {
      console.log('No developer token yet, skipping MusicKit configuration');
      return;
    }

    try {
      await window.MusicKit.configure({
        developerToken: this.developerToken,
        app: {
          name: 'DJ.ai',
          build: '1.0.0'
        }
      });

      this.musicKitInstance = window.MusicKit.getInstance();
      
      // If we have a saved user token, set it
      if (this.musicUserToken) {
        this.musicKitInstance.musicUserToken = this.musicUserToken;
      }

      console.log('MusicKit configured successfully');
    } catch (error) {
      console.error('Error configuring MusicKit:', error);
      this.isAuthenticated = false;
      this.clearAuth();
    }
  }

  private loadMusicKitSDK(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';
      script.async = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load MusicKit SDK'));
      
      document.body.appendChild(script);
    });
  }

  private waitForMusicKitReady(): Promise<void> {
    return new Promise((resolve) => {
      if (window.MusicKit) {
        resolve();
      } else {
        const checkInterval = setInterval(() => {
          if (window.MusicKit) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        
        // Timeout after 10 seconds
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 10000);
      }
    });
  }

  // ============ AUTHENTICATION ============

  async authenticate(): Promise<AuthenticationResult> {
    try {
      // Store provider name so OAuthCallback can resolve the correct provider
      localStorage.setItem('djai_oauth_pending_provider', 'apple');

      // Step 1: Get developer token from OAuth proxy
      if (!this.developerToken) {
        const devTokenRaw = await fetch(`${OAUTH_PROXY_BASE}/oauth/apple/developer-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Device-Token': this.deviceToken
          }
        });

        const devTokenResponse = await handleApiResponse(devTokenRaw, 'apple/developer-token');
        const devTokenData = await devTokenResponse.json();
        this.developerToken = devTokenData.developerToken;

        // Configure MusicKit with developer token
        await this.initializeMusicKit();
      }

      // Step 2: Authorize user to get Music User Token
      if (!this.musicUserToken && this.musicKitInstance) {
        const userToken = await this.musicKitInstance.authorize();
        this.musicUserToken = userToken;
        this.saveAuth();
        this.isAuthenticated = true;

        console.log('Apple Music authenticated successfully');
        return { success: true };
      }

      // Already authenticated
      if (this.isAuthenticated) {
        return { success: true };
      }

      return {
        success: false,
        error: 'MusicKit not ready. Please try again.'
      };
    } catch (error) {
      console.error('Apple Music authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async handleOAuthCallback(_callbackUrl: string): Promise<boolean> {
    // Apple Music doesn't use traditional OAuth callbacks
    // Authentication is handled entirely through MusicKit SDK
    return false;
  }

  async signOut(): Promise<void> {
    if (this.musicKitInstance) {
      await this.musicKitInstance.unauthorize();
    }
    
    this.clearAuth();
    console.log('Signed out from Apple Music');
  }

  // ============ API HELPERS ============

  private async appleMusicFetch(endpoint: string, options?: RequestInit): Promise<any> {
    if (!this.developerToken) {
      throw new Error('Not authenticated - missing developer token');
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.developerToken}`,
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>)
    };

    // Add Music User Token if available (required for user library)
    if (this.musicUserToken) {
      headers['Music-User-Token'] = this.musicUserToken;
    }

    const response = await fetch(`https://api.music.apple.com/v1${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`Apple Music API error: ${response.statusText}`);
    }

    return response.json();
  }

  // ============ SEARCH ============

  async searchTracks(query: string, limit: number = 10): Promise<SearchResult[]> {
    try {
      const data = await this.appleMusicFetch(
        `/catalog/us/search?term=${encodeURIComponent(query)}&types=songs&limit=${limit}`
      );

      if (!data.results || !data.results.songs) {
        return [];
      }

      return data.results.songs.data.map((song: any) => ({
        id: song.id,
        title: song.attributes.name,
        artist: song.attributes.artistName,
        album: song.attributes.albumName,
        thumbnailUrl: song.attributes.artwork?.url.replace('{w}', '300').replace('{h}', '300'),
        durationMs: song.attributes.durationInMillis,
        providerData: {
          appleMusicId: song.id,
          isrc: song.attributes.isrc,
          previewUrl: song.attributes.previews?.[0]?.url
        }
      }));
    } catch (error) {
      console.error('Apple Music search error:', error);
      return [];
    }
  }

  async getTrackById(id: string): Promise<SearchResult | null> {
    try {
      const data = await this.appleMusicFetch(`/catalog/us/songs/${id}`);

      if (!data.data || data.data.length === 0) {
        return null;
      }

      const song = data.data[0];
      return {
        id: song.id,
        title: song.attributes.name,
        artist: song.attributes.artistName,
        album: song.attributes.albumName,
        thumbnailUrl: song.attributes.artwork?.url.replace('{w}', '300').replace('{h}', '300'),
        durationMs: song.attributes.durationInMillis,
        providerData: {
          appleMusicId: song.id,
          isrc: song.attributes.isrc,
          previewUrl: song.attributes.previews?.[0]?.url
        }
      };
    } catch (error) {
      console.error('Error fetching Apple Music track:', error);
      return null;
    }
  }

  // ============ PLAYBACK ============

  async playTrack(searchResult: SearchResult): Promise<string> {
    if (!this.musicKitInstance) {
      throw new Error('MusicKit not ready');
    }

    try {
      await this.musicKitInstance.setQueue({
        song: searchResult.providerData.appleMusicId
      });
      
      await this.musicKitInstance.play();
      
      return searchResult.providerData.appleMusicId;
    } catch (error) {
      console.error('Apple Music playback error:', error);
      throw error;
    }
  }

  async pause(): Promise<void> {
    if (this.musicKitInstance) {
      await this.musicKitInstance.pause();
    }
  }

  async play(): Promise<void> {
    if (this.musicKitInstance) {
      await this.musicKitInstance.play();
    }
  }

  async next(): Promise<void> {
    if (this.musicKitInstance) {
      await this.musicKitInstance.skipToNextItem();
    }
  }

  async previous(): Promise<void> {
    if (this.musicKitInstance) {
      await this.musicKitInstance.skipToPreviousItem();
    }
  }

  async getPlaybackState(): Promise<PlaybackState> {
    if (!this.musicKitInstance) {
      return {
        isPlaying: false,
        currentTrack: null,
        positionMs: 0,
        durationMs: 0
      };
    }

    try {
      const nowPlaying = this.musicKitInstance.nowPlayingItem;
      const isPlaying = this.musicKitInstance.playbackState === 2; // PLAYING state
      
      return {
        isPlaying,
        currentTrack: nowPlaying ? {
          id: nowPlaying.id,
          name: nowPlaying.title || nowPlaying.attributes?.name,
          artist: nowPlaying.artistName || nowPlaying.attributes?.artistName,
          album: nowPlaying.albumName || nowPlaying.attributes?.albumName || '',
          albumArtUrl: nowPlaying.artwork?.url,
          durationMs: nowPlaying.playbackDuration * 1000
        } : null,
        positionMs: this.musicKitInstance.currentPlaybackTime * 1000,
        durationMs: this.musicKitInstance.currentPlaybackDuration * 1000
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

  async getRecommendations(_currentTrack: SearchResult, count: number = 10): Promise<TrackRecommendation[]> {
    try {
      // Use Apple Music's recommendations endpoint
      const data = await this.appleMusicFetch(
        `/me/recommendations?limit=${count}`
      );

      if (!data.data) {
        return [];
      }

      const recommendations: TrackRecommendation[] = [];
      
      for (const item of data.data) {
        if (item.type === 'personal-recommendation' && item.relationships?.contents?.data) {
          for (const content of item.relationships.contents.data) {
            if (content.type === 'songs' && recommendations.length < count) {
              recommendations.push({
                track: {
                  id: content.id,
                  title: content.attributes.name,
                  artist: content.attributes.artistName,
                  album: content.attributes.albumName,
                  thumbnailUrl: content.attributes.artwork?.url.replace('{w}', '300').replace('{h}', '300'),
                  durationMs: content.attributes.durationInMillis,
                  providerData: {
                    appleMusicId: content.id,
                    isrc: content.attributes.isrc
                  }
                },
                reason: 'Recommended by Apple Music',
                confidence: 0.8
              });
            }
          }
        }
      }

      return recommendations;
    } catch (error) {
      console.error('Error getting Apple Music recommendations:', error);
      return [];
    }
  }

  async getUserTopTracks(limit: number = 20): Promise<SearchResult[]> {
    try {
      const data = await this.appleMusicFetch(
        `/me/library/songs?limit=${limit}`
      );

      if (!data.data) {
        return [];
      }

      return data.data.map((song: any) => ({
        id: song.id,
        title: song.attributes.name,
        artist: song.attributes.artistName,
        album: song.attributes.albumName,
        thumbnailUrl: song.attributes.artwork?.url.replace('{w}', '300').replace('{h}', '300'),
        durationMs: song.attributes.durationInMillis,
        providerData: {
          appleMusicId: song.id,
          isrc: song.attributes.isrc
        }
      }));
    } catch (error) {
      console.error('Error getting user library:', error);
      return [];
    }
  }

  async getUserPlaylists(): Promise<Array<{ id: string; name: string; trackCount: number }>> {
    try {
      const data = await this.appleMusicFetch('/me/library/playlists?limit=50');

      if (!data.data) {
        return [];
      }

      return data.data.map((playlist: any) => ({
        id: playlist.id,
        name: playlist.attributes.name,
        trackCount: playlist.attributes.trackCount || 0
      }));
    } catch (error) {
      console.error('Error getting user playlists:', error);
      return [];
    }
  }

  async getPlaylistTracks(playlistId: string): Promise<SearchResult[]> {
    try {
      const data = await this.appleMusicFetch(`/me/library/playlists/${playlistId}/tracks`);

      if (!data.data) {
        return [];
      }

      return data.data.map((song: any) => ({
        id: song.id,
        title: song.attributes.name,
        artist: song.attributes.artistName,
        album: song.attributes.albumName,
        thumbnailUrl: song.attributes.artwork?.url.replace('{w}', '300').replace('{h}', '300'),
        durationMs: song.attributes.durationInMillis,
        providerData: {
          appleMusicId: song.id,
          isrc: song.attributes.isrc
        }
      }));
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
