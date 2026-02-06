import React, { useState, useCallback, useEffect } from 'react';
import { IMusicProvider } from '../types/IMusicProvider';
import { WelcomeStep } from './onboarding/WelcomeStep';
import { MusicProviderStep } from './onboarding/MusicProviderStep';
import { AISetupStep } from './onboarding/AISetupStep';
import { CompletionStep } from './onboarding/CompletionStep';
import './OnboardingWizard.css';

export interface OnboardingWizardProps {
  onComplete: () => void;
  providers: Map<string, IMusicProvider>;
  onConnectProvider: (providerName: string) => Promise<void>;
}

interface OnboardingState {
  connectedProviders: Set<string>;
  savedApiKeys: Set<string>;
}

const STEPS = ['Welcome', 'Music Providers', 'AI Commentary', 'All Done'] as const;

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  onComplete,
  providers,
  onConnectProvider,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isAnimating, setIsAnimating] = useState(false);
  const [state, setState] = useState<OnboardingState>({
    connectedProviders: new Set(),
    savedApiKeys: new Set(),
  });

  // Poll provider auth status periodically (Map reference doesn't change on mutations)
  useEffect(() => {
    const interval = setInterval(() => {
      const connected = new Set<string>();
      providers.forEach((provider, name) => {
        if (provider.isAuthenticated) {
          connected.add(name);
        }
      });
      if (connected.size > 0) {
        setState(prev => {
          const merged = new Set([...prev.connectedProviders, ...connected]);
          if (merged.size === prev.connectedProviders.size) return prev;
          return { ...prev, connectedProviders: merged };
        });
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [providers]);

  const animateStep = useCallback((newStep: number) => {
    const dir = newStep > currentStep ? 'forward' : 'backward';
    setDirection(dir);
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(newStep);
      setIsAnimating(false);
    }, 200);
  }, [currentStep]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      animateStep(currentStep + 1);
    }
  }, [currentStep, animateStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      animateStep(currentStep - 1);
    }
  }, [currentStep, animateStep]);

  const handleProviderConnected = useCallback((providerName: string) => {
    setState(prev => ({
      ...prev,
      connectedProviders: new Set([...prev.connectedProviders, providerName]),
    }));
  }, []);

  const handleConnectProvider = useCallback(async (providerName: string) => {
    await onConnectProvider(providerName);
    // Check if provider is now authenticated after the OAuth flow
    const provider = providers.get(providerName);
    if (provider?.isAuthenticated) {
      handleProviderConnected(providerName);
    }
  }, [onConnectProvider, providers, handleProviderConnected]);

  const handleKeySaved = useCallback((provider: string, _key: string) => {
    setState(prev => ({
      ...prev,
      savedApiKeys: new Set([...prev.savedApiKeys, provider]),
    }));
  }, []);

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep onNext={handleNext} />;
      case 1:
        return (
          <MusicProviderStep
            providers={providers}
            onConnectProvider={handleConnectProvider}
            connectedProviders={state.connectedProviders}
            onProviderConnected={handleProviderConnected}
          />
        );
      case 2:
        return <AISetupStep onKeySaved={handleKeySaved} savedKeys={state.savedApiKeys} />;
      case 3:
        return (
          <CompletionStep
            onComplete={onComplete}
            connectedProviders={state.connectedProviders}
            savedApiKeys={state.savedApiKeys}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-container">
        {/* Stepper */}
        <div className="wizard-stepper">
          {STEPS.map((label, index) => (
            <React.Fragment key={label}>
              {index > 0 && (
                <div
                  className={`wizard-step-line ${index <= currentStep ? 'filled' : ''}`}
                />
              )}
              <div className="wizard-step-item">
                <div
                  className={`wizard-step-circle ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                >
                  {index < currentStep ? '✓' : index + 1}
                </div>
                <span
                  className={`wizard-step-label ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                >
                  {label}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div
          className="wizard-step-content"
          style={{
            opacity: isAnimating ? 0 : 1,
            transform: isAnimating
              ? `translateX(${direction === 'forward' ? '30px' : '-30px'})`
              : 'translateX(0)',
          }}
        >
          {renderStep()}
        </div>

        {/* Navigation (hidden on Welcome and Completion steps) */}
        {currentStep > 0 && currentStep < STEPS.length - 1 && (
          <div className="wizard-navigation">
            <button onClick={handleBack} className="wizard-back-btn">
              ← Back
            </button>
            <button onClick={handleNext} className="wizard-skip-btn">
              Skip for now →
            </button>
            <button onClick={handleNext} className="wizard-next-btn">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardingWizard;
