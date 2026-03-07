import { ITTSService, TTSVoice } from '../types/ITTSService';

const GEMINI_TTS_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent';

const PCM_SAMPLE_RATE = 24000;
const PCM_CHANNELS = 1;
const PCM_BITS_PER_SAMPLE = 16;

type GeminiVoiceName =
  | 'Kore'
  | 'Achernar'
  | 'Algieba'
  | 'Autonoe'
  | 'Callirrhoe'
  | 'Despina'
  | 'Erinome'
  | 'Fenrir'
  | 'Gacrux'
  | 'Iapetus'
  | 'Leda'
  | 'Orus'
  | 'Puck'
  | 'Schedar'
  | 'Umbriel'
  | 'Zephyr';

const GEMINI_VOICES: { id: GeminiVoiceName; name: string; gender?: 'male' | 'female' }[] = [
  { id: 'Kore', name: 'Kore', gender: 'female' },
  { id: 'Achernar', name: 'Achernar', gender: 'female' },
  { id: 'Algieba', name: 'Algieba', gender: 'male' },
  { id: 'Autonoe', name: 'Autonoe', gender: 'female' },
  { id: 'Callirrhoe', name: 'Callirrhoe', gender: 'female' },
  { id: 'Despina', name: 'Despina', gender: 'female' },
  { id: 'Erinome', name: 'Erinome', gender: 'female' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male' },
  { id: 'Gacrux', name: 'Gacrux', gender: 'male' },
  { id: 'Iapetus', name: 'Iapetus', gender: 'male' },
  { id: 'Leda', name: 'Leda', gender: 'female' },
  { id: 'Orus', name: 'Orus', gender: 'male' },
  { id: 'Puck', name: 'Puck', gender: 'male' },
  { id: 'Schedar', name: 'Schedar', gender: 'male' },
  { id: 'Umbriel', name: 'Umbriel', gender: 'male' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'male' },
];

export interface GeminiTTSConfig {
  apiKey: string;
  voice?: string;
}

export class GeminiTTSService implements ITTSService {
  private apiKey: string;
  private voice: GeminiVoiceName;
  private currentAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;

  constructor(config: GeminiTTSConfig) {
    this.apiKey = config.apiKey;
    this.voice = this.validateVoice(config.voice) || 'Kore';
  }

  async speak(text: string): Promise<void> {
    this.stop();

    const pcmBase64 = await this.fetchAudio(text);
    const pcmData = this.base64ToArrayBuffer(pcmBase64);
    const wavData = this.pcmToWav(pcmData);

    try {
      await this.playWithAudioElement(wavData);
    } catch (error) {
      console.warn('[Gemini TTS] Audio element failed, trying AudioContext:', error);
      await this.playWithAudioContext(wavData);
    }
  }

  async renderToBlob(text: string): Promise<Blob> {
    const pcmBase64 = await this.fetchAudio(text);
    const pcmData = this.base64ToArrayBuffer(pcmBase64);
    const wavData = this.pcmToWav(pcmData);
    return new Blob([wavData], { type: 'audio/wav' });
  }

  async speakFromBlob(blob: Blob): Promise<void> {
    this.stop();
    const audioData = await blob.arrayBuffer();
    try {
      await this.playWithAudioElement(audioData);
    } catch (error) {
      console.warn('[Gemini TTS] Audio element failed, trying AudioContext:', error);
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

  setRate(_rate: number): void {
    // No-op — Gemini TTS does not support speed adjustment
  }

  setPitch(_pitch: number): void {
    // No-op — Gemini TTS does not support pitch adjustment
  }

  async getAvailableVoices(): Promise<TTSVoice[]> {
    return GEMINI_VOICES.map((v) => ({
      id: v.id,
      name: v.name,
      language: 'en',
      gender: v.gender,
      provider: 'gemini' as const,
    }));
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  private buildRequestBody(text: string): unknown {
    return {
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        response_modalities: ['AUDIO'],
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: this.voice,
            },
          },
        },
      },
    };
  }

  private extractAudioFromResponse(json: Record<string, unknown>): string {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const candidates = (json as any)?.candidates;
    const part = candidates?.[0]?.content?.parts?.[0];
    const data = part?.inline_data?.data;
    /* eslint-enable @typescript-eslint/no-explicit-any */

    if (typeof data !== 'string' || data.length === 0) {
      throw new Error('Gemini TTS response did not contain audio data');
    }
    return data;
  }

  private async fetchAudio(text: string): Promise<string> {
    // Gemini returns JSON with base64 audio, so use the regular request channel
    const electronProxy = window.electron?.aiProxy;

    if (electronProxy?.request) {
      const result = await electronProxy.request({
        url: GEMINI_TTS_ENDPOINT,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': this.apiKey,
        },
        body: this.buildRequestBody(text),
      });

      if (!result.ok) {
        throw new Error(`Gemini TTS API error: ${result.status} ${result.statusText}`);
      }

      if (!result.body) {
        throw new Error('Gemini TTS API returned empty response');
      }

      const json = JSON.parse(result.body) as Record<string, unknown>;
      return this.extractAudioFromResponse(json);
    }

    // Fallback: direct fetch (works in Node/test contexts, will fail in browser due to CORS)
    const response = await fetch(GEMINI_TTS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey,
      },
      body: JSON.stringify(this.buildRequestBody(text)),
    });

    if (!response.ok) {
      throw new Error(`Gemini TTS API error: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as Record<string, unknown>;
    return this.extractAudioFromResponse(json);
  }

  /** Wrap raw PCM (16-bit, mono, 24 kHz) in a WAV container so browsers can play it. */
  private pcmToWav(pcmData: ArrayBuffer): ArrayBuffer {
    const dataLength = pcmData.byteLength;
    const byteRate = PCM_SAMPLE_RATE * PCM_CHANNELS * (PCM_BITS_PER_SAMPLE / 8);
    const blockAlign = PCM_CHANNELS * (PCM_BITS_PER_SAMPLE / 8);

    // 44-byte WAV header + PCM data
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    this.writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // sub-chunk size (PCM = 16)
    view.setUint16(20, 1, true); // audio format (1 = PCM)
    view.setUint16(22, PCM_CHANNELS, true);
    view.setUint32(24, PCM_SAMPLE_RATE, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, PCM_BITS_PER_SAMPLE, true);

    // data sub-chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataLength, true);

    // Copy PCM samples after header
    new Uint8Array(buffer, 44).set(new Uint8Array(pcmData));

    return buffer;
  }

  private writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  private async playWithAudioElement(audioData: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const blob = new Blob([audioData], { type: 'audio/wav' });
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

  private validateVoice(voice?: string): GeminiVoiceName | null {
    if (!voice) return null;
    const valid = GEMINI_VOICES.find((v) => v.id === voice);
    return valid ? valid.id : null;
  }
}
