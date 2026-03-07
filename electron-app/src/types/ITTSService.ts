// Text-to-Speech Service Interface
export interface ITTSService {
  speak(text: string): Promise<void>;
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


