// Production Mode Configuration
// Bootstrap with production implementations using Dependency Injection

import { SpotifyProvider } from '../providers/SpotifyProvider';
import { AppleMusicProvider } from '../providers/AppleMusicProvider';
import { WebSpeechTTSService } from '../services/WebSpeechTTSService';
import { OpenAITTSService } from '../services/OpenAITTSService';
import { GeminiTTSService } from '../services/GeminiTTSService';
import { ElevenLabsTTSService } from '../services/ElevenLabsTTSService';
import { AICommentaryService } from '../services/AICommentaryService';
import { container, registerServices } from './container';
import type { ServiceContainer } from './container';

export interface ProductionModeOptions {
  provider: 'spotify' | 'apple';
  ttsProvider?: 'web-speech' | 'openai' | 'gemini' | 'elevenlabs';
  aiProvider?: 'copilot' | 'openai' | 'anthropic';
  openaiApiKey?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
  elevenLabsApiKey?: string;
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
    case 'spotify':
      musicProvider = new SpotifyProvider();
      break;
    case 'apple':
      musicProvider = new AppleMusicProvider();
      break;
    default:
      throw new Error(`Unknown provider: ${options.provider}`);
  }

  // Create TTS service based on provider selection
  let ttsService;
  switch (options.ttsProvider) {
    case 'openai':
      ttsService = options.openaiApiKey
        ? new OpenAITTSService({ apiKey: options.openaiApiKey })
        : new WebSpeechTTSService();
      break;
    case 'gemini':
      ttsService = options.geminiApiKey
        ? new GeminiTTSService({ apiKey: options.geminiApiKey })
        : new WebSpeechTTSService();
      break;
    case 'elevenlabs':
      ttsService = options.elevenLabsApiKey
        ? new ElevenLabsTTSService({ apiKey: options.elevenLabsApiKey })
        : new WebSpeechTTSService();
      break;
    default:
      ttsService = new WebSpeechTTSService();
  }

  // Create AI Commentary service
  const aiCommentaryService = new AICommentaryService({
    provider: options.aiProvider || 'anthropic',
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
  console.log(`[PRODUCTION MODE] ✅ AI provider: ${options.aiProvider || 'anthropic'}`);
  console.log(`[PRODUCTION MODE] ✅ TTS: ${options.ttsProvider || 'web-speech'}`);
  
  return container.getAll() as ServiceContainer;
}


