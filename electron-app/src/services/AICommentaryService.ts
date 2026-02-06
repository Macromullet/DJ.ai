import { IAICommentaryService, AICommentary } from '../types/IAICommentaryService';
import { Track } from '../types';

export interface AICommentaryConfig {
  provider: 'copilot' | 'openai' | 'anthropic';
  openaiApiKey?: string;
  anthropicApiKey?: string;
}

/**
 * AI Commentary Service
 * Generates DJ-style commentary about tracks
 * Implements IAICommentaryService interface for DI container compatibility
 */
export class AICommentaryService implements IAICommentaryService {
  private config: AICommentaryConfig;
  private cache: Map<string, AICommentary> = new Map();

  constructor(config: AICommentaryConfig) {
    this.config = config;
  }

  /**
   * Generate commentary for a track (IAICommentaryService interface)
   */
  async generateCommentary(
    trackTitle: string,
    artist: string,
    album?: string
  ): Promise<AICommentary> {
    const trackId = `${artist}-${trackTitle}`.toLowerCase().replace(/\s+/g, '-');

    // Check cache first
    const cached = this.cache.get(trackId);
    if (cached) {
      return cached;
    }

    const prompt = `You are a charismatic radio DJ. Generate a short, enthusiastic 2-3 sentence commentary about the song "${trackTitle}" by ${artist}${album ? ` from the album "${album}"` : ''}. Include interesting facts about the artist, the song's history, or cultural impact. Keep it conversational and engaging, like a real DJ would say. Don't use asterisks or emojis.`;

    let commentaryText: string;

    try {
      switch (this.config.provider) {
        case 'copilot':
          commentaryText = await this.generateWithCopilot(prompt);
          break;
        case 'openai':
          commentaryText = await this.generateWithOpenAI(prompt);
          break;
        case 'anthropic':
          commentaryText = await this.generateWithAnthropic(prompt);
          break;
        default:
          commentaryText = this.getFallbackCommentary(trackTitle, artist, album);
      }
    } catch (error) {
      console.warn('AI Commentary failed, using fallback:', error);
      commentaryText = this.getFallbackCommentary(trackTitle, artist, album);
    }

    const commentary: AICommentary = {
      text: commentaryText,
      timestamp: new Date(),
      trackId,
    };

    // Cache for future use
    this.cache.set(trackId, commentary);

    return commentary;
  }

  /**
   * Get cached commentary for a track
   */
  async getCommentaryForTrack(trackId: string): Promise<AICommentary | null> {
    return this.cache.get(trackId) || null;
  }

  /**
   * Clear commentary cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Legacy method for backward compatibility with Track type
   */
  async generateCommentaryForTrack(track: Track): Promise<string> {
    const commentary = await this.generateCommentary(track.name, track.artist, track.album);
    return commentary.text;
  }

  private async generateWithCopilot(prompt: string): Promise<string> {
    const electron = (window as any).electron;
    if (electron?.copilot) {
      const response = await electron.copilot.chat(prompt);
      return response || this.getFallbackCommentary('', '');
    }
    throw new Error('Copilot not available');
  }

  private async generateWithOpenAI(prompt: string): Promise<string> {
    if (!this.config.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an enthusiastic radio DJ.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 150,
        temperature: 0.8
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || this.getFallbackCommentary('', '');
  }

  private async generateWithAnthropic(prompt: string): Promise<string> {
    if (!this.config.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const electronProxy = (window as any).electron?.aiProxy;

    if (electronProxy) {
      // Route through Electron main process (no CORS issues)
      const result = await electronProxy.request({
        url: 'https://api.anthropic.com/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: {
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{ role: 'user', content: prompt }],
        },
      });

      if (!result.ok) {
        throw new Error(`Anthropic API error: ${result.status} ${result.statusText}`);
      }

      const data = JSON.parse(result.body);
      return data.content[0]?.text || this.getFallbackCommentary('', '');
    }

    // Fallback: direct fetch (works in Node/test contexts, will fail in browser due to CORS)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || this.getFallbackCommentary('', '');
  }

  private getFallbackCommentary(trackTitle: string, artist: string, album?: string): string {
    const templates = [
      `Now playing "${trackTitle}" by ${artist}${album ? ` from the album "${album}"` : ''}. Let the music take you away.`,
      `Here's a great one - "${trackTitle}" by ${artist}. Turn it up and enjoy.`,
      `Coming at you with "${trackTitle}" from ${artist}. This is what music is all about.`,
      `${artist} bringing you "${trackTitle}". Feel that groove.`,
      `This is "${trackTitle}", a fantastic track by ${artist}. You're gonna love this one.`,
      `${artist} with "${trackTitle}"${album ? ` off the album "${album}"` : ''}. Classic!`,
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  updateConfig(config: Partial<AICommentaryConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
