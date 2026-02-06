import React, { useState, useCallback } from 'react';
import { saveApiKeys, getApiKeys } from '../../utils/secretStorage';
import { validateOpenAIKey, validateAnthropicKey } from '../../utils/validateApiKey';
import './AISetupStep.css';

interface AISetupStepProps {
  onKeySaved: (provider: string, key: string) => void;
  savedKeys: Set<string>;
}

interface AIProviderInfo {
  id: string;
  name: string;
  emoji: string;
  dashboardUrl: string;
  description: string;
  keyPrefix: string;
}

const AI_PROVIDERS: AIProviderInfo[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    emoji: '🧠',
    dashboardUrl: 'https://platform.openai.com/api-keys',
    description: 'GPT-powered commentary with natural, witty DJ patter.',
    keyPrefix: 'sk-',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    emoji: '🔮',
    dashboardUrl: 'https://console.anthropic.com/settings/keys',
    description: 'Claude-powered commentary with thoughtful, creative insights.',
    keyPrefix: 'sk-ant-',
  },
];

type VerifyStatus = 'idle' | 'verifying' | 'success' | 'error';

interface ProviderState {
  key: string;
  showKey: boolean;
  status: VerifyStatus;
  errorMessage: string;
}

export const AISetupStep: React.FC<AISetupStepProps> = ({ onKeySaved, savedKeys }) => {
  const [providerStates, setProviderStates] = useState<Record<string, ProviderState>>(() => {
    const initial: Record<string, ProviderState> = {};
    AI_PROVIDERS.forEach(p => {
      initial[p.id] = {
        key: '',
        showKey: false,
        status: savedKeys.has(p.id) ? 'success' : 'idle',
        errorMessage: '',
      };
    });
    return initial;
  });

  const updateProviderState = useCallback((id: string, update: Partial<ProviderState>) => {
    setProviderStates(prev => ({
      ...prev,
      [id]: { ...prev[id], ...update },
    }));
  }, []);

  const openDashboard = useCallback((url: string) => {
    if (window.electron?.openOAuthWindow) {
      const redirectUri = window.location.protocol === 'file:'
        ? 'djai://oauth/callback'
        : `${window.location.origin}/oauth/callback`;
      window.electron.openOAuthWindow({ url, redirectUri });
    } else {
      window.open(url, '_blank', 'width=900,height=700');
    }
  }, []);

  const verifyAndSave = useCallback(async (provider: AIProviderInfo) => {
    const state = providerStates[provider.id];
    const key = state.key.trim();

    if (!key) {
      updateProviderState(provider.id, {
        status: 'error',
        errorMessage: 'Please enter an API key.',
      });
      return;
    }

    updateProviderState(provider.id, { status: 'verifying', errorMessage: '' });

    try {
      let isValid = false;

      if (provider.id === 'openai') {
        isValid = await validateOpenAIKey(key);
        if (!isValid) {
          throw new Error('Invalid API key — check your key and try again.');
        }
      } else if (provider.id === 'anthropic') {
        isValid = await validateAnthropicKey(key);
        if (!isValid) {
          throw new Error('Invalid API key — check your key and try again.');
        }
      }

      // Save the key using existing secretStorage utility
      const existingKeys = await getApiKeys();
      const keyField = provider.id === 'openai' ? 'openaiApiKey' : 'anthropicApiKey';
      await saveApiKeys({ ...existingKeys, [keyField]: key });

      updateProviderState(provider.id, { status: 'success', errorMessage: '' });
      onKeySaved(provider.id, key);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed. Please check your key.';
      updateProviderState(provider.id, { status: 'error', errorMessage: message });
    }
  }, [providerStates, updateProviderState, onKeySaved]);

  return (
    <div className="ai-container">
      <h2 className="ai-title gradient-text">Set Up AI Commentary</h2>
      <p className="ai-subtitle">
        DJ.ai can generate fun commentary about your music using AI.
        You'll need an API key from one of these providers.
      </p>

      <div className="ai-cards">
        {AI_PROVIDERS.map(provider => {
          const state = providerStates[provider.id];
          const isSaved = savedKeys.has(provider.id) || state.status === 'success';

          return (
            <div
              key={provider.id}
              className={`ai-card ${isSaved ? 'saved' : ''}`}
            >
              <div className="ai-card-top">
                <span className="ai-emoji">{provider.emoji}</span>
                <div className="ai-info">
                  <div className="ai-name">{provider.name}</div>
                  <div className="ai-desc">{provider.description}</div>
                </div>
                {isSaved && <span className="ai-saved-badge">✅</span>}
              </div>

              {!isSaved && (
                <div className="ai-card-body">
                  <button
                    onClick={() => openDashboard(provider.dashboardUrl)}
                    className="ai-dashboard-btn"
                  >
                    🔑 Get API Key
                  </button>

                  <div className="ai-input-row">
                    <div className="ai-input-wrapper">
                      <input
                        type={state.showKey ? 'text' : 'password'}
                        placeholder={`Paste your ${provider.name} API key`}
                        value={state.key}
                        onChange={e =>
                          updateProviderState(provider.id, { key: e.target.value, status: 'idle', errorMessage: '' })
                        }
                        className={`ai-input ${state.status === 'error' ? 'error' : ''}`}
                      />
                      <button
                        onClick={() =>
                          updateProviderState(provider.id, { showKey: !state.showKey })
                        }
                        className="ai-toggle-btn"
                        title={state.showKey ? 'Hide key' : 'Show key'}
                      >
                        {state.showKey ? '🙈' : '👁️'}
                      </button>
                    </div>

                    <button
                      onClick={() => verifyAndSave(provider)}
                      disabled={state.status === 'verifying' || !state.key.trim()}
                      className="ai-verify-btn"
                    >
                      {state.status === 'verifying' ? '⏳' : 'Verify'}
                    </button>
                  </div>

                  {state.status === 'error' && state.errorMessage && (
                    <div className="ai-error-text">❌ {state.errorMessage}</div>
                  )}
                </div>
              )}

              {isSaved && (
                <div className="ai-saved-msg">
                  API key saved securely.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AISetupStep;
