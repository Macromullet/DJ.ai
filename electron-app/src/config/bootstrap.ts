// Application Bootstrap
// Initializes the app with appropriate mode (test or production)

import { initializeTestMode } from './testMode';
import { initializeProductionMode } from './productionMode';

/**
 * Bootstrap the application
 * Determines mode based on environment variable
 * 
 * SOLID Principles:
 * - Single Responsibility: Only bootstraps the app
 * - Open/Closed: Can add new modes without modifying
 * - Dependency Inversion: Uses DI container for all services
 */
export function bootstrapApp() {
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
      // Default to YouTube for now
      // TODO: Load from user settings
      initializeProductionMode({ provider: 'youtube' });
    }

    console.log('✅ Application bootstrapped');
  } catch (error) {
    console.error('❌ Bootstrap failed:', error);
    // Don't throw - let the app continue without DI services
    alert(`Failed to initialize app: ${error}`);
  }
}


