import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { MockMusicProvider } from '../MockMusicProvider';

describe('MockMusicProvider', () => {
  let provider: MockMusicProvider;

  beforeEach(() => {
    vi.useFakeTimers();
    provider = new MockMusicProvider();
  });

  afterEach(async () => {
    await provider.signOut();
    vi.useRealTimers();
  });

  // ============ INITIALIZATION ============

  describe('initialization', () => {
    it('has correct providerId', () => {
      expect(provider.providerId).toBe('apple');
    });

    it('has correct providerName', () => {
      expect(provider.providerName).toBe('Mock Provider');
    });

    it('starts as authenticated', () => {
      expect(provider.isAuthenticated).toBe(true);
    });

    it('has 100 test tracks', async () => {
      const track1 = await provider.getTrackById('mock-1');
      const track100 = await provider.getTrackById('mock-100');
      const track101 = await provider.getTrackById('mock-101');

      expect(track1).not.toBeNull();
      expect(track1!.title).toBe('Test Track 1');
      expect(track100).not.toBeNull();
      expect(track100!.title).toBe('Test Track 100');
      expect(track101).toBeNull();
    });
  });

  // ============ SEARCH ============

  describe('searchTracks', () => {
    it('filters tracks by title query', async () => {
      const promise = provider.searchTracks('Track 50');
      await vi.advanceTimersByTimeAsync(500);
      const results = await promise;

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.title === 'Test Track 50')).toBe(true);
    });

    it('filters tracks by artist query', async () => {
      const promise = provider.searchTracks('Artist 3');
      await vi.advanceTimersByTimeAsync(500);
      const results = await promise;

      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.artist.includes('Artist 3'))).toBe(true);
    });

    it('returns max 20 results', async () => {
      const promise = provider.searchTracks('Test');
      await vi.advanceTimersByTimeAsync(500);
      const results = await promise;

      expect(results).toHaveLength(20);
    });

    it('with empty query returns first 20 tracks (all match)', async () => {
      const promise = provider.searchTracks('');
      await vi.advanceTimersByTimeAsync(500);
      const results = await promise;

      expect(results).toHaveLength(20);
      expect(results[0].id).toBe('mock-1');
    });

    it('returns empty array for non-matching query', async () => {
      const promise = provider.searchTracks('ZZZZNONEXISTENT');
      await vi.advanceTimersByTimeAsync(500);
      const results = await promise;

      expect(results).toHaveLength(0);
    });
  });

  // ============ PLAYBACK ============

  describe('playback', () => {
    it('playTrack starts playback simulation', async () => {
      const track = (await provider.getTrackById('mock-1'))!;
      const id = await provider.playTrack(track);

      expect(id).toBe('mock-1');

      const state = await provider.getPlaybackState();
      expect(state.isPlaying).toBe(true);
      expect(state.currentTrack).not.toBeNull();
      expect(state.currentTrack!.name).toBe('Test Track 1');
      expect(state.positionMs).toBe(0);
    });

    it('pause stops playback', async () => {
      const track = (await provider.getTrackById('mock-1'))!;
      await provider.playTrack(track);
      await provider.pause();

      const state = await provider.getPlaybackState();
      expect(state.isPlaying).toBe(false);
    });

    it('play resumes playback after pause', async () => {
      const track = (await provider.getTrackById('mock-1'))!;
      await provider.playTrack(track);
      await provider.pause();
      await provider.play();

      const state = await provider.getPlaybackState();
      expect(state.isPlaying).toBe(true);
    });

    it('pause/play toggles playback state', async () => {
      const track = (await provider.getTrackById('mock-1'))!;
      await provider.playTrack(track);
      expect((await provider.getPlaybackState()).isPlaying).toBe(true);

      await provider.pause();
      expect((await provider.getPlaybackState()).isPlaying).toBe(false);

      await provider.play();
      expect((await provider.getPlaybackState()).isPlaying).toBe(true);
    });
  });

  // ============ NAVIGATION ============

  describe('navigation', () => {
    it('next() advances to the next track', async () => {
      const track = (await provider.getTrackById('mock-1'))!;
      await provider.playTrack(track);
      await provider.next();

      const state = await provider.getPlaybackState();
      expect(state.currentTrack!.name).toBe('Test Track 2');
    });

    it('previous() goes to the previous track', async () => {
      const track = (await provider.getTrackById('mock-3'))!;
      await provider.playTrack(track);
      await provider.previous();

      const state = await provider.getPlaybackState();
      expect(state.currentTrack!.name).toBe('Test Track 2');
    });

    it('next() wraps from last to first track', async () => {
      const track = (await provider.getTrackById('mock-100'))!;
      await provider.playTrack(track);
      await provider.next();

      const state = await provider.getPlaybackState();
      expect(state.currentTrack!.name).toBe('Test Track 1');
    });

    it('previous() wraps from first to last track', async () => {
      const track = (await provider.getTrackById('mock-1'))!;
      await provider.playTrack(track);
      await provider.previous();

      const state = await provider.getPlaybackState();
      expect(state.currentTrack!.name).toBe('Test Track 100');
    });

    it('next/previous do nothing without a current track', async () => {
      await provider.next();
      await provider.previous();

      const state = await provider.getPlaybackState();
      expect(state.currentTrack).toBeNull();
    });
  });

  // ============ PLAYBACK STATE ============

  describe('getPlaybackState', () => {
    it('returns default state when nothing is playing', async () => {
      const state = await provider.getPlaybackState();

      expect(state.isPlaying).toBe(false);
      expect(state.currentTrack).toBeNull();
      expect(state.positionMs).toBe(0);
      expect(state.durationMs).toBe(0);
    });

    it('returns correct duration for current track', async () => {
      const track = (await provider.getTrackById('mock-1'))!;
      await provider.playTrack(track);

      const state = await provider.getPlaybackState();
      expect(state.durationMs).toBe(track.durationMs);
    });

    it('position advances with playback simulation', async () => {
      const track = (await provider.getTrackById('mock-1'))!;
      await provider.playTrack(track);

      await vi.advanceTimersByTimeAsync(3000);

      const state = await provider.getPlaybackState();
      expect(state.positionMs).toBe(3000);
    });
  });

  // ============ RECOMMENDATIONS ============

  describe('getRecommendations', () => {
    it('returns recommendations for a track', async () => {
      const track = (await provider.getTrackById('mock-1'))!;
      const promise = provider.getRecommendations(track);
      await vi.advanceTimersByTimeAsync(300);
      const recs = await promise;

      expect(recs.length).toBeGreaterThan(0);
      expect(recs.length).toBeLessThanOrEqual(5);
    });

    it('does not include the current track in recommendations', async () => {
      const track = (await provider.getTrackById('mock-1'))!;
      const promise = provider.getRecommendations(track);
      await vi.advanceTimersByTimeAsync(300);
      const recs = await promise;

      recs.forEach(rec => {
        expect(rec.track.id).not.toBe('mock-1');
      });
    });

    it('each recommendation has reason and confidence', async () => {
      const track = (await provider.getTrackById('mock-1'))!;
      const promise = provider.getRecommendations(track);
      await vi.advanceTimersByTimeAsync(300);
      const recs = await promise;

      recs.forEach(rec => {
        expect(rec.reason).toBeDefined();
        expect(rec.confidence).toBeGreaterThanOrEqual(0.8);
        expect(rec.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  // ============ PLAYLISTS ============

  describe('playlists', () => {
    it('getUserPlaylists returns mock playlists', async () => {
      const promise = provider.getUserPlaylists();
      await vi.advanceTimersByTimeAsync(400);
      const playlists = await promise;

      expect(playlists).toHaveLength(3);
      expect(playlists[0]).toEqual({
        id: 'mock-playlist-1',
        name: 'Mock Favorites',
        trackCount: 25,
      });
    });

    it('getPlaylistTracks returns tracks for a playlist', async () => {
      const tracks = await provider.getPlaylistTracks('mock-playlist-1');

      expect(tracks).toHaveLength(20);
      expect(tracks[0].id).toBe('mock-1');
    });
  });

  // ============ AUTHENTICATION ============

  describe('authentication', () => {
    it('authenticate succeeds and returns requiresOAuth: false', async () => {
      const result = await provider.authenticate();

      expect(result.success).toBe(true);
      expect(result.requiresOAuth).toBe(false);
      expect(provider.isAuthenticated).toBe(true);
    });

    it('handleOAuthCallback succeeds', async () => {
      const result = await provider.handleOAuthCallback('http://callback.url');

      expect(result).toBe(true);
      expect(provider.isAuthenticated).toBe(true);
    });

    it('signOut resets authentication and stops playback', async () => {
      const track = (await provider.getTrackById('mock-1'))!;
      await provider.playTrack(track);

      await provider.signOut();

      expect(provider.isAuthenticated).toBe(false);
      const state = await provider.getPlaybackState();
      expect(state.isPlaying).toBe(false);
      expect(state.currentTrack).toBeNull();
      expect(state.positionMs).toBe(0);
    });

    it('isConnected reflects authentication state', async () => {
      expect(provider.isConnected()).toBe(true);

      await provider.signOut();
      expect(provider.isConnected()).toBe(false);
    });
  });

  // ============ toTrack ============

  describe('toTrack', () => {
    it('converts SearchResult to Track', async () => {
      const searchResult = (await provider.getTrackById('mock-1'))!;
      const track = provider.toTrack(searchResult);

      expect(track).toEqual({
        id: 'mock-1',
        name: 'Test Track 1',
        artist: 'Test Artist 1',
        album: 'Test Album 1',
        durationMs: searchResult.durationMs,
        albumArtUrl: searchResult.thumbnailUrl,
      });
    });
  });

  // ============ AUTO-ADVANCE ============

  describe('auto-advance', () => {
    it('advances to next track when current track ends', async () => {
      const track = (await provider.getTrackById('mock-1'))!;
      await provider.playTrack(track);

      // Seek near end (track duration is (180 + 0*3)*1000 = 180000ms)
      await provider.seek(track.durationMs! - 1000);

      // Advance 1 second — position reaches durationMs, triggers auto-advance
      await vi.advanceTimersByTimeAsync(1000);

      const state = await provider.getPlaybackState();
      expect(state.currentTrack!.name).toBe('Test Track 2');
      expect(state.isPlaying).toBe(true);
    });
  });

  // ============ OTHER METHODS ============

  describe('getUserTopTracks', () => {
    it('returns first 10 tracks', async () => {
      const promise = provider.getUserTopTracks();
      await vi.advanceTimersByTimeAsync(400);
      const tracks = await promise;

      expect(tracks).toHaveLength(10);
      expect(tracks[0].id).toBe('mock-1');
      expect(tracks[9].id).toBe('mock-10');
    });
  });

  describe('seek', () => {
    it('updates playback position', async () => {
      const track = (await provider.getTrackById('mock-1'))!;
      await provider.playTrack(track);
      await provider.seek(45000);

      const state = await provider.getPlaybackState();
      expect(state.positionMs).toBe(45000);
    });
  });

  describe('getTrackById', () => {
    it('returns track for valid id', async () => {
      const track = await provider.getTrackById('mock-50');

      expect(track).not.toBeNull();
      expect(track!.id).toBe('mock-50');
      expect(track!.title).toBe('Test Track 50');
    });

    it('returns null for invalid id', async () => {
      const track = await provider.getTrackById('nonexistent');
      expect(track).toBeNull();
    });
  });
});
