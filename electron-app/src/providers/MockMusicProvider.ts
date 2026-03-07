import { IMusicProvider, SearchResult, AuthenticationResult, TrackRecommendation, PlaybackState } from '../types/IMusicProvider';
import type { Track } from '../types';

// Generate gradient thumbnail URLs using different hues
const generateGradientThumbnail = (index: number): string => {
  const hue1 = (index * 37) % 360; // Primary hue
  const hue2 = (hue1 + 60) % 360;  // Complementary hue
  const saturation = 70 + (index % 30);
  const lightness = 45 + (index % 20);
  
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg width="120" height="120" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad${index}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:hsl(${hue1},${saturation}%,${lightness}%);stop-opacity:1" />
          <stop offset="100%" style="stop-color:hsl(${hue2},${saturation}%,${lightness - 10}%);stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" fill="url(#grad${index})" />
      <text x="60" y="65" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="middle" opacity="0.9">♪</text>
      <text x="60" y="95" font-family="Arial, sans-serif" font-size="12" fill="white" text-anchor="middle" opacity="0.7">${index + 1}</text>
    </svg>
  `)}`;
};

// Generate 100 test tracks with colorful gradient thumbnails
const MOCK_TRACKS: SearchResult[] = Array.from({ length: 100 }, (_, i) => ({
  id: `mock-${i + 1}`,
  title: `Test Track ${i + 1}`,
  artist: `Test Artist ${Math.floor(i / 10) + 1}`,
  album: `Test Album ${Math.floor(i / 5) + 1}`,
  durationMs: (180 + (i * 3)) * 1000, // 3-8 minutes in ms
  thumbnailUrl: generateGradientThumbnail(i),
  providerData: { mockId: i + 1 },
}));

export class MockMusicProvider implements IMusicProvider {
  providerId: 'spotify' | 'apple' = 'apple'; // Mock as Apple for tests
  providerName = 'Mock Provider';
  isAuthenticated = true; // Auto-authenticated in test mode
  private currentTrack: SearchResult | null = null;
  private isPlaying = false;
  private currentPositionMs = 0;
  private playbackInterval: ReturnType<typeof setInterval> | null = null;

  // OAuth methods
  async authenticate(): Promise<AuthenticationResult> {
    console.log('[MOCK] Authenticating...');
    this.isAuthenticated = true;
    return {
      success: true,
      requiresOAuth: false,
    };
  }

  async handleOAuthCallback(callbackUrl: string): Promise<boolean> {
    console.log('[MOCK] OAuth callback:', callbackUrl);
    this.isAuthenticated = true;
    return true;
  }

  async signOut(): Promise<void> {
    console.log('[MOCK] Signing out');
    this.isAuthenticated = false;
    this.stop();
  }

  isConnected(): boolean {
    return this.isAuthenticated;
  }

  // Music search
  async searchTracks(query: string): Promise<SearchResult[]> {
    console.log('[MOCK] Searching for:', query);
    await this.delay(500); // Simulate network delay
    
    const lowerQuery = query.toLowerCase();
    const results = MOCK_TRACKS.filter(track =>
      track.title.toLowerCase().includes(lowerQuery) ||
      track.artist.toLowerCase().includes(lowerQuery) ||
      (track.album && track.album.toLowerCase().includes(lowerQuery))
    );

    return results.slice(0, 20); // Return max 20 results
  }

  // Playback control
  async playTrack(result: SearchResult): Promise<string> {
    console.log('[MOCK] Playing track:', result.title);
    this.currentTrack = result;
    this.currentPositionMs = 0;
    this.isPlaying = true;
    
    this.startPlaybackSimulation();
    
    return result.id;
  }

  async pause(): Promise<void> {
    console.log('[MOCK] Pausing playback');
    this.isPlaying = false;
    this.stopPlaybackSimulation();
  }

  async play(): Promise<void> {
    console.log('[MOCK] Resuming playback');
    this.isPlaying = true;
    this.startPlaybackSimulation();
  }

  async next(): Promise<void> {
    if (!this.currentTrack) return;
    
    const currentIndex = MOCK_TRACKS.findIndex(t => t.id === this.currentTrack!.id);
    const nextTrack = MOCK_TRACKS[(currentIndex + 1) % MOCK_TRACKS.length];
    
    console.log('[MOCK] Next track:', nextTrack.title);
    await this.playTrack(nextTrack);
  }

