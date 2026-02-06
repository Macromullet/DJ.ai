/**
 * Unified Music Provider Interface
 * 
 * All music services (YouTube Music, Spotify, Apple Music) implement this interface
 * to provide consistent functionality across different platforms.
 */

import { Track } from './index';

export interface AuthenticationResult {
  success: boolean;
  error?: string;
  requiresOAuth?: boolean;
  oauthUrl?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  artist: string;
  album?: string;
  thumbnailUrl?: string;
  durationMs?: number;
  /**
   * Provider-specific data that can be used to play the track
   * e.g., YouTube video ID, Spotify URI, Apple Music ID
   */
  providerData: any;
}

export interface TrackRecommendation {
  track: SearchResult;
  reason: string;
  confidence: number; // 0-1
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTrack: Track | null;
  positionMs: number;
  durationMs: number;
}

/**
 * Main interface that all music providers must implement
 */
export interface IMusicProvider {
  /**
   * Unique identifier for this provider
   */
  readonly providerId: 'youtube' | 'spotify' | 'apple';
  
  /**
   * Display name for the provider
   */
  readonly providerName: string;

  /**
   * Whether the provider is currently authenticated
   */
  isAuthenticated: boolean;

  // ============ AUTHENTICATION ============
  
  /**
   * Initiate OAuth flow or check existing authentication
   * Returns OAuth URL if user needs to authenticate
   */
  authenticate(): Promise<AuthenticationResult>;

  /**
   * Handle OAuth callback (called after user completes OAuth flow)
   */
  handleOAuthCallback(callbackUrl: string): Promise<boolean>;

  /**
   * Sign out and clear credentials
   */
  signOut(): Promise<void>;

  // ============ SEARCH ============

  /**
   * Search for tracks by query string
   */
  searchTracks(query: string, limit?: number): Promise<SearchResult[]>;

  /**
   * Get track details by provider-specific ID
   */
  getTrackById(id: string): Promise<SearchResult | null>;

  // ============ PLAYBACK ============

  /**
   * Play a track
   * Returns the playback URL or token needed to play
   */
  playTrack(searchResult: SearchResult): Promise<string>;

  /**
   * Pause current playback
   */
  pause(): Promise<void>;

  /**
   * Resume playback
   */
  play(): Promise<void>;

  /**
   * Skip to next track
   */
  next(): Promise<void>;

  /**
   * Go to previous track
   */
  previous(): Promise<void>;

  /**
   * Get current playback state
   */
  getPlaybackState(): Promise<PlaybackState>;

  // ============ RECOMMENDATIONS ============

  /**
   * Get AI-powered track recommendations based on current track
   * Providers can use their own recommendation algorithms or fall back to generic AI
   */
  getRecommendations(currentTrack: SearchResult, count?: number): Promise<TrackRecommendation[]>;

  /**
   * Get user's top tracks (for personalization)
   */
  getUserTopTracks(limit?: number): Promise<SearchResult[]>;

  /**
   * Get user's playlists
   */
  getUserPlaylists(): Promise<Array<{ id: string; name: string; trackCount: number }>>;

  /**
   * Get tracks from a playlist
   */
  getPlaylistTracks(playlistId: string): Promise<SearchResult[]>;

  // ============ UTILITIES ============

  /**
   * Convert SearchResult to Track (for compatibility with existing code)
   */
  toTrack(searchResult: SearchResult): Track;
}


