import { ITTSService, TTSVoice } from '../types/ITTSService';

type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';

const OPENAI_VOICES: { id: OpenAIVoice; name: string; gender?: 'male' | 'female' }[] = [
  { id: 'alloy', name: 'Alloy' },
  { id: 'echo', name: 'Echo', gender: 'male' },
  { id: 'fable', name: 'Fable' },
  { id: 'onyx', name: 'Onyx', gender: 'male' },
  { id: 'nova', name: 'Nova', gender: 'female' },
  { id: 'shimmer', name: 'Shimmer', gender: 'female' },
];

export interface OpenAITTSConfig {
  apiKey: string;
  voice?: string;
}

export class OpenAITTSService implements ITTSService {
  private apiKey: string;
  private voice: OpenAIVoice;
  private speed: number = 1.0;
  private currentAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;

  constructor(config: OpenAITTSConfig) {
    this.apiKey = config.apiKey;
    this.voice = this.validateVoice(config.voice) || 'onyx';
  }

  async speak(text: string): Promise<void> {
    this.stop();

    const base64Audio = await this.fetchAudio(text);
    const audioData = this.base64ToArrayBuffer(base64Audio);

    // Try AudioContext first for better control, fall back to Audio element
    try {
      await this.playWithAudioElement(audioData);
    } catch (error) {
      console.warn('[OpenAI TTS] Audio element failed, trying AudioContext:', error);
      await this.playWithAudioContext(audioData);
    }
  }

  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.removeAttribute('src');
      this.currentAudio = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
  }

  setVoice(voiceId: string): void {
    const validated = this.validateVoice(voiceId);
    if (validated) {
      this.voice = validated;
    }
  }

  setRate(rate: number): void {
    // OpenAI TTS supports speed 0.25–4.0
    this.speed = Math.max(0.25, Math.min(4.0, rate));
  }

  setPitch(_pitch: number): void {
    // No-op — OpenAI TTS does not support pitch adjustment
  }

  async getAvailableVoices(): Promise<TTSVoice[]> {
    return OPENAI_VOICES.map((v) => ({
      id: v.id,
      name: v.name,
      language: 'en',
      gender: v.gender,
      provider: 'openai' as const,
    }));
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  private async fetchAudio(text: string): Promise<string> {
    const electronProxy = window.electron?.aiProxy;

    if (electronProxy?.ttsRequest) {
      const result = await electronProxy.ttsRequest({
        url: 'https://api.openai.com/v1/audio/speech',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: {
          model: 'tts-1',
          voice: this.voice,
          input: text,
          speed: this.speed,
        },
      });

      if (!result.ok) {
        throw new Error(`OpenAI TTS API error: ${result.status} ${result.statusText}`);
      }

      if (!result.body) {
        throw new Error('OpenAI TTS API returned empty response');
      }

      return result.body;
    }

    // Fallback: direct fetch (works in Node/test contexts, will fail in browser due to CORS)
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice: this.voice,
        input: text,
        speed: this.speed,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI TTS API error: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return this.arrayBufferToBase64(arrayBuffer);
  }

  private async playWithAudioElement(audioData: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([audioData], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.currentAudio = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        this.currentAudio = null;
        resolve();
      };

      audio.onerror = (e) => {
        URL.revokeObjectURL(url);
        this.currentAudio = null;
        reject(new Error(`Audio playback error: ${e}`));
      };

      audio.play().catch((err) => {
        URL.revokeObjectURL(url);
        this.currentAudio = null;
        reject(err);
      });
    });
  }

  private async playWithAudioContext(audioData: ArrayBuffer): Promise<void> {
    this.audioContext = new AudioContext();
    const audioBuffer = await this.audioContext.decodeAudioData(audioData.slice(0));
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    return new Promise((resolve, reject) => {
      source.onended = () => {
        this.audioContext?.close().catch(() => {});
        this.audioContext = null;
        resolve();
      };

      try {
        source.start(0);
      } catch (err) {
        this.audioContext?.close().catch(() => {});
        this.audioContext = null;
        reject(err);
      }
    });
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private validateVoice(voice?: string): OpenAIVoice | null {
    if (!voice) return null;
    const valid = OPENAI_VOICES.find((v) => v.id === voice);
    return valid ? valid.id : null;
  }
}
