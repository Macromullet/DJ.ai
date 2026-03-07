import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AppleMusicProvider } from '../AppleMusicProvider';

// ============ MusicKit Mock Helpers ============

function createMockMusicKitInstance() {
  return {
    authorize: vi.fn().mockResolvedValue('mock-user-token'),
    unauthorize: vi.fn().mockResolvedValue(undefined),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn().mockResolvedValue(undefined),
    skipToNextItem: vi.fn().mockResolvedValue(undefined),
    skipToPreviousItem: vi.fn().mockResolvedValue(undefined),
    setQueue: vi.fn().mockResolvedValue(undefined),
    nowPlayingItem: null as any,
    playbackState: 0,
    musicUserToken: '',
    currentPlaybackTime: 0,
    currentPlaybackDuration: 0,
  };
}

/** Flush microtasks so fire-and-forget async init completes */
async function flushMicrotasks() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

// ============ Tests ============

describe('AppleMusicProvider', () => {
  let mockInstance: ReturnType<typeof createMockMusicKitInstance>;
  let mockMusicKit: { configure: ReturnType<typeof vi.fn>; getInstance: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockInstance = createMockMusicKitInstance();
    mockMusicKit = {
      configure: vi.fn().mockResolvedValue(undefined),
      getInstance: vi.fn().mockReturnValue(mockInstance),
    };
    (window as any).MusicKit = mockMusicKit;
  });

  afterEach(() => {
    delete (window as any).MusicKit;
  });

  // ============ CONSTRUCTOR ============

  describe('constructor', () => {
    it('initializes with correct providerId', () => {
      const provider = new AppleMusicProvider();
      expect(provider.providerId).toBe('apple');
    });

    it('has correct providerName', () => {
      const provider = new AppleMusicProvider();
      expect(provider.providerName).toBe('Apple Music');
    });

    it('isAuthenticated starts as false', () => {
      const provider = new AppleMusicProvider();
      expect(provider.isAuthenticated).toBe(false);
    });

    it('creates device token in localStorage if missing', () => {
      new AppleMusicProvider();
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'djai_device_token',
        expect.any(String),
      );
    });

    it('reuses existing device token from localStorage', () => {
      localStorage.setItem('djai_device_token', 'existing-device-token');
      vi.mocked(localStorage.setItem).mockClear();

      new AppleMusicProvider();

      const deviceTokenSets = vi.mocked(localStorage.setItem).mock.calls
        .filter(([key]) => key === 'djai_device_token');
      expect(deviceTokenSets).toHaveLength(0);
    });
  });

  // ============ TOKEN PERSISTENCE ============

  describe('token persistence', () => {
    it('loads saved tokens from localStorage on init', async () => {
      localStorage.setItem('djai_apple_developer_token', 'saved-dev-token');
      localStorage.setItem('djai_apple_user_token', 'saved-user-token');

      const provider = new AppleMusicProvider();
      await flushMicrotasks();

      expect(provider.isAuthenticated).toBe(true);
    });

    it('configures MusicKit when developer token exists on init', async () => {
      localStorage.setItem('djai_apple_developer_token', 'saved-dev-token');
      localStorage.setItem('djai_apple_user_token', 'saved-user-token');

      new AppleMusicProvider();
      await flushMicrotasks();

      expect(mockMusicKit.configure).toHaveBeenCalledWith(
        expect.objectContaining({ developerToken: 'saved-dev-token' }),
      );
    });

    it('sets musicUserToken on MusicKit instance when loaded from storage', async () => {
      localStorage.setItem('djai_apple_developer_token', 'saved-dev-token');
      localStorage.setItem('djai_apple_user_token', 'saved-user-token');

      new AppleMusicProvider();
      await flushMicrotasks();

      expect(mockInstance.musicUserToken).toBe('saved-user-token');
    });
  });

  // ============ AUTHENTICATE ============

  describe('authenticate()', () => {
    let provider: AppleMusicProvider;

    beforeEach(async () => {
      provider = new AppleMusicProvider();
      await flushMicrotasks();
      vi.mocked(fetch).mockClear();
      vi.mocked(localStorage.setItem).mockClear();
    });

    function mockDevTokenFetch(token = 'new-dev-token') {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: () => Promise.resolve({ developerToken: token }),
      } as Response);
    }

    it('fetches developer token from backend', async () => {
      mockDevTokenFetch();
      await provider.authenticate();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/oauth/apple/developer-token'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Device-Token': expect.any(String),
          }),
        }),
      );
    });

    it('configures MusicKit with fetched developer token', async () => {
      mockDevTokenFetch('fetched-token');
      await provider.authenticate();

      expect(mockMusicKit.configure).toHaveBeenCalledWith(
        expect.objectContaining({ developerToken: 'fetched-token' }),
      );
    });

    it('calls MusicKit.authorize()', async () => {
      mockDevTokenFetch();
      await provider.authenticate();

      expect(mockInstance.authorize).toHaveBeenCalled();
    });

    it('stores tokens in localStorage on success', async () => {
      mockDevTokenFetch('stored-dev-token');
      const result = await provider.authenticate();

      expect(result.success).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'djai_apple_developer_token', 'stored-dev-token',
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'djai_apple_user_token', 'mock-user-token',
      );
    });

    it('sets isAuthenticated to true on success', async () => {
      mockDevTokenFetch();
      await provider.authenticate();

      expect(provider.isAuthenticated).toBe(true);
    });

    it('returns success: false on backend fetch error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        json: () => Promise.resolve({ message: 'Server error' }),
      } as Response);

      const result = await provider.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns success: true if already authenticated', async () => {
      // Pre-authenticate
      localStorage.setItem('djai_apple_developer_token', 'dev');
      localStorage.setItem('djai_apple_user_token', 'user');
      const preAuthProvider = new AppleMusicProvider();
      await flushMicrotasks();

      vi.mocked(fetch).mockClear();
      const result = await preAuthProvider.authenticate();

      expect(result.success).toBe(true);
      // Should not have fetched a new developer token
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  // ============ HANDLE OAUTH CALLBACK ============

  describe('handleOAuthCallback()', () => {
    it('returns false (Apple uses MusicKit auth, not standard OAuth)', async () => {
      const provider = new AppleMusicProvider();
      const result = await provider.handleOAuthCallback('http://localhost/callback?code=abc');

      expect(result).toBe(false);
    });
  });

  // ============ SIGN OUT ============

  describe('signOut()', () => {
    let provider: AppleMusicProvider;

    beforeEach(async () => {
      localStorage.setItem('djai_apple_developer_token', 'dev-token');
      localStorage.setItem('djai_apple_user_token', 'user-token');
      provider = new AppleMusicProvider();
      await flushMicrotasks();
      vi.mocked(localStorage.removeItem).mockClear();
    });

    it('calls MusicKit unauthorize()', async () => {
      await provider.signOut();
      expect(mockInstance.unauthorize).toHaveBeenCalled();
    });

    it('clears tokens from localStorage', async () => {
      await provider.signOut();

      expect(localStorage.removeItem).toHaveBeenCalledWith('djai_apple_developer_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('djai_apple_user_token');
    });

    it('sets isAuthenticated to false', async () => {
      expect(provider.isAuthenticated).toBe(true);
      await provider.signOut();
      expect(provider.isAuthenticated).toBe(false);
    });
  });

  // ============ SEARCH TRACKS ============

  describe('searchTracks()', () => {
    let provider: AppleMusicProvider;

    const mockSongData = [
      {
        id: 'song-1',
        attributes: {
          name: 'Test Song',
          artistName: 'Test Artist',
          albumName: 'Test Album',
          artwork: { url: 'https://example.com/{w}x{h}.jpg' },
          durationInMillis: 240000,
          isrc: 'USTEST001',
          previews: [{ url: 'https://example.com/preview.mp3' }],
        },
      },
    ];

    beforeEach(async () => {
      localStorage.setItem('djai_apple_developer_token', 'test-dev-token');
      localStorage.setItem('djai_apple_user_token', 'test-user-token');
      provider = new AppleMusicProvider();
      await flushMicrotasks();
      vi.mocked(fetch).mockClear();
    });

    it('constructs correct Apple Music API query', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: { songs: { data: [] } } }),
      } as any);

      await provider.searchTracks('hello world', 15);

      expect(fetch).toHaveBeenCalledWith(
        'https://api.music.apple.com/v1/catalog/us/search?term=hello%20world&types=songs&limit=15',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-dev-token',
            'Music-User-Token': 'test-user-token',
          }),
        }),
      );
    });

    it('uses default limit of 10', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: { songs: { data: [] } } }),
      } as any);

      await provider.searchTracks('test');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object),
      );
    });

    it('maps MusicKit results to SearchResult format', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: { songs: { data: mockSongData } } }),
      } as any);

      const results = await provider.searchTracks('test');

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: 'song-1',
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        thumbnailUrl: 'https://example.com/300x300.jpg',
        durationMs: 240000,
        providerData: {
          appleMusicId: 'song-1',
          isrc: 'USTEST001',
          previewUrl: 'https://example.com/preview.mp3',
        },
      });
    });

    it('returns empty array when no songs in response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: {} }),
      } as any);

      const results = await provider.searchTracks('nonexistent');
      expect(results).toEqual([]);
    });

    it('returns empty array on API error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden',
      } as any);

      const results = await provider.searchTracks('test');
      expect(results).toEqual([]);
    });
  });

  // ============ PLAYBACK METHODS ============

  describe('playback methods (with MusicKit instance)', () => {
    let provider: AppleMusicProvider;

    const mockSearchResult = {
      id: 'song-1',
      title: 'Test Song',
      artist: 'Test Artist',
      providerData: { appleMusicId: 'apple-song-1' },
    } as any;

    beforeEach(async () => {
      localStorage.setItem('djai_apple_developer_token', 'dev-token');
      localStorage.setItem('djai_apple_user_token', 'user-token');
      provider = new AppleMusicProvider();
      await flushMicrotasks();
    });

    it('playTrack calls setQueue and play on MusicKit', async () => {
      const result = await provider.playTrack(mockSearchResult);

      expect(mockInstance.setQueue).toHaveBeenCalledWith({ song: 'apple-song-1' });
      expect(mockInstance.play).toHaveBeenCalled();
      expect(result).toBe('apple-song-1');
    });

    it('pause calls MusicKit pause', async () => {
      await provider.pause();
      expect(mockInstance.pause).toHaveBeenCalled();
    });

    it('play calls MusicKit play', async () => {
      await provider.play();
      expect(mockInstance.play).toHaveBeenCalled();
    });

    it('next calls MusicKit skipToNextItem', async () => {
      await provider.next();
      expect(mockInstance.skipToNextItem).toHaveBeenCalled();
    });

    it('previous calls MusicKit skipToPreviousItem', async () => {
      await provider.previous();
      expect(mockInstance.skipToPreviousItem).toHaveBeenCalled();
    });
  });

  // ============ PLAYBACK STATE ============

  describe('getPlaybackState()', () => {
    it('returns default state when MusicKit instance is not set', async () => {
      const provider = new AppleMusicProvider();
      await flushMicrotasks();

      const state = await provider.getPlaybackState();

      expect(state).toEqual({
        isPlaying: false,
        currentTrack: null,
        positionMs: 0,
        durationMs: 0,
      });
    });

    it('returns current MusicKit playback state', async () => {
      localStorage.setItem('djai_apple_developer_token', 'dev-token');
      localStorage.setItem('djai_apple_user_token', 'user-token');
      const provider = new AppleMusicProvider();
      await flushMicrotasks();

      // Simulate active playback
      mockInstance.playbackState = 2; // PLAYING
      mockInstance.nowPlayingItem = {
        id: 'now-1',
        title: 'Now Playing',
        artistName: 'NP Artist',
        albumName: 'NP Album',
        artwork: { url: 'https://art.url' },
        playbackDuration: 240,
      };
      mockInstance.currentPlaybackTime = 60;
      mockInstance.currentPlaybackDuration = 240;

      const state = await provider.getPlaybackState();

      expect(state.isPlaying).toBe(true);
      expect(state.currentTrack).toEqual({
        id: 'now-1',
        name: 'Now Playing',
        artist: 'NP Artist',
        album: 'NP Album',
        albumArtUrl: 'https://art.url',
        durationMs: 240000,
      });
      expect(state.positionMs).toBe(60000);
      expect(state.durationMs).toBe(240000);
    });

    it('handles no now-playing item gracefully', async () => {
      localStorage.setItem('djai_apple_developer_token', 'dev-token');
      localStorage.setItem('djai_apple_user_token', 'user-token');
      const provider = new AppleMusicProvider();
      await flushMicrotasks();

      mockInstance.playbackState = 0;
      mockInstance.nowPlayingItem = null;

      const state = await provider.getPlaybackState();

      expect(state.isPlaying).toBe(false);
      expect(state.currentTrack).toBeNull();
    });
  });

  // ============ WITHOUT MUSICKIT INSTANCE (GRACEFUL HANDLING) ============

  describe('handles missing MusicKit instance gracefully', () => {
    let provider: AppleMusicProvider;

    beforeEach(async () => {
      // No tokens → musicKitInstance never configured
      provider = new AppleMusicProvider();
      await flushMicrotasks();
    });

    it('playTrack throws MusicKit not ready', async () => {
      await expect(
        provider.playTrack({ id: '1', title: 'T', artist: 'A', providerData: { appleMusicId: '1' } }),
      ).rejects.toThrow('MusicKit not ready');
    });

    it('pause completes without error', async () => {
      await expect(provider.pause()).resolves.toBeUndefined();
    });

    it('play completes without error', async () => {
      await expect(provider.play()).resolves.toBeUndefined();
    });

    it('next completes without error', async () => {
      await expect(provider.next()).resolves.toBeUndefined();
    });

    it('previous completes without error', async () => {
      await expect(provider.previous()).resolves.toBeUndefined();
    });

    it('searchTracks returns empty on missing developer token', async () => {
      const results = await provider.searchTracks('test');
      expect(results).toEqual([]);
    });
  });

  // ============ toTrack ============

  describe('toTrack()', () => {
    it('converts SearchResult to Track', () => {
      const provider = new AppleMusicProvider();
      const result = provider.toTrack({
        id: 'song-1',
        title: 'Song Title',
        artist: 'Song Artist',
        album: 'Song Album',
        thumbnailUrl: 'https://art.url',
        durationMs: 300000,
        providerData: {},
      });

      expect(result).toEqual({
        id: 'song-1',
        name: 'Song Title',
        artist: 'Song Artist',
        album: 'Song Album',
        albumArtUrl: 'https://art.url',
        durationMs: 300000,
      });
    });

    it('handles missing optional fields', () => {
      const provider = new AppleMusicProvider();
      const result = provider.toTrack({
        id: 'song-1',
        title: 'Song Title',
        artist: 'Song Artist',
        providerData: {},
      });

      expect(result.album).toBe('');
      expect(result.durationMs).toBe(0);
    });
  });
});