  async previous(): Promise<void> {
    if (!this.currentTrack) return;
    
    const currentIndex = MOCK_TRACKS.findIndex(t => t.id === this.currentTrack!.id);
    const prevTrack = MOCK_TRACKS[(currentIndex - 1 + MOCK_TRACKS.length) % MOCK_TRACKS.length];
    
    console.log('[MOCK] Previous track:', prevTrack.title);
    await this.playTrack(prevTrack);
  }

  async seek(positionMs: number): Promise<void> {
    console.log('[MOCK] Seeking to:', positionMs);
    this.currentPositionMs = positionMs;
  }

  async setVolume(_volume: number): Promise<void> {
    console.log('[MOCK] Setting volume:', _volume);
  }

  // Required methods
  async getTrackById(trackId: string): Promise<SearchResult | null> {
    return MOCK_TRACKS.find(t => t.id === trackId) || null;
  }

  async getPlaylistTracks(_playlistId: string): Promise<SearchResult[]> {
    // Return first 20 tracks as playlist
    return MOCK_TRACKS.slice(0, 20);
  }

  // Recommendations
  async getRecommendations(track: SearchResult): Promise<TrackRecommendation[]> {
    console.log('[MOCK] Getting recommendations for:', track.title);
    await this.delay(300);
    
    // Return tracks from the same "artist" (every 10 tracks share an artist)
    const trackNum = parseInt(track.id.replace('mock-', ''));
    const artistGroup = Math.floor((trackNum - 1) / 10);
    
    const recommendations = MOCK_TRACKS
      .filter(t => {
        const tNum = parseInt(t.id.replace('mock-', ''));
        return Math.floor((tNum - 1) / 10) === artistGroup && t.id !== track.id;
      })
      .slice(0, 5)
      .map(t => ({
        track: t,
        reason: `Similar to ${track.title}`,
        confidence: 0.8 + Math.random() * 0.2,
      }));

    return recommendations;
  }

  async getUserTopTracks(): Promise<SearchResult[]> {
    console.log('[MOCK] Getting top tracks');
    await this.delay(400);
    
    // Return first 10 tracks as "top tracks"
    return MOCK_TRACKS.slice(0, 10);
  }

  async getUserPlaylists(): Promise<any[]> {
    console.log('[MOCK] Getting playlists');
    await this.delay(400);
    
    return [
      { id: 'mock-playlist-1', name: 'Mock Favorites', trackCount: 25 },
      { id: 'mock-playlist-2', name: 'Mock Chill Vibes', trackCount: 40 },
      { id: 'mock-playlist-3', name: 'Mock Workout', trackCount: 30 },
    ];
  }

  // Playback state
  async getPlaybackState(): Promise<PlaybackState> {
    return {
      isPlaying: this.isPlaying,
      currentTrack: this.currentTrack ? this.toTrack(this.currentTrack) : null,
      positionMs: this.currentPositionMs,
      durationMs: this.currentTrack?.durationMs || 0,
    };
  }

  // Conversion helper (for compatibility)
  toTrack(result: SearchResult): Track {
    return {
      id: result.id,
      name: result.title,
      artist: result.artist,
      album: result.album || '',
      durationMs: result.durationMs || 0,
      albumArtUrl: result.thumbnailUrl || '',
    };
  }

  // Private helpers
  private startPlaybackSimulation() {
    this.stopPlaybackSimulation();
    
    this.playbackInterval = setInterval(() => {
      if (this.isPlaying && this.currentTrack) {
        this.currentPositionMs += 1000; // Increment by 1 second
        
        // Auto-advance when track ends
        if (this.currentPositionMs >= (this.currentTrack.durationMs || 0)) {
          this.next();
        }
      }
    }, 1000);
  }

  private stopPlaybackSimulation() {
    if (this.playbackInterval) {
      clearInterval(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  private stop() {
    this.isPlaying = false;
    this.currentTrack = null;
    this.currentPositionMs = 0;
    this.stopPlaybackSimulation();
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export a singleton instance
export const mockProvider = new MockMusicProvider();
