import { ITTSService, TTSVoice } from '../types/ITTSService';

const ELEVENLABS_VOICES: { id: string; name: string; gender?: 'male' | 'female' }[] = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', gender: 'female' },
  { id: '29vD33N1CtxCmqQRPOHJ', name: 'Drew', gender: 'male' },
  { id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde', gender: 'male' },
  { id: '5Q0t7uMcjvnagumLfvZi', name: 'Paul', gender: 'male' },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', gender: 'female' },
  { id: 'CYw3kZ02Hs0563khs1Fj', name: 'Dave', gender: 'male' },
  { id: 'D38z5RcWu1voky8WS1ja', name: 'Fin', gender: 'male' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female' },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Antoni', gender: 'male' },
  { id: 'GBv7mTt0atIp3Br8iCZE', name: 'Thomas', gender: 'male' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', gender: 'male' },
  { id: 'LcfcDJNUP1GQjkzn1xUU', name: 'Emily', gender: 'female' },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', gender: 'male' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', gender: 'male' },
  { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', gender: 'male' },
];

export interface ElevenLabsTTSConfig {
  apiKey: string;
  voice?: string;
}

export class ElevenLabsTTSService implements ITTSService {
  private apiKey: string;
  private voiceId: string;
  private stability: number = 0.5;
  private similarityBoost: number = 0.75;
  private currentAudio: HTMLAudioElement | null = null;
  private audioContext: AudioContext | null = null;

  constructor(config: ElevenLabsTTSConfig) {
    this.apiKey = config.apiKey;
    this.voiceId = this.validateVoice(config.voice) || '21m00Tcm4TlvDq8ikWAM'; // Rachel
  }

  async speak(text: string): Promise<void> {
    this.stop();

    const base64Audio = await this.fetchAudio(text);
    const audioData = this.base64ToArrayBuffer(base64Audio);

    try {
      await this.playWithAudioElement(audioData);
    } catch (error) {
      console.warn('[ElevenLabs TTS] Audio element failed, trying AudioContext:', error);
      await this.playWithAudioContext(audioData);
    }
  }

  async renderToBlob(text: string): Promise<Blob> {
    const base64Audio = await this.fetchAudio(text);
    const audioData = this.base64ToArrayBuffer(base64Audio);
    return new Blob([audioData], { type: 'audio/mpeg' });
  }

  async speakFromBlob(blob: Blob): Promise<void> {
    this.stop();
    const audioData = await blob.arrayBuffer();
    try {
      await this.playWithAudioElement(audioData);
    } catch (error) {
      console.warn('[ElevenLabs TTS] Audio element failed, trying AudioContext:', error);
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
      this.voiceId = validated;
    }
  }

  setRate(rate: number): void {
    // ElevenLabs uses stability (0–1) rather than a speed parameter.
    // Map rate (0.5–2.0) to stability (0.8–0.2): slower speech ≈ higher stability.
    this.stability = Math.max(0.0, Math.min(1.0, 1.0 - (rate - 0.5) * 0.4));
  }

  setPitch(_pitch: number): void {
    // No-op — ElevenLabs does not support direct pitch adjustment
  }

  async getAvailableVoices(): Promise<TTSVoice[]> {
    return ELEVENLABS_VOICES.map((v) => ({
      id: v.id,
      name: v.name,
      language: 'en',
      gender: v.gender,
      provider: 'elevenlabs' as const,
    }));
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  private async fetchAudio(text: string): Promise<string> {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`;
    const body = {
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: {
        stability: this.stability,
        similarity_boost: this.similarityBoost,
        style: 0.0,
        use_speaker_boost: true,
      },
    };

    const electronProxy = window.electron?.aiProxy;

    if (electronProxy?.ttsRequest) {
      const result = await electronProxy.ttsRequest({
        url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
          'Accept': 'audio/mpeg',
        },
        body,
      });

      if (!result.ok) {
        throw new Error(`ElevenLabs TTS API error: ${result.status} ${result.statusText}`);
      }

      if (!result.body) {
        throw new Error('ElevenLabs TTS API returned empty response');
      }

      return result.body;
    }

    // Fallback: direct fetch (works in Node/test contexts, will fail in browser due to CORS)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': this.apiKey,
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS API error: ${response.status} ${response.statusText}`);
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

  private validateVoice(voiceId?: string): string | null {
    if (!voiceId) return null;
    const valid = ELEVENLABS_VOICES.find((v) => v.id === voiceId);
    return valid ? valid.id : null;
  }
}
