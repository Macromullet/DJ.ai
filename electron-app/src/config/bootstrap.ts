// Application Bootstrap
// Initializes the app with appropriate mode (test or production)

import { initializeTestMode } from './testMode';
import { initializeProductionMode } from './productionMode';
import { getApiKeys } from '../utils/secretStorage';

/**
 * Bootstrap the application
 * Loads API keys from encrypted storage and settings from localStorage,
 * then initializes services via DI container.
 */
export async function bootstrapApp() {
  try {
    // Check if test mode is requested via environment variable or query param
    const urlParams = new URLSearchParams(window.location.search);
    const isTest = import.meta.env.DEV && (
      urlParams.get('test') === 'true' || 
      localStorage.getItem('djai-test-mode') === 'true'
    );

    if (isTest) {
      console.log('🧪 Starting in TEST MODE');
      initializeTestMode();
    } else {
      console.log('🚀 Starting in PRODUCTION MODE');

      // Load API keys from encrypted storage
      const keys = await getApiKeys();

      // Load saved settings from localStorage
      const savedSettings = localStorage.getItem('djAiSettings');
      let settings: Record<string, any> = {};
      try { settings = savedSettings ? JSON.parse(savedSettings) : {}; } catch { /* use defaults */ }

      // Smart AI provider default: use whichever key the user has
      const aiProvider = settings.aiProvider
        || (keys.anthropicApiKey ? 'anthropic' : keys.openaiApiKey ? 'openai' : 'anthropic');

      initializeProductionMode({
        provider: settings.currentProvider || 'apple',
        ttsProvider: settings.ttsProvider || 'web-speech',
        aiProvider,
        openaiApiKey: keys.openaiApiKey,
        anthropicApiKey: keys.anthropicApiKey,
        geminiApiKey: keys.geminiApiKey,
        elevenLabsApiKey: keys.elevenLabsApiKey,
      });
    }

    console.log('✅ Application bootstrapped');
  } catch (error) {
    console.error('❌ Bootstrap failed:', error);
    // Don't throw - let the app continue without DI services
    alert(`Failed to initialize app: ${error}`);
  }
}


