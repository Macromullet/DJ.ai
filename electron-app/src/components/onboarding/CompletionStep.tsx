import React from 'react';
import './CompletionStep.css';

interface CompletionStepProps {
  onComplete: () => void;
  connectedProviders: Set<string>;
  savedApiKeys: Set<string>;
}

const PROVIDER_LABELS: Record<string, string> = {
  spotify: 'Spotify',
  apple: 'Apple Music',
};

const AI_LABELS: Record<string, string> = {
  copilot: 'GitHub Copilot',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
};

export const CompletionStep: React.FC<CompletionStepProps> = ({
  onComplete,
  connectedProviders,
  savedApiKeys,
}) => {
  const musicProviders = ['spotify', 'apple'];
  const aiProviders = ['copilot', 'openai', 'anthropic'];

  const hasAnySetup = connectedProviders.size > 0 || savedApiKeys.size > 0;

  return (
    <div className="completion-container">
      <div className="completion-emoji">🎉</div>
      <h2 className="completion-title gradient-text">You're All Set!</h2>
      <p className="completion-subtitle">
        {hasAnySetup
          ? 'Here\'s a summary of what you configured:'
          : 'You skipped setup for now — no worries, you can configure everything later.'}
      </p>

      <div className="completion-summary-list">
        <div className="completion-section-label">Music Providers</div>
        {musicProviders.map(id => {
          const connected = connectedProviders.has(id);
          return (
            <div key={id} className="completion-item">
              <span className="completion-status-icon">{connected ? '✅' : '⏭️'}</span>
              <span className={`completion-item-label ${connected ? 'connected' : ''}`}>
                {PROVIDER_LABELS[id]}
              </span>
              <span className={`completion-item-status ${connected ? 'connected' : ''}`}>
                {connected ? 'Connected' : 'Skipped'}
              </span>
            </div>
          );
        })}

        <div className="completion-section-label mt-2">AI Commentary</div>
        {aiProviders.map(id => {
          const isCopilot = id === 'copilot';
          const saved = isCopilot || savedApiKeys.has(id);
          return (
            <div key={id} className="completion-item">
              <span className="completion-status-icon">{saved ? '✅' : '⏭️'}</span>
              <span className={`completion-item-label ${saved ? 'connected' : ''}`}>
                {AI_LABELS[id]}{isCopilot ? ' (subscription)' : ' API key'}
              </span>
              <span className={`completion-item-status ${saved ? 'connected' : ''}`}>
                {isCopilot ? 'Available' : (savedApiKeys.has(id) ? 'Saved' : 'Skipped')}
              </span>
            </div>
          );
        })}
      </div>

      <button onClick={onComplete} className="completion-start-btn">
        Start Listening 🎧
      </button>

      <p className="completion-note">
        You can always change these in Settings ⚙️
      </p>
    </div>
  );
};

export default CompletionStep;
