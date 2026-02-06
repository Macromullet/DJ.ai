/**
 * Provider Architecture Documentation
 * 
 * This folder contains implementations of the IMusicProvider interface for each music service.
 * 
 * Current Providers:
 * - MockMusicProvider: Test provider with 100 mock tracks
 * - YouTubeMusicProvider: YouTube Data API v3 + YouTube IFrame Player
 * - SpotifyProvider: Spotify Web API + Web Playback SDK
 * - AppleMusicProvider: Apple MusicKit JS + Apple Music API
 * 
 * Each provider handles its own OAuth flow and API interactions.
 */

export { YouTubeMusicProvider } from './YouTubeMusicProvider';
export { MockMusicProvider, mockProvider } from './MockMusicProvider';
export { SpotifyProvider } from './SpotifyProvider';
export { AppleMusicProvider } from './AppleMusicProvider';
