import type { ITTSService, TTSVoice } from '../types/ITTSService';

export interface MockTTSCall {
  method: string;
  args: unknown[];
  timestamp: number;
}

export interface MockTTSConfig {
  shouldFail?: boolean;
  failAfter?: number; // Fail after N calls
  latencyMs?: number;
  failureError?: string;
}

export class MockTTSService implements ITTSService {
  public callHistory: MockTTSCall[] = [];
  public config: MockTTSConfig = {};
  private _voice = 'mock-voice';
  private _rate = 1.0;
  private _pitch = 1.0;
  private _callCount = 0;
  private _speaking = false;

  constructor(config: MockTTSConfig = {}) {
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

  async speak(text: string): Promise<void> {
    this.recordCall('speak', [text]);
    await this.maybeDelay();
    if (this.shouldFail()) {
      throw new Error(this.config.failureError || 'MockTTSService: simulated failure');
    }
    this._speaking = true;
    await new Promise(resolve => setTimeout(resolve, 10));
    this._speaking = false;
  }

  async renderToBlob(text: string): Promise<Blob> {
    this.recordCall('renderToBlob', [text]);
    await this.maybeDelay();
    if (this.shouldFail()) {
      throw new Error(this.config.failureError || 'MockTTSService: simulated failure');
    }
    const header = new Uint8Array([0xFF, 0xFB, 0x90, 0x04]);
    return new Blob([header], { type: 'audio/mpeg' });
  }

  async speakFromBlob(blob: Blob): Promise<void> {
    this.recordCall('speakFromBlob', [blob]);
    await this.maybeDelay();
    if (this.shouldFail()) {
      throw new Error(this.config.failureError || 'MockTTSService: simulated failure');
    }
    this._speaking = true;
    await new Promise(resolve => setTimeout(resolve, 10));
    this._speaking = false;
  }

  stop(): void {
    this.recordCall('stop', []);
    this._speaking = false;
  }

  setVoice(voice: string): void {
    this.recordCall('setVoice', [voice]);
    this._voice = voice;
  }

  setRate(rate: number): void {
    this.recordCall('setRate', [rate]);
    this._rate = rate;
  }

  setPitch(pitch: number): void {
    this.recordCall('setPitch', [pitch]);
    this._pitch = pitch;
  }

  async getAvailableVoices(): Promise<TTSVoice[]> {
    this.recordCall('getAvailableVoices', []);
    return [
      { id: 'mock-voice-1', name: 'Mock Voice 1', language: 'en-US', gender: 'female', provider: 'openai' },
      { id: 'mock-voice-2', name: 'Mock Voice 2', language: 'en-US', gender: 'male', provider: 'openai' },
    ];
  }

  isAvailable(): boolean {
    this.recordCall('isAvailable', []);
    return !this.config.shouldFail;
  }

  // Test helpers
  get voice(): string { return this._voice; }
  get rate(): number { return this._rate; }
  get pitch(): number { return this._pitch; }
  get speaking(): boolean { return this._speaking; }
  get callCount(): number { return this._callCount; }

  reset(): void {
    this.callHistory = [];
    this._callCount = 0;
    this._voice = 'mock-voice';
    this._rate = 1.0;
    this._pitch = 1.0;
    this._speaking = false;
    this.config = {};
  }

  getCallsFor(method: string): MockTTSCall[] {
    return this.callHistory.filter(c => c.method === method);
  }

  wasCalledWith(method: string, ...args: unknown[]): boolean {
    return this.callHistory.some(c =>
      c.method === method && JSON.stringify(c.args) === JSON.stringify(args)
    );
  }
}
