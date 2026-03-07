import { useState, useEffect } from 'react';
import './Settings.css';

export interface SettingsConfig {
  // Current provider
  currentProvider: 'youtube' | 'spotify' | 'apple';
  
  // Provider credentials
  providers: {
    youtube: {
      apiKey?: string;
      accessToken?: string;
      refreshToken?: string;
      isConnected: boolean;
    };
    spotify: {
      accessToken?: string;
      refreshToken?: string;
      tokenExpiry?: number;
      isConnected: boolean;
    };
    apple: {
      developerToken?: string;
      musicUserToken?: string;
      isConnected: boolean;
    };
  };
  
  // AI & TTS settings
  aiProvider: 'openai' | 'anthropic';
  openaiApiKey: string;
  anthropicApiKey: string;
  elevenLabsApiKey: string;
  geminiApiKey: string;
  ttsEnabled: boolean;
  ttsProvider: 'web-speech' | 'openai' | 'gemini' | 'elevenlabs';
  ttsVoice: string;
  autoDJMode: boolean;
}

interface SettingsProps {
  config: SettingsConfig;
  onSave: (config: SettingsConfig) => void;
  onClose: () => void;
  onConnectProvider: (provider: 'youtube' | 'spotify' | 'apple') => void;
  onDisconnectProvider: (provider: 'youtube' | 'spotify' | 'apple') => void;
}

