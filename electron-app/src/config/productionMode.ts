// Production Mode Configuration
// Bootstrap with production implementations using Dependency Injection

import { YouTubeMusicProvider } from '../providers/YouTubeMusicProvider';
import { SpotifyProvider } from '../providers/SpotifyProvider';
import { AppleMusicProvider } from '../providers/AppleMusicProvider';
import { WebSpeechTTSService } from '../services/WebSpeechTTSService';
import { AICommentaryService } from '../services/AICommentaryService';
import { container, registerServices } from './container';
import type { ServiceContainer } from './container';

export interface ProductionModeOptions {
  provider: 'youtube' | 'spotify' | 'apple';
  ttsProvider?: 'web-speech' | 'openai' | 'elevenlabs';
  aiProvider?: 'copilot' | 'openai' | 'anthropic';
  openaiApiKey?: string;
  anthropicApiKey?: string;
}

/**
 * Initialize production mode with real implementations
 * Follows SOLID principles:
 * - Single Responsibility: Only configures production dependencies
 * - Dependency Inversion: Uses abstractions (interfaces) not concrete classes
 * - Open/Closed: Can add new providers without modifying this code
 */
export function initializeProductionMode(options: ProductionModeOptions): ServiceContainer {
  console.log('[PRODUCTION MODE] Initializing...');
  
  // Create music provider based on selection
  let musicProvider;
  switch (options.provider) {
    case 'youtube':
      musicProvider = new YouTubeMusicProvider();
      break;
    case 'spotify':
      musicProvider = new SpotifyProvider();
      break;
    case 'apple':
      musicProvider = new AppleMusicProvider();
      break;
    default:
      throw new Error(`Unknown provider: ${options.provider}`);
  }

  // Create TTS service (default to Web Speech for now)
  const ttsService = new WebSpeechTTSService();

  // Create AI Commentary service
  const aiCommentaryService = new AICommentaryService({
    provider: options.aiProvider || 'copilot',
    openaiApiKey: options.openaiApiKey,
    anthropicApiKey: options.anthropicApiKey,
  });

  // Register with DI container
  registerServices({
    musicProvider,
    ttsService,
    aiCommentaryService,
  });

  console.log('[PRODUCTION MODE] ✅ Services registered');
  console.log(`[PRODUCTION MODE] ✅ Music provider: ${options.provider}`);
  console.log(`[PRODUCTION MODE] ✅ AI provider: ${options.aiProvider || 'copilot'}`);
  console.log('[PRODUCTION MODE] ✅ TTS: Web Speech API');
  
  return container.getAll() as ServiceContainer;
}


