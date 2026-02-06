import { ITTSService, TTSVoice } from '../types/ITTSService';

export class WebSpeechTTSService implements ITTSService {
  private synth: SpeechSynthesis;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private rate = 1.0;
  private pitch = 1.0;

  constructor() {
    if (!('speechSynthesis' in window)) {
      throw new Error('Web Speech API not supported in this browser');
    }
    this.synth = window.speechSynthesis;
  }

  async speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stop(); // Stop any current speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }

      utterance.onend = () => {
        resolve();
      };

      utterance.onerror = (event) => {
        reject(new Error(`Speech synthesis error: ${event.error}`));
      };

      this.synth.speak(utterance);
    });
  }

  stop(): void {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
  }

  setVoice(voiceId: string): void {
    const voices = this.synth.getVoices();
    this.selectedVoice = voices.find(v => v.voiceURI === voiceId) || null;
  }

  setRate(rate: number): void {
    this.rate = Math.max(0.1, Math.min(10, rate));
  }

  setPitch(pitch: number): void {
    this.pitch = Math.max(0, Math.min(2, pitch));
  }

  async getAvailableVoices(): Promise<TTSVoice[]> {
    return new Promise((resolve) => {
      const getVoices = () => {
        const voices = this.synth.getVoices();
        if (voices.length > 0) {
          resolve(voices.map(v => ({
            id: v.voiceURI,
            name: v.name,
            language: v.lang,
            provider: 'web-speech' as const,
          })));
        }
      };

      getVoices();
      
      // Some browsers load voices asynchronously
      if (this.synth.getVoices().length === 0) {
        this.synth.onvoiceschanged = getVoices;
      }
    });
  }

  isAvailable(): boolean {
    return 'speechSynthesis' in window;
  }
}
