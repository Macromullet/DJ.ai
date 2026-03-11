import { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { IMusicProvider, SearchResult } from './types/IMusicProvider';
import { Track } from './types';
import { SpotifyProvider } from './providers/SpotifyProvider';
import { AppleMusicProvider } from './providers/AppleMusicProvider';
import { Settings, SettingsConfig } from './components/Settings';
import { saveApiKeys, getApiKeys } from './utils/secretStorage';
import { OAuthCallback } from './components/OAuthCallback';
import TestModeIndicator from './components/TestModeIndicator';
import { TrackProgressBar } from './components/TrackProgressBar';
import { VolumeControl } from './components/VolumeControl';
import { OnboardingWizard } from './components/OnboardingWizard';
import { useToast } from './components/Toast';
import { getMusicProvider, getTTSService, getAICommentaryService, container } from './config/container';
import { isTestMode } from './config/testMode';
import './App.css';

function MainApp() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [playlist, setPlaylist] = useState<Track[]>(() => {
    try {
      const saved = localStorage.getItem('djai_playlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [djCommentary, setDjCommentary] = useState(
    'Welcome to DJ.ai! Connect a music provider to get started. 🎵'
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [settings, setSettings] = useState<SettingsConfig>(() => {
    const defaults: SettingsConfig = {
      currentProvider: 'apple',
      providers: {
        spotify: { isConnected: false },
        apple: { isConnected: isTestMode() }
      },
      aiProvider: 'copilot',
      openaiApiKey: '',
      anthropicApiKey: '',
      elevenLabsApiKey: '',
      geminiApiKey: '',
      ttsEnabled: false,
      ttsProvider: 'web-speech',
      ttsVoice: 'onyx',
      autoDJMode: false
    };
    try {
      const saved = localStorage.getItem('djAiSettings');
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });

  // Onboarding wizard state
  const [showOnboarding, setShowOnboarding] = useState<boolean>(
    () => !localStorage.getItem('djai_onboarding_complete')
  );

  const handleOnboardingComplete = useCallback(() => {
    localStorage.setItem('djai_onboarding_complete', 'true');
    setShowOnboarding(false);
  }, []);

  const { showToast } = useToast();

  // Load API keys asynchronously (returns 'configured' placeholders in Electron)
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

  // Refs to avoid stale closures inside player event handlers
  const autoDJModeRef = useRef(settings.autoDJMode);
  const ttsEnabledRef = useRef(settings.ttsEnabled);
  const isTransitioningRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  const playlistRef = useRef(playlist);
  const currentTrackRef = useRef(currentTrack);
  const settingsRef = useRef(settings);
  const playRequestIdRef = useRef(0);
  const showToastRef = useRef(showToast);

  // Look-ahead pre-generation cache for seamless DJ transitions
  const preGenCacheRef = useRef<{
    trackId: string;
    commentary: string;
    audioBlob: Blob | null;
  } | null>(null);

  useEffect(() => { autoDJModeRef.current = settings.autoDJMode; }, [settings.autoDJMode]);
  useEffect(() => { ttsEnabledRef.current = settings.ttsEnabled; }, [settings.ttsEnabled]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);

  // Persist playlist to localStorage
  useEffect(() => {
    localStorage.setItem('djai_playlist', JSON.stringify(playlist));
  }, [playlist]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Escape always works (close modals/search/fullscreen)
      if (e.key === 'Escape') {
        if (isFullscreen) setIsFullscreen(false);
        else if (searchResults.length > 0) setSearchResults([]);
        else if (showSettings) setShowSettings(false);
        return;
      }

      // All other shortcuts are suppressed when typing in an input
      if (isTyping) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowRight':
          handleNext();
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowUp':
          e.preventDefault();
          // Volume up handled by VolumeControl component
          break;
        case 'ArrowDown':
          e.preventDefault();
          // Volume down handled by VolumeControl component
          break;
        case 'm':
        case 'M':
          // Mute handled by VolumeControl component
          break;
        case 's':
        case 'S':
          setShowSettings(prev => !prev);
          break;
        case 'f':
        case 'F':
          setIsFullscreen(prev => !prev);
          break;
        case '/':
          e.preventDefault();
          document.querySelector<HTMLInputElement>('.search-input')?.focus();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchResults.length, showSettings, isFullscreen]);

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
          showToast('Could not restore Spotify session', 'warning');
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
          showToast('Could not restore Apple Music session', 'warning');
        }
      }
    };

    initProviders();
  }, [settings.currentProvider]);

  // Poll provider playback state to detect track end
  useEffect(() => {
    if (!isPlaying) return;
    const interval = window.setInterval(async () => {
      const provider = currentProvider.current;
      if (!provider) return;
      try {
        const state = await provider.getPlaybackState();
        if (state && state.isPlaying === false && state.positionMs > 0 && state.durationMs > 0
            && state.positionMs >= state.durationMs - 500) {
          // Track ended
          setIsPlaying(false);
          if (autoDJModeRef.current) {
            handleAutoDJTransition();
          }
        }
      } catch { /* provider may not support getPlaybackState yet */ }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  /** Auto-DJ: use pre-generated cache for seamless transitions, fallback to live generation */
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

      // Check if pre-generation completed for this track
      const cached = preGenCacheRef.current;
      if (cached && cached.trackId === nextTrack.id) {
        // Cache hit — near-instant transition
        setDjCommentary(cached.commentary);
        if (ttsEnabledRef.current && container.has('ttsService')) {
          const ttsService = getTTSService();
          try {
            if (cached.audioBlob && ttsService.speakFromBlob) {
              await ttsService.speakFromBlob(cached.audioBlob);
            } else {
              await ttsService.speak(cached.commentary);
            }
          } catch { /* Auto-DJ TTS: degrade silently to avoid interrupting playback */ }
        }
        preGenCacheRef.current = null;
        handlePlayTrack(nextTrack, { skipCommentary: true });
        return;
      }

      // Cache miss — generate live with 3s timeout
      let announcement = `Coming up next: ${nextTrack.name} by ${nextTrack.artist}`;
      if (container.has('aiCommentaryService')) {
        const aiService = getAICommentaryService();
        if (aiService) {
          try {
            const result = await Promise.race([
              aiService.generateCommentary(nextTrack.name, nextTrack.artist, nextTrack.album,
                currentTrackRef.current ? { title: currentTrackRef.current.name, artist: currentTrackRef.current.artist } : undefined),
              new Promise<null>(r => setTimeout(() => r(null), 3000)),
            ]);
            if (result) announcement = result.text;
          } catch (e) { console.warn('[Auto-DJ] AI commentary generation failed (using fallback):', e); }
        }
      }
      setDjCommentary(announcement);

      if (ttsEnabledRef.current && container.has('ttsService')) {
        try { await getTTSService().speak(announcement); } catch (e) { console.warn('[Auto-DJ] TTS speak failed (non-fatal):', e); }
      }

      handlePlayTrack(nextTrack, { skipCommentary: true });    } finally {
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
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      setDjCommentary(`Search error: ${message}`);
      showToast('Search failed: ' + message, 'error');
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

  const handlePlayTrack = async (track: Track, options?: { skipCommentary?: boolean }) => {
    const myPlayId = ++playRequestIdRef.current;
    setCurrentTrack(track);
    const provider = currentProvider.current;
    const providerName = settingsRef.current.currentProvider;
    if (!provider) return;

    if (!options?.skipCommentary) {
      // Check pre-generation cache for this track
      const cached = preGenCacheRef.current;
      let announcement = `Now playing: ${track.name} by ${track.artist}`;
      let cachedAudioBlob: Blob | null = null;

      if (cached && cached.trackId === track.id) {
        announcement = cached.commentary;
        cachedAudioBlob = cached.audioBlob;
        preGenCacheRef.current = null;
      } else if (container.has('aiCommentaryService')) {
        const aiService = getAICommentaryService();
        if (aiService) {
          try {
            const commentary = await aiService.generateCommentary(
              track.name, track.artist, track.album,
              currentTrackRef.current ? { title: currentTrackRef.current.name, artist: currentTrackRef.current.artist } : undefined
            );
            if (myPlayId !== playRequestIdRef.current) return;
            announcement = commentary.text;
          } catch (error) {
            if (myPlayId !== playRequestIdRef.current) return;
            console.warn('AI commentary generation failed:', error);
            showToast('AI commentary unavailable', 'warning');
          }
        }
      }

      setDjCommentary(announcement);

      // Speak with volume ducking
      if (settingsRef.current.ttsEnabled && container.has('ttsService')) {
        const ttsService = getTTSService();
        try {
          if (cachedAudioBlob && ttsService.speakFromBlob) {
            await ttsService.speakFromBlob(cachedAudioBlob);
          } else {
            await ttsService.speak(announcement);
          }
        } catch (error) {
          console.warn('TTS failed:', error);
          showToast('Text-to-speech failed', 'warning');
        }
        if (myPlayId !== playRequestIdRef.current) return;
      }
    }

    // Build a SearchResult from the Track to call the provider interface.
    let searchResult: SearchResult;
    if (providerName === 'spotify') {
      searchResult = { id: track.id, title: track.name, artist: track.artist, providerData: { uri: `spotify:track:${track.id}` } };
    } else if (providerName === 'apple') {
      searchResult = { id: track.id, title: track.name, artist: track.artist, providerData: { appleMusicId: track.id } };
    } else {
      searchResult = { id: track.id, title: track.name, artist: track.artist, providerData: {} };
    }

    try {
      const playbackId = await provider.playTrack(searchResult);
      if (playbackId) {
        // Provider handles playback internally
      }
      setIsPlaying(true);

      // Desktop notification (when minimized) and system tray update
      window.electron?.notifications?.show({
        title: track.name,
        body: `${track.artist}${track.album ? ' — ' + track.album : ''}`,
        icon: track.albumArtUrl || undefined,
      });
      window.electron?.tray?.updateInfo({
        title: track.name,
        artist: track.artist,
        isPlaying: true,
      });

      // Kick off look-ahead pre-generation for the next track
      preGenerateNextTrack(track);
    } catch {
      setDjCommentary(`Could not play`);
      showToast('Playback failed', 'error');
    }
  };

  /** Pre-generate commentary + TTS audio for the next track in background */
  const preGenerateNextTrack = (nowPlaying: Track) => {
    const pl = playlistRef.current;
    const idx = pl.findIndex(t => t.id === nowPlaying.id);
    const nextTrack = idx >= 0 && idx < pl.length - 1 ? pl[idx + 1] : null;
    if (!nextTrack) return;

    (async () => {
      try {
        let commentary = `Coming up next: ${nextTrack.name} by ${nextTrack.artist}`;
        if (container.has('aiCommentaryService')) {
          const aiService = getAICommentaryService();
          if (aiService) {
            const result = await aiService.generateCommentary(nextTrack.name, nextTrack.artist, nextTrack.album,
              { title: nowPlaying.name, artist: nowPlaying.artist });
            commentary = result.text;
          }
        }

        let audioBlob: Blob | null = null;
        if (container.has('ttsService')) {
          const ttsService = getTTSService();
          if (ttsService.renderToBlob) {
            audioBlob = await ttsService.renderToBlob(commentary);
          }
        }

        // Only cache if playlist hasn't shifted
        if (playlistRef.current.findIndex(t => t.id === nowPlaying.id) >= 0) {
          preGenCacheRef.current = { trackId: nextTrack.id, commentary, audioBlob };
          console.log(`[DJ] Pre-generated commentary for: ${nextTrack.name}`);
        }
      } catch (error) {
        console.warn('[DJ] Pre-generation failed (non-fatal):', error);
      }
    })();
  };

  const handlePlayPause = () => {
    const s = settingsRef.current;
    const provider = providers.current.get(s.currentProvider);
    const playing = isPlayingRef.current;
    const ct = currentTrackRef.current;
    const pl = playlistRef.current;

    if (playing) {
      provider?.pause().catch(err => { console.error(err); showToastRef.current('Playback control failed', 'error'); });
      setIsPlaying(false);
      window.electron?.tray?.updateInfo({ title: ct?.name || 'DJ.ai', artist: ct?.artist || '', isPlaying: false });
    } else {
      if (!ct && pl.length > 0) {
        handlePlayTrack(pl[0]);
      } else {
        provider?.play().catch(err => { console.error(err); showToastRef.current('Playback control failed', 'error'); });
        setIsPlaying(true);
        window.electron?.tray?.updateInfo({ title: ct?.name || 'DJ.ai', artist: ct?.artist || '', isPlaying: true });
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
    providers.current.get(settingsRef.current.currentProvider)?.next().catch(err => { console.error(err); showToastRef.current('Playback control failed', 'error'); });
  };

  const handlePrevious = () => {
    const pl = playlistRef.current;
    const ct = currentTrackRef.current;
    if (pl.length > 0 && ct) {
      const idx = pl.findIndex(t => t.id === ct.id);
      if (idx > 0) {
        handlePlayTrack(pl[idx - 1]);
        return;
      }
    }
    providers.current.get(settingsRef.current.currentProvider)?.previous().catch(err => { console.error(err); showToastRef.current('Playback control failed', 'error'); });
  };

  const handleConnectProvider = async (providerName: 'spotify' | 'apple') => {
    console.log('handleConnectProvider called for:', providerName);
    
    let provider = providers.current.get(providerName);
    
    // Create provider if it doesn't exist
    if (!provider) {
      console.log('Provider not found, creating new one');
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
      showToast('Failed to initialize music provider', 'error');
      return;
    }

    console.log('Calling authenticate on provider');
    const authResult = await provider.authenticate();
    console.log('Auth result:', authResult);
    
    if (authResult.success) {
      // Set as active provider so search/play work immediately (no reload needed)
      currentProvider.current = provider;
      setSettings(prev => ({
        ...prev,
        currentProvider: providerName,
        providers: {
          ...prev.providers,
          [providerName]: {
            ...prev.providers[providerName],
            isConnected: true
          }
        }
      }));
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
      showToast(authResult.error, 'error');
      console.log('OAuth not configured. User should use API key method.');
    } else {
      setDjCommentary(`❌ Connection failed`);
    }
  };

  const handleConnectProviderForWizard = async (providerName: string) => {
    await handleConnectProvider(providerName as 'spotify' | 'apple');
  };

  const handleDisconnectProvider = async (providerName: 'spotify' | 'apple') => {
    const provider = providers.current.get(providerName);
    if (provider) {
      await provider.signOut();
      setSettings(prev => ({
        ...prev,
        providers: {
          ...prev.providers,
          [providerName]: { isConnected: false }
        }
      }));
      setDjCommentary(`Disconnected from ${provider.providerName}`);
    }
  };

  const handleOAuthSuccess = async (providerName: string, callbackUrl: string) => {
    const provider = providers.current.get(providerName);
    if (provider) {
      const success = await provider.handleOAuthCallback(callbackUrl);
      if (success) {
        // Set as active provider so search/play work immediately (no reload needed)
        currentProvider.current = provider;
        setSettings(prev => ({
          ...prev,
          currentProvider: providerName as 'spotify' | 'apple',
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
              providerName = localStorage.getItem('djai_oauth_pending_provider') || 'apple';
            }
            
            // Handle the success
            handleOAuthSuccess(providerName, url);
          }
        } catch (error) {
          console.error('Error handling deep link:', error);
          showToast('OAuth authentication failed', 'error');
        }
      };
      window.electron.oauthDeepLink.onCallback(handler);
      return () => {
        window.electron?.oauthDeepLink?.removeCallback?.();
      };
    }
  }, []); // Empty dependency array - run once on mount

  // Stable handler refs for tray/keyboard — avoids stale closures since handlers read from refs
  const handlePlayPauseRef = useRef(handlePlayPause);
  const handleNextRef = useRef(handleNext);
  const handlePreviousRef = useRef(handlePrevious);
  useEffect(() => { handlePlayPauseRef.current = handlePlayPause; });
  useEffect(() => { handleNextRef.current = handleNext; });
  useEffect(() => { handlePreviousRef.current = handlePrevious; });

  // System tray playback controls (from tray context menu and media keys)
  useEffect(() => {
    if (!window.electron?.tray) return;
    const unsubs = [
      window.electron.tray.onPlaybackToggle(() => handlePlayPauseRef.current()),
      window.electron.tray.onNextTrack(() => handleNextRef.current()),
      window.electron.tray.onPreviousTrack(() => handlePreviousRef.current()),
    ];
    return () => { unsubs.forEach(fn => typeof fn === 'function' && fn()); };
  }, []);

  const handleSettingsSave = async (newSettings: SettingsConfig) => {
    // Sanitize: replace plaintext keys with 'configured' placeholder before
    // storing in React state — prevents keys lingering in memory/DevTools
    const sanitized = { ...newSettings };
    const keyFields = ['openaiApiKey', 'anthropicApiKey', 'elevenLabsApiKey', 'geminiApiKey'] as const;
    const keysToSave: Record<string, string> = {};
    for (const field of keyFields) {
      const val = sanitized[field];
      if (val && val !== 'configured') {
        keysToSave[field] = val;
        sanitized[field] = 'configured';
      }
    }

    // Merge saves and deletions into a single atomic call to avoid races
    for (const field of keyFields) {
      if (newSettings[field] === '') {
        keysToSave[field] = '';
      }
    }

    if (Object.keys(keysToSave).length > 0) {
      try {
        await saveApiKeys(keysToSave);
      } catch (err) {
        console.error('Failed to save API keys:', err);
        showToast('Failed to save API keys', 'error');
        return;
      }
    }

    setSettings(sanitized);

    // Strip secrets before writing the main settings blob
    const { openaiApiKey: _o, anthropicApiKey: _a, elevenLabsApiKey: _e, geminiApiKey: _g, ...safeSettings } = newSettings;
    localStorage.setItem('djAiSettings', JSON.stringify(safeSettings));
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
                    {!isTestMode() && settings.currentProvider === 'spotify' && '🎵 Spotify'}
                    {!isTestMode() && settings.currentProvider === 'apple' && '🍎 Apple Music'}
                    {settings.providers[settings.currentProvider].isConnected ? ' ✅' : ' ❌'}
                  </div>
                  {settings.ttsEnabled && <div className="mode-badge" title="Text-to-Speech Enabled">🔊 TTS</div>}
                  {settings.autoDJMode && <div className="mode-badge" title="Auto-DJ Mode Active">🎧 Auto-DJ</div>}
                  <input 
                    type="text"
                    className="search-input"
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()} 
                    placeholder="Search for music... (press / to focus)"
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
                <div className="viz-placeholder">
                  {currentTrack ? (
                    <div className="now-playing-visual">
                      {currentTrack.albumArtUrl && <img src={currentTrack.albumArtUrl} alt="Album art" className="album-art-large" />}
                        <div className="now-playing-text">
                          <div className="track-name">{currentTrack.name}</div>
                          <div className="track-artist">{currentTrack.artist}</div>
                          {currentTrack.album && <div className="track-album">{currentTrack.album}</div>}
                        </div>
                      </div>
                    ) : (
                      <div className="viz-empty">🎵 Search for a track to start playing</div>
                    )}
                  </div>
                
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
                  <div className="playlist-header">
                    <h3>Playlist ({playlist.length})</h3>
                    {playlist.length > 0 && (
                      <button
                        className="clear-playlist-btn"
                        onClick={() => setPlaylist([])}
                        aria-label="Clear playlist"
                        title="Clear playlist"
                      >🗑️</button>
                    )}
                  </div>
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
                        <button
                          className="remove-track-btn"
                          onClick={(e) => { e.stopPropagation(); setPlaylist(prev => prev.filter((_, i) => i !== idx)); }}
                          aria-label={`Remove ${track.name} from playlist`}
                          title="Remove from playlist"
                        >✕</button>
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
                  durationMs={currentTrack?.durationMs}
                  isPlaying={isPlaying}
                />
                
                {!isFullscreen && (
                  <VolumeControl />
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
                  <VolumeControl />
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
