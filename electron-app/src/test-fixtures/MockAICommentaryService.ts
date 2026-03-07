import type { IAICommentaryService, AICommentary, PreviousTrackContext } from '../types/IAICommentaryService';

export interface MockCommentaryCall {
  method: string;
  args: unknown[];
  timestamp: number;
}

export interface MockCommentaryConfig {
  shouldFail?: boolean;
  failAfter?: number;
  latencyMs?: number;
  failureError?: string;
  commentaryTemplates?: string[];
}

const DEFAULT_TEMPLATES = [
  "And now we're grooving to {title} by {artist}! What a track!",
  "Up next, the incredible {artist} with {title}. Let's keep the vibe going!",
  "Oh yeah, {title} from the album {album}! {artist} never disappoints!",
  "That was amazing! Now let's turn it up with {artist}'s {title}!",
  "Here's a classic from {artist} - this is {title}! Enjoy!",
];

export class MockAICommentaryService implements IAICommentaryService {
  public callHistory: MockCommentaryCall[] = [];
  public config: MockCommentaryConfig = {};
  private cache: Map<string, AICommentary> = new Map();
  private _callCount = 0;
  private templateIndex = 0;

  constructor(config: MockCommentaryConfig = {}) {
    this.config = config;
  }

  private recordCall(method: string, args: unknown[]): void {
    this.callHistory.push({ method, args, timestamp: Date.now() });
    this._callCount++;
  }

  private async maybeDelay(): Promise<void> {
    if (this.config.latencyMs && this.config.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, this.config.latencyMs));
    }
  }

  private shouldFail(): boolean {
    if (this.config.shouldFail) return true;
    if (this.config.failAfter !== undefined && this._callCount > this.config.failAfter) return true;
    return false;
  }

  async generateCommentary(trackTitle: string, artist: string, album?: string, previousTrack?: PreviousTrackContext): Promise<AICommentary> {
    this.recordCall('generateCommentary', [trackTitle, artist, album, previousTrack]);
    await this.maybeDelay();
    if (this.shouldFail()) {
      throw new Error(this.config.failureError || 'MockAICommentaryService: simulated failure');
    }

    const templates = this.config.commentaryTemplates || DEFAULT_TEMPLATES;
    const template = templates[this.templateIndex % templates.length];
    this.templateIndex++;

    const text = template
      .replace('{title}', trackTitle)
      .replace('{artist}', artist)
      .replace('{album}', album || 'Unknown Album');

    const trackId = `${artist}-${trackTitle}`.toLowerCase().replace(/\s+/g, '-');
    const commentary: AICommentary = {
      text,
      timestamp: new Date(),
      trackId,
    };

    this.cache.set(trackId, commentary);
    return commentary;
  }

  async getCommentaryForTrack(trackId: string): Promise<AICommentary | null> {
    this.recordCall('getCommentaryForTrack', [trackId]);
    return this.cache.get(trackId) || null;
  }

  clearCache(): void {
    this.recordCall('clearCache', []);
    this.cache.clear();
  }

  // Test helpers
  get callCount(): number { return this._callCount; }

  reset(): void {
    this.callHistory = [];
    this._callCount = 0;
    this.cache.clear();
    this.templateIndex = 0;
    this.config = {};
  }

  getCallsFor(method: string): MockCommentaryCall[] {
    return this.callHistory.filter(c => c.method === method);
  }

  wasCalledWith(method: string, ...args: unknown[]): boolean {
    return this.callHistory.some(c =>
      c.method === method && JSON.stringify(c.args) === JSON.stringify(args)
    );
  }
}