export function Settings({ config, onSave, onClose, onConnectProvider, onDisconnectProvider }: SettingsProps) {
  const [localConfig, setLocalConfig] = useState<SettingsConfig>(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = () => {
    // Persistence is handled by the parent via onSave — do not duplicate here.
    onSave(localConfig);
    onClose();
  };

  const openAIVoices = [
    { id: 'alloy', name: 'Alloy (Neutral)' },
    { id: 'echo', name: 'Echo (Male)' },
    { id: 'fable', name: 'Fable (British Male)' },
    { id: 'onyx', name: 'Onyx (Deep Male) - Recommended' },
    { id: 'nova', name: 'Nova (Female)' },
    { id: 'shimmer', name: 'Shimmer (Female)' }
  ];

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="settings-panel" aria-label="Settings" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close settings">×</button>
        </div>

        <div className="settings-content">
          {/* Music Provider Section */}
          <section className="settings-section">
            <h3>🎵 Music Provider</h3>
            
            <div className="provider-selection">
              <label>
                <input
                  type="radio"
                  name="currentProvider"
                  value="youtube"
                  checked={localConfig.currentProvider === 'youtube'}
                  onChange={(_e) => setLocalConfig({...localConfig, currentProvider: 'youtube'})}
                />
                YouTube Music
              </label>
              <label>
                <input
                  type="radio"
                  name="currentProvider"
                  value="spotify"
                  checked={localConfig.currentProvider === 'spotify'}
                  onChange={(_e) => setLocalConfig({...localConfig, currentProvider: 'spotify'})}
                />
                Spotify
              </label>
              <label>
                <input
                  type="radio"
                  name="currentProvider"
                  value="apple"
                  checked={localConfig.currentProvider === 'apple'}
                  onChange={(_e) => setLocalConfig({...localConfig, currentProvider: 'apple'})}
                />
                Apple Music
              </label>
            </div>

            {/* YouTube Authentication */}
            {localConfig.currentProvider === 'youtube' && (
              <div className="provider-auth">
                <h4>YouTube Music Authentication</h4>
                {localConfig.providers.youtube.isConnected ? (
                  <div className="auth-status connected">
                    <span>✅ Connected to YouTube Music</span>
                    <button onClick={() => onDisconnectProvider('youtube')} className="btn-disconnect">Disconnect</button>
                  </div>
                ) : (
                  <>
                    <p className="help-text">Connect with your Google account to access YouTube Music</p>
                    <button onClick={() => onConnectProvider('youtube')} className="btn-connect">
                      🔗 Connect with Google
                    </button>
                    <p className="help-text small-text">
                      Securely login through Google OAuth. Your credentials are never stored by DJ.ai.
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Spotify Authentication */}
            {localConfig.currentProvider === 'spotify' && (
              <div className="provider-auth">
                <h4>Spotify Authentication</h4>
                {localConfig.providers.spotify.isConnected ? (
                  <div className="auth-status connected">
                    <span>✅ Connected to Spotify</span>
                    <button onClick={() => onDisconnectProvider('spotify')} className="btn-disconnect">Disconnect</button>
                  </div>
                ) : (
                  <>
                    <p className="help-text">Connect with your Spotify account to access your music library</p>
                    <button onClick={() => onConnectProvider('spotify')} className="btn-connect">
                      🎵 Connect with Spotify
                    </button>
                    <p className="help-text small-text">
                      Requires Spotify Premium for full playback control
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Apple Music Authentication */}
            {localConfig.currentProvider === 'apple' && (
              <div className="provider-auth">
                <h4>Apple Music Authentication</h4>
                {localConfig.providers.apple.isConnected ? (
                  <div className="auth-status connected">
                    <span>✅ Connected to Apple Music</span>
                    <button onClick={() => onDisconnectProvider('apple')} className="btn-disconnect">Disconnect</button>
                  </div>
                ) : (
                  <>
                    <p className="help-text">Connect with your Apple ID to access Apple Music</p>
                    <button onClick={() => onConnectProvider('apple')} className="btn-connect" disabled>
                      🍎 Connect with Apple (Coming Soon)
                    </button>
                    <p className="help-text small-text">
                      Apple Music API access coming soon
                    </p>
                  </>
                )}
              </div>
            )}
          </section>

          {/* AI Provider Section */}
          <section className="settings-section">
            <h3>🤖 AI Commentary Provider</h3>
            
            <div className="setting-item">
              <label>
                <input
                  type="radio"
                  name="aiProvider"
                  value="openai"
                  checked={localConfig.aiProvider === 'openai'}
                  onChange={(_e) => setLocalConfig({...localConfig, aiProvider: 'openai'})}
                />
                OpenAI
              </label>
              <input
                type="password"
                placeholder="sk-..."
                value={localConfig.openaiApiKey}
                onChange={(e) => setLocalConfig({...localConfig, openaiApiKey: e.target.value})}
                disabled={localConfig.aiProvider !== 'openai'}
                className="api-key-input"
              />
              <p className="help-text">Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com</a></p>
            </div>

            <div className="setting-item">
              <label>
                <input
                  type="radio"
                  name="aiProvider"
                  value="anthropic"
                  checked={localConfig.aiProvider === 'anthropic'}
                  onChange={(_e) => setLocalConfig({...localConfig, aiProvider: 'anthropic'})}
                />
                Anthropic (Claude)
              </label>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={localConfig.anthropicApiKey}
                onChange={(e) => setLocalConfig({...localConfig, anthropicApiKey: e.target.value})}
                disabled={localConfig.aiProvider !== 'anthropic'}
                className="api-key-input"
              />
              <p className="help-text">Get your API key from <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">console.anthropic.com</a></p>
            </div>
          </section>

          {/* TTS Section */}
          <section className="settings-section">
            <h3>🎙️ Text-to-Speech (DJ Voice)</h3>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={localConfig.ttsEnabled}
                  onChange={(e) => setLocalConfig({...localConfig, ttsEnabled: e.target.checked})}
                />
                Enable Voice Commentary
              </label>
              <p className="help-text">DJ will speak commentary before tracks play</p>
            </div>

            {localConfig.ttsEnabled && (
              <>
                <div className="setting-item">
                  <label>TTS Provider</label>
                  <select
                    value={localConfig.ttsProvider}
                    onChange={(e) => setLocalConfig({...localConfig, ttsProvider: e.target.value as 'web-speech' | 'openai' | 'gemini' | 'elevenlabs'})}
                  >
                    <option value="web-speech">Web Speech (Free, built-in)</option>
                    <option value="openai">OpenAI TTS</option>
                    <option value="gemini">Google Gemini TTS</option>
                    <option value="elevenlabs">ElevenLabs (Premium)</option>
                  </select>
                </div>

                {localConfig.ttsProvider === 'openai' && (
                  <div className="setting-item">
                    <label>Voice</label>
                    <select
                      value={localConfig.ttsVoice}
                      onChange={(e) => setLocalConfig({...localConfig, ttsVoice: e.target.value})}
                    >
                      {openAIVoices.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                    <p className="help-text">Uses OpenAI API key (same as commentary)</p>
                  </div>
                )}

                {localConfig.ttsProvider === 'gemini' && (
                  <>
                    <div className="setting-item">
                      <label>Gemini API Key</label>
                      <input
                        type="password"
                        placeholder="Enter Gemini API key"
                        value={localConfig.geminiApiKey}
                        onChange={(e) => setLocalConfig({...localConfig, geminiApiKey: e.target.value})}
                        className="api-key-input"
                      />
                      <p className="help-text">Get from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a></p>
                    </div>
                  </>
                )}

                {localConfig.ttsProvider === 'elevenlabs' && (
                  <div className="setting-item">
                    <label>ElevenLabs API Key</label>
                    <input
                      type="password"
                      placeholder="Enter ElevenLabs API key"
                      value={localConfig.elevenLabsApiKey}
                      onChange={(e) => setLocalConfig({...localConfig, elevenLabsApiKey: e.target.value})}
                      className="api-key-input"
                    />
                    <p className="help-text">Get from <a href="https://elevenlabs.io/" target="_blank" rel="noopener noreferrer">elevenlabs.io</a> - Premium realistic voices</p>
                  </div>
                )}
              </>
            )}
          </section>

          {/* Playback Section */}
          <section className="settings-section">
            <h3>🎵 Playback</h3>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={localConfig.autoDJMode}
                  onChange={(e) => setLocalConfig({...localConfig, autoDJMode: e.target.checked})}
                />
                Auto-DJ Mode
              </label>
              <p className="help-text">Automatically play AI-recommended tracks</p>
            </div>
          </section>

          {/* Setup Wizard Section */}
          <section className="settings-section">
            <h3>🧙 Setup Wizard</h3>
            <div className="setting-item">
              <button
                className="btn btn-secondary"
                onClick={() => {
                  localStorage.removeItem('djai_onboarding_complete');
                  window.location.reload();
                }}
              >
                🔄 Re-run Setup Wizard
              </button>
              <p className="help-text">Walk through the initial setup again</p>
            </div>
          </section>
        </div>

        <div className="settings-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>💾 Save Settings</button>
        </div>
      </div>
    </div>
  );
}
