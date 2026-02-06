import React from 'react';
import './WelcomeStep.css';

interface WelcomeStepProps {
  onNext: () => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({ onNext }) => {
  return (
    <div className="welcome-container">
      <div className="welcome-logo-emoji">🎵</div>
      <h1 className="welcome-title gradient-text">Welcome to DJ.ai!</h1>
      <p className="welcome-subtitle">
        Your AI-powered music DJ. Let's get you set up in just a few steps.
      </p>

      <div className="welcome-preview-list">
        <div className="welcome-preview-item">
          <span className="welcome-preview-icon">🎧</span>
          <div>
            <div className="welcome-preview-title">Connect Your Music</div>
            <div className="welcome-preview-desc">
              Link YouTube Music, Spotify, or Apple Music
            </div>
          </div>
        </div>
        <div className="welcome-preview-item">
          <span className="welcome-preview-icon">🤖</span>
          <div>
            <div className="welcome-preview-title">Set Up AI Commentary</div>
            <div className="welcome-preview-desc">
              Add an API key for fun DJ commentary about your tracks
            </div>
          </div>
        </div>
      </div>

      <button onClick={onNext} className="welcome-btn">
        Let's Go 🚀
      </button>

      <p className="welcome-footnote">Takes about 2 minutes</p>
    </div>
  );
};

export default WelcomeStep;
