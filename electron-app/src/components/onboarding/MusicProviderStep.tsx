import React, { useEffect, useCallback } from 'react';
import { IMusicProvider } from '../../types/IMusicProvider';
import './MusicProviderStep.css';

interface MusicProviderStepProps {
  providers: Map<string, IMusicProvider>;
  onConnectProvider: (providerName: string) => Promise<void>;
  connectedProviders: Set<string>;
  onProviderConnected: (providerName: string) => void;
}

interface ProviderInfo {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

const PROVIDER_LIST: ProviderInfo[] = [
  {
    id: 'youtube',
    name: 'YouTube Music',
    emoji: '▶️',
    description: 'Stream music and watch videos from YouTube\'s vast library.',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    emoji: '🟢',
    description: 'Access millions of songs, podcasts, and playlists.',
  },
  {
    id: 'apple',
    name: 'Apple Music',
    emoji: '🍎',
    description: 'Listen to over 100 million songs with spatial audio.',
  },
];

export const MusicProviderStep: React.FC<MusicProviderStepProps> = ({
  providers,
  onConnectProvider,
  connectedProviders,
  onProviderConnected,
}) => {
  const [connecting, setConnecting] = React.useState<string | null>(null);

  // Poll for authentication changes after OAuth popup, with timeout
  useEffect(() => {
    if (!connecting) return;

    const TIMEOUT_MS = 120_000; // 2 minutes
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += 1000;
      const provider = providers.get(connecting);
      if (provider?.isAuthenticated) {
        onProviderConnected(connecting);
        setConnecting(null);
      } else if (elapsed >= TIMEOUT_MS) {
        setConnecting(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [connecting, providers, onProviderConnected]);

  const handleConnect = useCallback(async (providerId: string) => {
    if (connectedProviders.has(providerId) || connecting) return;
    setConnecting(providerId);
    try {
      await onConnectProvider(providerId);
      // Check immediately after the async call
      const provider = providers.get(providerId);
      if (provider?.isAuthenticated) {
        onProviderConnected(providerId);
        setConnecting(null);
      }
    } catch (err) {
      console.error(`Failed to connect ${providerId}:`, err);
      setConnecting(null);
    }
  }, [connectedProviders, connecting, onConnectProvider, providers, onProviderConnected]);

  return (
    <div className="mp-container">
      <h2 className="mp-title gradient-text">Connect Your Music</h2>
      <p className="mp-subtitle">
        Link your favorite streaming service to start playing music.
      </p>

      <div className="mp-cards">
        {PROVIDER_LIST.map(info => {
          const isConnected = connectedProviders.has(info.id);
          const isConnecting = connecting === info.id;

          return (
            <div
              key={info.id}
              className={`mp-card ${isConnected ? 'connected' : ''}`}
            >
              <div className="mp-card-header">
                <span className="mp-emoji">{info.emoji}</span>
                <div className="mp-info">
                  <div className="mp-name">{info.name}</div>
                  <div className="mp-desc">{info.description}</div>
                </div>
              </div>

              {isConnected ? (
                <div className="mp-badge">
                  <span>✅</span> Connected
                </div>
              ) : (
                <button
                  onClick={() => handleConnect(info.id)}
                  disabled={isConnecting}
                  className="mp-connect-btn"
                >
                  {isConnecting ? (
                    <span className="mp-spinner">⏳</span>
                  ) : (
                    'Connect'
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {connectedProviders.size > 0 && (
        <p className="mp-connected-note">
          🎉 {connectedProviders.size} provider{connectedProviders.size > 1 ? 's' : ''} connected!
        </p>
      )}
    </div>
  );
};

export default MusicProviderStep;
