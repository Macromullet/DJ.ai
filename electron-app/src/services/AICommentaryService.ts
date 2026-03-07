import { IAICommentaryService, AICommentary, PreviousTrackContext } from '../types/IAICommentaryService';
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

  /** The DJ persona system prompt — shared across all providers */
  private static readonly DJ_SYSTEM_PROMPT = [
    'You are a veteran late-night radio DJ with decades behind the mic.',
    'You talk TO your listeners like old friends — warm, natural, unscripted.',
    '',
    'RULES (follow every single one):',
    '- NEVER open with biographical facts ("Artist X is from City Y", "Formed in 19XX")',
    '- NEVER sound like Wikipedia, a press release, or a music encyclopedia',
    '- ALWAYS address your listeners: "you", "we", "y\'all", "folks"',
    '- Talk about the VIBE and FEEL of the music, not its chart position or sales figures',
    '- Be era-aware: if the track is from the 70s say things like "groovy", 80s "totally rad", 90s "dope", 2000s+ "fire" — but keep it natural, don\'t force slang',
    '- Vary your openings EVERY TIME: sometimes reference what just played, sometimes hype what\'s coming, sometimes share a quick personal memory, sometimes just set the mood',
    '- Keep it to 2-3 sentences MAX. This plays BETWEEN songs — you\'re not doing a monologue',
    '- Sound like you\'re TALKING, not reading. Use contractions. Use sentence fragments. Be human.',
    '- No asterisks, no emojis, no markdown formatting',
    '- Occasionally drop personal touches: "this one takes me back", "I never get tired of this one", "oh man, here we go"',
    '- If you know the song, you can mention ONE cool detail (not a fact dump) — like "that guitar riff is legendary" or "this chorus is impossible not to sing along to"',
  ].join('\n');

  constructor(config: AICommentaryConfig) {
    this.config = config;
  }

  /**
   * Generate commentary for a track (IAICommentaryService interface)
   */
  async generateCommentary(
    trackTitle: string,
    artist: string,
    album?: string,
    previousTrack?: PreviousTrackContext
  ): Promise<AICommentary> {
    const trackId = `${artist}-${trackTitle}`.toLowerCase().replace(/\s+/g, '-');

    // Check cache first
    const cached = this.cache.get(trackId);
    if (cached) {
      return cached;
    }

    const prompt = this.buildDJPrompt(trackTitle, artist, album, previousTrack);

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
          commentaryText = this.getFallbackCommentary(trackTitle, artist, album, previousTrack);
      }
    } catch (error) {
      console.warn('AI Commentary failed, using fallback:', error);
      commentaryText = this.getFallbackCommentary(trackTitle, artist, album, previousTrack);
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
  async generateCommentaryForTrack(track: Track, previousTrack?: Track): Promise<string> {
    const prev = previousTrack ? { title: previousTrack.name, artist: previousTrack.artist } : undefined;
    const commentary = await this.generateCommentary(track.name, track.artist, track.album, prev);
    return commentary.text;
  }

  /**
   * Build the user prompt with DJ-natural phrasing and optional transition context
   */
  private buildDJPrompt(
    trackTitle: string,
    artist: string,
    album?: string,
    previousTrack?: PreviousTrackContext
  ): string {
    const parts: string[] = [];

    if (previousTrack) {
      parts.push(
        `The last song was "${previousTrack.title}" by ${previousTrack.artist}.`
      );
    }

    parts.push(
      `You're about to play "${trackTitle}" by ${artist}${album ? ` from the album "${album}"` : ''}.`
    );

    parts.push(
      'Give me your natural DJ intro — the kind of thing you\'d say between songs on a late-night radio show. Talk TO your listeners, not AT them. Don\'t describe the artist like a textbook. Just vibe with it.'
    );

    return parts.join(' ');
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

    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: AICommentaryService.DJ_SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      max_tokens: 150,
      temperature: 0.9
    };

    const electronProxy = (window as any).electron?.aiProxy;

    if (electronProxy) {
      // Route through Electron main process (no CORS issues)
      const result = await electronProxy.request({
        url: 'https://api.openai.com/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.openaiApiKey}`
        },
        body: requestBody,
      });

      if (!result.ok) {
        throw new Error(`OpenAI API error: ${result.status} ${result.statusText}`);
      }

      const data = JSON.parse(result.body);
      return data.choices[0]?.message?.content?.trim() || this.getFallbackCommentary('', '');
    }

    // Fallback: direct fetch (works in Node/test contexts, will fail in browser due to CORS)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.openaiApiKey}`
      },
      body: JSON.stringify(requestBody)
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
          system: AICommentaryService.DJ_SYSTEM_PROMPT,
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
        system: AICommentaryService.DJ_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0]?.text || this.getFallbackCommentary('', '');
  }

  private getFallbackCommentary(trackTitle: string, artist: string, album?: string, previousTrack?: PreviousTrackContext): string {
    const transitionTemplates = previousTrack ? [
      `Hope you dug that one. Alright, let's keep it rolling — here's ${artist} with ${trackTitle}.`,
      `What a vibe. Now we're switching gears a bit — this is ${trackTitle} by ${artist}. Turn it up.`,
      `Beautiful. Okay, coming at you next — ${artist}, ${trackTitle}. You're gonna love this.`,
      `Man, ${previousTrack.artist} never gets old. But check this out — ${artist} is up next with ${trackTitle}.`,
      `That was ${previousTrack.artist} doing their thing. Now let's get into some ${artist}. This is ${trackTitle}.`,
    ] : [];

    const freshTemplates = [
      `Alright folks, here we go — ${artist} with ${trackTitle}${album ? ` off ${album}` : ''}. Sit back and enjoy this one.`,
      `Oh yeah, this is a good one. ${trackTitle} by ${artist}. You know it, you love it.`,
      `Let's get into it. This is ${artist} — ${trackTitle}${album ? `, off ${album}` : ''}. Here we go.`,
      `Okay okay okay. ${artist} coming through with ${trackTitle}${album ? ` from ${album}` : ''}. I never get tired of this one.`,
      `Here's something special for ya. ${trackTitle} from ${artist}. Crank it up.`,
      `This one takes me back. ${artist}, ${trackTitle}. Let the music do the talking.`,
    ];

    const templates = transitionTemplates.length > 0 ? transitionTemplates : freshTemplates;
    return templates[Math.floor(Math.random() * templates.length)];
  }

  updateConfig(config: Partial<AICommentaryConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
