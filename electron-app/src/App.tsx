import { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { IMusicProvider, SearchResult } from './types/IMusicProvider';
import { Track } from './types';
import { YouTubeMusicProvider } from './providers/YouTubeMusicProvider';
import { SpotifyProvider } from './providers/SpotifyProvider';
import { AppleMusicProvider } from './providers/AppleMusicProvider';
import { Settings, SettingsConfig } from './components/Settings';
import { saveApiKeys, getApiKeys } from './utils/secretStorage';
import { OAuthCallback } from './components/OAuthCallback';
import TestModeIndicator from './components/TestModeIndicator';
import { TrackProgressBar } from './components/TrackProgressBar';
import { VolumeControl } from './components/VolumeControl';
import { OnboardingWizard } from './components/OnboardingWizard';
const AudioVisualizer = lazy(() => import('./components/AudioVisualizer').then(m => ({ default: m.AudioVisualizer })));
import { getMusicProvider, getTTSService, getAICommentaryService, container } from './config/container';
import { isTestMode } from './config/testMode';
import './App.css';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

function MainApp() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [djCommentary, setDjCommentary] = useState(
    'Welcome to DJ.ai! Connect a music provider to get started. 🎵'
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [settings, setSettings] = useState<SettingsConfig>(() => {
    const saved = localStorage.getItem('djAiSettings');
    const base: SettingsConfig = saved ? JSON.parse(saved) : {
      currentProvider: isTestMode() ? 'youtube' : 'youtube',
      providers: {
        youtube: { isConnected: isTestMode() },
        spotify: { isConnected: false },
        apple: { isConnected: false }
      },
      aiProvider: 'openai',
      openaiApiKey: '',
      anthropicApiKey: '',
      elevenLabsApiKey: '',
      geminiApiKey: '',
      ttsEnabled: false,
      ttsProvider: 'web-speech',
      ttsVoice: 'onyx',
      autoDJMode: false
    };
    return base;
  });

  // Onboarding wizard state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    () => !localStorage.getItem('djai_onboarding_complete')
  );

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem('djai_onboarding_complete', 'true');
    setShowOnboarding(false);
  }, []);

  // Load API keys asynchronously (safeStorage is async in Electron)
  useEffect(() => {
    getApiKeys().then(secrets => {
      setSettings(prev => ({
        ...prev,
        openaiApiKey: secrets.openaiApiKey || prev.openaiApiKey,
        anthropicApiKey: secrets.anthropicApiKey || prev.anthropicApiKey,
        elevenLabsApiKey: secrets.elevenLabsApiKey || prev.elevenLabsApiKey,
        geminiApiKey: secrets.geminiApiKey || prev.geminiApiKey,
      }));
    });
  }, []);

  // Provider instances
  const providers = useRef<Map<string, IMusicProvider>>(new Map());
  const currentProvider = useRef<IMusicProvider | null>(null);
  const playerRef = useRef<any>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);

  // Refs to avoid stale closures inside YouTube player event handlers
  const autoDJModeRef = useRef(settings.autoDJMode);
  const ttsEnabledRef = useRef(settings.ttsEnabled);
  const isTransitioningRef = useRef(false);
  const playlistRef = useRef(playlist);
  const currentTrackRef = useRef(currentTrack);

  useEffect(() => { autoDJModeRef.current = settings.autoDJMode; }, [settings.autoDJMode]);
  useEffect(() => { ttsEnabledRef.current = settings.ttsEnabled; }, [settings.ttsEnabled]);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

  // Escape key dismisses search results and settings
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (searchResults.length > 0) setSearchResults([]);
        else if (showSettings) setShowSettings(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [searchResults.length, showSettings]);

  // Initialize providers
  useEffect(() => {
    // In test mode, use the container's mock provider
    if (isTestMode()) {
      if (container.has('musicProvider')) {
        currentProvider.current = getMusicProvider();
        setDjCommentary('🧪 Test mode active! Search for "test" to see all tracks.');
      }
      return;
    }

    const initProviders = async () => {
      // YouTube provider — prefer explicit settings, fall back to cached tokens
      if (settings.providers.youtube.apiKey || settings.providers.youtube.accessToken) {
        const ytProvider = new YouTubeMusicProvider({
          apiKey: settings.providers.youtube.apiKey,
          accessToken: settings.providers.youtube.accessToken,
          refreshToken: settings.providers.youtube.refreshToken
        });
        providers.current.set('youtube', ytProvider);
        
        if (settings.currentProvider === 'youtube') {
          currentProvider.current = ytProvider;
        }
      } else if (localStorage.getItem('djai_youtube_auth')) {
        // Rehydrate from cached OAuth tokens (provider loads them in constructor)
        try {
          const ytProvider = new YouTubeMusicProvider();
          await ytProvider.ensureAuthenticated();
          if (ytProvider.isAuthenticated) {
            providers.current.set('youtube', ytProvider);
            if (settings.currentProvider === 'youtube') {
              currentProvider.current = ytProvider;
            }
          }
        } catch (e) {
          console.warn('Failed to rehydrate YouTube provider:', e);
        }
      }

      // Spotify provider — rehydrate from cached OAuth tokens
      if (localStorage.getItem('djai_spotify_auth')) {
        try {
          const spotifyProvider = new SpotifyProvider();
          await spotifyProvider.ensureAuthenticated();
          if (spotifyProvider.isAuthenticated) {
            providers.current.set('spotify', spotifyProvider);
            if (settings.currentProvider === 'spotify') {
              currentProvider.current = spotifyProvider;
            }
          }
        } catch (e) {
          console.warn('Failed to rehydrate Spotify provider:', e);
        }
      }

      // Apple Music provider — rehydrate from cached tokens
      if (localStorage.getItem('djai_apple_developer_token') && localStorage.getItem('djai_apple_user_token')) {
        try {
          const appleProvider = new AppleMusicProvider();
          if (appleProvider.isAuthenticated) {
            providers.current.set('apple', appleProvider);
            if (settings.currentProvider === 'apple') {
              currentProvider.current = appleProvider;
            }
          }
        } catch (e) {
          console.warn('Failed to rehydrate Apple Music provider:', e);
        }
      }
    };

    initProviders();
  }, [settings.currentProvider, settings.providers.youtube.apiKey, settings.providers.youtube.accessToken, settings.providers.youtube.refreshToken]);

  // Initialize YouTube IFrame Player
  useEffect(() => {
    if (settings.currentProvider !== 'youtube') return;

    const createPlayer = () => {
      if (playerDivRef.current && !playerRef.current) {
        playerRef.current = new window.YT.Player(playerDivRef.current, {
          height: '100%',
          width: '100%',
          playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0 },
          events: { onStateChange: onPlayerStateChange }
        });
      }
    };

    // API already loaded — create player directly
    if (window.YT && window.YT.Player) {
      createPlayer();
      return;
    }

    // Only inject the script tag once
    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    window.onYouTubeIframeAPIReady = () => {
      createPlayer();
    };

    return () => {
      // Nullify the callback so a stale closure doesn't fire
      if (window.onYouTubeIframeAPIReady) {
        window.onYouTubeIframeAPIReady = () => {};
      }
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [settings.currentProvider]);

  const onPlayerStateChange = (event: any) => {
    if (event.data === 0) {
      // Track ended — read from refs to get current values
      if (autoDJModeRef.current) {
        handleAutoDJTransition();
      }
    }
    else if (event.data === 1) setIsPlaying(true);
    else if (event.data === 2) setIsPlaying(false);
  };

  /** Auto-DJ: generate commentary for upcoming track, speak it, then play */
  const handleAutoDJTransition = async () => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    try {
    const pl = playlistRef.current;
    const ct = currentTrackRef.current;
    if (!pl.length || !ct) { handleNext(); return; }

    const currentIndex = pl.findIndex(t => t.id === ct.id);
    const nextTrack = currentIndex >= 0 && currentIndex < pl.length - 1
      ? pl[currentIndex + 1] : null;
    if (!nextTrack) { handleNext(); return; }

    // Generate commentary with 3s timeout
    let announcement = `Coming up next: ${nextTrack.name} by ${nextTrack.artist}`;
    if (container.has('aiCommentaryService')) {
      const aiService = getAICommentaryService();
      if (aiService) {
        try {
          const result = await Promise.race([
            aiService.generateCommentary(nextTrack.name, nextTrack.artist, nextTrack.album),
            new Promise<null>(r => setTimeout(() => r(null), 3000)),
          ]);
          if (result) announcement = result.text;
        } catch { /* use fallback */ }
      }
    }
    setDjCommentary(announcement);

    // Speak before starting the next track (use ref to avoid stale closure)
    if (ttsEnabledRef.current && container.has('ttsService')) {
      try { await getTTSService().speak(announcement); } catch { /* continue */ }
    }

    handlePlayTrack(nextTrack);
    } finally {
      isTransitioningRef.current = false;
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    const provider = currentProvider.current;
    if (!provider) {
      setDjCommentary('Please connect a music provider in Settings');
      setShowSettings(true);
      return;
    }

    if (!provider.isAuthenticated) {
      setDjCommentary('Provider not authenticated. Please connect in Settings.');
      setShowSettings(true);
      return;
    }

    try {
      setDjCommentary('Searching...');
      setSearchResults([]);
      const results = await provider.searchTracks(searchQuery, 10);
      setSearchResults(results);
      setDjCommentary(`Found ${results.length} results for "${searchQuery}"`);
    } catch (error: any) {
      setDjCommentary(`Search error: ${error.message}`);
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = async (result: SearchResult) => {
    const provider = currentProvider.current;
    if (!provider) return;

    const track = provider.toTrack(result);
    setPlaylist([...playlist, track]);
    setSearchResults([]);
    setSearchQuery('');
    setDjCommentary(`Added: ${track.name}`);
  };

  const handlePlayTrack = async (track: Track) => {
    setCurrentTrack(track);
    const provider = currentProvider.current;
    if (!provider) return;

    // Generate AI commentary if available
    let announcement = `Now playing: ${track.name} by ${track.artist}`;
    
    if (container.has('aiCommentaryService')) {
      const aiService = getAICommentaryService();
      if (aiService) {
        try {
          const commentary = await aiService.generateCommentary(
            track.name,
            track.artist,
            track.album
          );
          announcement = commentary.text;
        } catch (error) {
          console.warn('AI commentary generation failed:', error);
          // Stick with simple announcement
        }
      }
    }

    // Display the commentary
    setDjCommentary(announcement);

    // Speak it if TTS is enabled
    if (settings.ttsEnabled && container.has('ttsService')) {
      const ttsService = getTTSService();
      try {
        await ttsService.speak(announcement);
      } catch (error) {
        console.warn('TTS failed:', error);
      }
    }

    // Build a SearchResult from the Track to call the provider interface.
    // Track.id maps to the provider-specific track identifier.
    let searchResult: SearchResult;
    if (settings.currentProvider === 'spotify') {
      searchResult = {
        id: track.id,
        title: track.name,
        artist: track.artist,
        providerData: { uri: `spotify:track:${track.id}` }
      };
    } else if (settings.currentProvider === 'apple') {
      searchResult = {
        id: track.id,
        title: track.name,
        artist: track.artist,
        providerData: { appleMusicId: track.id }
      };
    } else {
      searchResult = {
        id: track.id,
        title: track.name,
        artist: track.artist,
        providerData: { videoId: track.id }
      };
    }

    try {
      const playbackId = await provider.playTrack(searchResult);

      // YouTube-specific: drive the iframe player with the returned video ID
      if (settings.currentProvider === 'youtube' && playerRef.current) {
        playerRef.current.loadVideoById(playbackId);
      }

      setIsPlaying(true);
    } catch {
      setDjCommentary(`Could not play`);
    }
  };

  const handlePlayPause = () => {
    const provider = providers.current.get(settings.currentProvider);

    if (isPlaying) {
      provider?.pause().catch(console.error);
      // YouTube-specific iframe command
      if (settings.currentProvider === 'youtube' && playerRef.current) {
        playerRef.current.pauseVideo();
      }
      setIsPlaying(false);
    } else {
      if (!currentTrack && playlist.length > 0) {
        handlePlayTrack(playlist[0]);
      } else {
        provider?.play().catch(console.error);
        // YouTube-specific iframe command
        if (settings.currentProvider === 'youtube' && playerRef.current) {
          playerRef.current.playVideo();
        }
        setIsPlaying(true);
      }
    }
  };

  const handleNext = () => {
    const pl = playlistRef.current;
    const ct = currentTrackRef.current;
    if (pl.length > 0 && ct) {
      const currentIndex = pl.findIndex(t => t.id === ct.id);
      if (currentIndex >= 0 && currentIndex < pl.length - 1) {
        handlePlayTrack(pl[currentIndex + 1]);
        return;
      }
    }
    // No next playlist track — delegate to the provider's native next
    providers.current.get(settings.currentProvider)?.next().catch(console.error);
  };

  const handlePrevious = () => {
    if (playlist.length > 0 && currentTrack) {
      const idx = playlist.findIndex(t => t.id === currentTrack.id);
      if (idx > 0) {
        handlePlayTrack(playlist[idx - 1]);
        return;
      }
    }
    // No previous playlist track — delegate to the provider's native previous
    providers.current.get(settings.currentProvider)?.previous().catch(console.error);
  };

  const handleConnectProvider = async (providerName: 'youtube' | 'spotify' | 'apple') => {
    console.log('handleConnectProvider called for:', providerName);
    
    let provider = providers.current.get(providerName);
    
    // Create provider if it doesn't exist
    if (!provider) {
      console.log('Provider not found, creating new one');
      if (providerName === 'youtube') {
        provider = new YouTubeMusicProvider();
        providers.current.set('youtube', provider);
      }
      if (providerName === 'spotify') {
        provider = new SpotifyProvider();
        providers.current.set('spotify', provider);
      }
      if (providerName === 'apple') {
        provider = new AppleMusicProvider();
        providers.current.set('apple', provider);
      }
    }
    
    if (!provider) {
      console.error('Failed to create provider');
      setDjCommentary('❌ Failed to initialize provider');
      return;
    }

    console.log('Calling authenticate on provider');
    const authResult = await provider.authenticate();
    console.log('Auth result:', authResult);
    
    if (authResult.success) {
      setSettings({
        ...settings,
        providers: {
          ...settings.providers,
          [providerName]: {
            ...settings.providers[providerName],
            isConnected: true
          }
        }
      });
      setDjCommentary(`✅ Connected to ${provider.providerName}!`);
    } else if (authResult.requiresOAuth && authResult.oauthUrl) {
      console.log('Opening OAuth URL:', authResult.oauthUrl);
      setDjCommentary('Opening OAuth window...');
      
      // Fix 2: Use Electron BrowserWindow for OAuth if available
      if (window.electron?.openOAuthWindow) {
        const redirectUri = window.location.protocol === 'file:'
          ? 'djai://oauth/callback'
          : `${window.location.origin}/oauth/callback`;
          
        window.electron.openOAuthWindow({
          url: authResult.oauthUrl,
          redirectUri
        });
        setDjCommentary('Complete authentication in the popup window...');
      } else {
        // Fallback for browser dev mode
        const popup = window.open(authResult.oauthUrl, '_blank', 'width=600,height=700');
        if (!popup) {
          setDjCommentary('❌ Popup blocked! Please allow popups for DJ.ai');
        } else {
          setDjCommentary('Complete authentication in the popup window...');
        }
      }
    } else if (authResult.error) {
      // Show the error message - typically means OAuth not configured
      setDjCommentary(`ℹ️ ${authResult.error}`);
      console.log('OAuth not configured. User should use API key method.');
    } else {
      setDjCommentary(`❌ Connection failed`);
    }
  };

  const handleConnectProviderForWizard = async (providerName: string) => {
    await handleConnectProvider(providerName as 'youtube' | 'spotify' | 'apple');
  };

  const handleDisconnectProvider = async (providerName: 'youtube' | 'spotify' | 'apple') => {
    const provider = providers.current.get(providerName);
    if (provider) {
      await provider.signOut();
      setSettings({
        ...settings,
        providers: {
          ...settings.providers,
          [providerName]: { isConnected: false }
        }
      });
      setDjCommentary(`Disconnected from ${provider.providerName}`);
    }
  };

  const handleOAuthSuccess = async (providerName: string, callbackUrl: string) => {
    const provider = providers.current.get(providerName);
    if (provider) {
      const success = await provider.handleOAuthCallback(callbackUrl);
      if (success) {
        setSettings(prev => ({
          ...prev,
          providers: {
            ...prev.providers,
            [providerName]: { isConnected: true }
          }
        }));
        setDjCommentary(`Successfully connected to ${provider.providerName}!`);
      }
    }
  };

  // Fix 1: Register deep link listener for packaged OAuth
  useEffect(() => {
    // Only run if the electron API is available
    if (window.electron?.oauthDeepLink?.onCallback) {
      const handler = (url: string) => {
        console.log('Received deep link callback:', url);
        try {
          // Parse the URL to get the code
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          const state = urlObj.searchParams.get('state');
          
          if (code) {
            // Fix 3: Determine which provider initiated the flow using state
            let providerName = '';
            if (state) {
              providerName = localStorage.getItem(`djai_oauth_state_${state}`) || '';
            }
            
            // Fallback to pending provider if state lookup fails
            if (!providerName) {
              providerName = localStorage.getItem('djai_oauth_pending_provider') || 'youtube';
            }
            
            // Handle the success
            handleOAuthSuccess(providerName, url);
          }
        } catch (error) {
          console.error('Error handling deep link:', error);
        }
      };
      window.electron.oauthDeepLink.onCallback(handler);
      return () => {
        window.electron?.oauthDeepLink?.removeCallback?.();
      };
    }
  }, []); // Empty dependency array - run once on mount

  const handleSettingsSave = (newSettings: SettingsConfig) => {
    setSettings(newSettings);

    // Persist API keys in a separate store (fire-and-forget)
    void saveApiKeys({
      openaiApiKey: newSettings.openaiApiKey,
      anthropicApiKey: newSettings.anthropicApiKey,
      elevenLabsApiKey: newSettings.elevenLabsApiKey,
      geminiApiKey: newSettings.geminiApiKey,
    });

    // Strip secrets before writing the main settings blob
    const { openaiApiKey: _o, anthropicApiKey: _a, elevenLabsApiKey: _e, geminiApiKey: _g, ...safeSettings } = newSettings;
    localStorage.setItem('djAiSettings', JSON.stringify(safeSettings));
    
    // Update current provider if API key changed
    if (newSettings.providers.youtube.apiKey && newSettings.currentProvider === 'youtube') {
      const ytProvider = new YouTubeMusicProvider({ apiKey: newSettings.providers.youtube.apiKey });
      providers.current.set('youtube', ytProvider);
      currentProvider.current = ytProvider;
      
      ytProvider.authenticate().then(result => {
        if (result.success) {
          setDjCommentary('✅ YouTube Music connected! You can now search for music.');
          setSettings({
            ...newSettings,
            providers: {
              ...newSettings.providers,
              youtube: { ...newSettings.providers.youtube, isConnected: true }
            }
          });
        } else {
          setDjCommentary('❌ YouTube connection failed. Check your API key.');
        }
      });
    }
  };

  if (showOnboarding) {
    return (
      <OnboardingWizard
        onComplete={handleOnboardingComplete}
        providers={providers.current}
        onConnectProvider={handleConnectProviderForWizard}
      />
    );
  }

  return (
    <>
      <TestModeIndicator />
      <Routes>
        <Route path="/oauth/callback" element={<OAuthCallback onSuccess={handleOAuthSuccess} />} />
        <Route path="/" element={
          <div className={`app ${isFullscreen ? 'fullscreen-mode' : ''}`}>
            {!isFullscreen && (
              <header className="header">
                <h1>DJ.ai</h1>
                <div className="service-selector">
                  <div className="provider-badge">
                    {isTestMode() && '🧪 Test Mode'}
                    {!isTestMode() && settings.currentProvider === 'youtube' && '🎥 YouTube Music'}
                    {!isTestMode() && settings.currentProvider === 'spotify' && '🎵 Spotify'}
                    {!isTestMode() && settings.currentProvider === 'apple' && '🍎 Apple Music'}
                    {settings.providers[settings.currentProvider].isConnected ? ' ✅' : ' ❌'}
                  </div>
                  {settings.ttsEnabled && <div className="mode-badge" title="Text-to-Speech Enabled">🔊 TTS</div>}
                  {settings.autoDJMode && <div className="mode-badge" title="Auto-DJ Mode Active">🎧 Auto-DJ</div>}
                  <input 
                    type="text" 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
                    placeholder="Search for music..."
                  />
                  <button onClick={handleSearch}>Search</button>
                  <button onClick={() => setShowSettings(true)} className="settings-btn" aria-label="Settings">⚙️ Settings</button>
                  <button 
                    onClick={() => setIsFullscreen(!isFullscreen)} 
                    className="fullscreen-btn"
                    title="Fullscreen Visualizer"
                    aria-label="Toggle fullscreen"
                  >
                    {isFullscreen ? '⛶' : '🔳'}
                  </button>
                </div>
              </header>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && !isFullscreen && (
              <div className="search-results" role="region" aria-label="Search results">
                <h3>Search Results - Click to add to playlist:</h3>
                <ul>
                  {searchResults.map((result) => (
                    <li
                      key={result.id}
                      onClick={() => handleSelectSearchResult(result)}
                      tabIndex={0}
                      role="button"
                      aria-label={`Add ${result.title} by ${result.artist} to playlist`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectSearchResult(result);
                        }
                      }}
                    >
                      {result.thumbnailUrl && <img src={result.thumbnailUrl} alt={result.title} className="result-thumbnail" />}
                      <div className="result-info">
                        <strong>{result.title}</strong>
                        <span className="result-channel">{result.artist}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <button onClick={() => setSearchResults([])} className="close-results-btn">Close Results</button>
              </div>
            )}

            <main className="main-content">
              {!isFullscreen && (
                <>
                  <div className="dj-commentary" aria-live="polite" role="status">
                    <h2>DJ Commentary</h2>
                    <p>{djCommentary}</p>
                  </div>

                  <div className="now-playing">
                    <h3>Now Playing</h3>
                    {currentTrack ? (
                      <div className="track-info">
                        {currentTrack.albumArtUrl && <img src={currentTrack.albumArtUrl} alt="Album art" className="album-art"/>}
                        <div>
                          <strong>{currentTrack.name}</strong><br/>
                          <span className="artist">{currentTrack.artist}</span><br/>
                          <em className="album">{currentTrack.album}</em>
                        </div>
                      </div>
                    ) : <p className="empty-state">No track playing</p>}
                  </div>
                </>
              )}

              <div className={`visualizer ${isFullscreen ? 'fullscreen' : ''}`}>
                {!isFullscreen && <h3>Visualizer</h3>}
                {settings.currentProvider === 'youtube' ? (
                  <>
                    <div ref={playerDivRef} style={{display: 'none'}}/>
                    <Suspense fallback={<div className="visualizer-placeholder" />}>
                      <AudioVisualizer 
                        audioSource={playerRef.current}
                        isPlaying={isPlaying}
                      />
                    </Suspense>
                  </>
                ) : <div className="viz-placeholder">GPU Visualizer - Connect a provider to see visuals</div>}
                
                {isFullscreen && currentTrack && (
                  <div className="fullscreen-track-info">
                    {currentTrack.albumArtUrl && <img src={currentTrack.albumArtUrl} alt="Album art" />}
                    <div className="track-details">
                      <div className="track-name">{currentTrack.name}</div>
                      <div className="track-artist">{currentTrack.artist}</div>
                    </div>
                  </div>
                )}
                
                {isFullscreen && (
                  <button 
                    className="exit-fullscreen-btn" 
                    onClick={() => setIsFullscreen(false)}
                    title="Exit Fullscreen"
                    aria-label="Exit fullscreen"
                  >
                    ⛶
                  </button>
                )}
              </div>

              {!isFullscreen && (
                <aside className="playlist" role="complementary" aria-label="Playlist">
                  <h3>Playlist ({playlist.length})</h3>
                  <ul>
                    {playlist.map((track, idx) => (
                      <li
                        key={idx}
                        className={currentTrack?.id === track.id ? 'active' : ''}
                        onClick={() => handlePlayTrack(track)}
                        tabIndex={0}
                        role="button"
                        aria-label={`Play ${track.name} by ${track.artist}`}
                        aria-current={currentTrack?.id === track.id ? 'true' : undefined}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handlePlayTrack(track);
                          }
                        }}
                      >
                        {track.albumArtUrl && <img src={track.albumArtUrl} alt="" className="playlist-thumbnail" />}
                        <div className="playlist-track-info">
                          <span className="track-number">{idx + 1}.</span>
                          <div>
                            <div className="playlist-track-name">{track.name}</div>
                            <div className="playlist-track-artist">{track.artist}</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  {playlist.length === 0 && <p className="empty-state">Search for tracks to build your playlist!</p>}
                </aside>
              )}
            </main>

            <div className={`controls ${isFullscreen ? 'fullscreen-controls' : ''}`}>
              <div className="controls-row">
                <TrackProgressBar 
                  youtubePlayer={playerRef.current}
                  durationMs={currentTrack?.durationMs}
                  isPlaying={isPlaying}
                />
                
                {!isFullscreen && (
                  <VolumeControl 
                    youtubePlayer={playerRef.current}
                  />
                )}
              </div>
              
              <div className="control-buttons">
                <button onClick={handlePrevious} title="Previous Track" aria-label="Previous track">⏮️</button>
                <button onClick={handlePlayPause} className="play-pause" title={isPlaying ? 'Pause' : 'Play'} aria-label={isPlaying ? 'Pause' : 'Play'}>
                  {isPlaying ? '⏸️' : '▶️'}
                </button>
                <button onClick={handleNext} title="Next Track" aria-label="Next track">⏭️</button>
                {!isFullscreen && (
                  <button 
                    onClick={() => setIsFullscreen(true)} 
                    className="fullscreen-toggle-btn"
                    title="Fullscreen Visualizer"
                    aria-label="Toggle fullscreen"
                  >
                    🔳
                  </button>
                )}
                {isFullscreen && (
                  <VolumeControl 
                    youtubePlayer={playerRef.current}
                  />
                )}
              </div>
            </div>

            {/* Settings Modal */}
            {showSettings && (
              <Settings
                config={settings}
                onSave={handleSettingsSave}
                onClose={() => setShowSettings(false)}
                onConnectProvider={handleConnectProvider}
                onDisconnectProvider={handleDisconnectProvider}
              />
            )}
          </div>
        } />
      </Routes>
    </>
  );
}

export default MainApp;
