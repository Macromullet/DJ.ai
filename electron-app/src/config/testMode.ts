// Test Mode Configuration
// Bootstrap with test implementations using Dependency Injection

import { MockMusicProvider } from '../providers/MockMusicProvider';
import { WebSpeechTTSService } from '../services/WebSpeechTTSService';
import { AICommentaryService } from '../services/AICommentaryService';
import { container, registerServices } from './container';
import type { ServiceContainer } from './container';

export interface TestModeOptions {
  autoSpeak?: boolean;
  mockTrackCount?: number;
}

/**
 * Initialize test mode with mock implementations
 */
export function initializeTestMode(_options: TestModeOptions = {}): ServiceContainer {
  console.log('[TEST MODE] Initializing test environment...');
  
  try {
    // Create test implementations
    const musicProvider = new MockMusicProvider();
    console.log('[TEST MODE] ✅ Mock provider created');
    
    const ttsService = new WebSpeechTTSService();
    console.log('[TEST MODE] ✅ TTS service created');

    // Create AI Commentary service with mock fallback
    const aiCommentaryService = new AICommentaryService({
      provider: 'copilot', // Will fall back to mock commentary
      openaiApiKey: undefined,
      anthropicApiKey: undefined,
    });
    console.log('[TEST MODE] ✅ AI Commentary service created');

    // Register with DI container
    registerServices({
      musicProvider,
      ttsService,
      aiCommentaryService,
    });

    console.log('[TEST MODE] ✅ Services registered in DI container');
    console.log('[TEST MODE] ✅ Mock provider: 100 test tracks available');
    console.log('[TEST MODE] ✅ Web Speech TTS: Enabled');
    console.log('[TEST MODE] ✅ AI Commentary: Mock templates');
    
    return container.getAll() as ServiceContainer;
  } catch (error) {
    console.error('[TEST MODE] ❌ Failed to initialize:', error);
    throw error;
  }
}

/**
 * Check if running in test mode
 */
export function isTestMode(): boolean {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('test') === 'true' || 
         localStorage.getItem('djai-test-mode') === 'true';
}
