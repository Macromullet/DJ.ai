// Text-to-Speech Service Interface
export interface ITTSService {
  speak(text: string): Promise<void>;
  /** Pre-render audio without playing. Returns a Blob that can be played later via speakFromBlob(). */
  renderToBlob?(text: string): Promise<Blob>;
  /** Play a pre-rendered audio Blob. */
  speakFromBlob?(blob: Blob): Promise<void>;
  stop(): void;
  setVoice(voice: string): void;
  setRate(rate: number): void;
  setPitch(pitch: number): void;
  getAvailableVoices(): Promise<TTSVoice[]>;
  isAvailable(): boolean;
}

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender?: 'male' | 'female';
  provider: 'web-speech' | 'openai' | 'elevenlabs' | 'gemini';
}


