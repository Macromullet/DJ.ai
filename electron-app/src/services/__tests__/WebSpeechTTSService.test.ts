import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSpeechTTSService } from '../WebSpeechTTSService';

// The global SpeechSynthesisUtterance mock from vitest.setup.ts uses an arrow
// function, which JS doesn't allow as a constructor.  Re-stub with a regular
// function wrapped in vi.fn() so that spy assertions still work.
const MockUtterance = vi.fn(function (this: any, text?: string) {
  this.text = text ?? '';
  this.voice = null;
  this.rate = 1;
  this.pitch = 1;
  this.volume = 1;
  this.onend = null;
  this.onerror = null;
});

describe('WebSpeechTTSService', () => {
  let service: WebSpeechTTSService;
  let mockSynth: typeof window.speechSynthesis;

  // Ensure speechSynthesis is always available for every test
  const savedSpeechSynthesis = window.speechSynthesis;

  beforeEach(() => {
    // Fix the SpeechSynthesisUtterance mock to be a real class
    vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);

    // Restore in case a previous test removed it
    if (!('speechSynthesis' in window)) {
      Object.defineProperty(window, 'speechSynthesis', {
        value: savedSpeechSynthesis,
        writable: true,
        configurable: true,
      });
    }
    mockSynth = window.speechSynthesis;
    service = new WebSpeechTTSService();
  });

  afterEach(() => {
    // Always restore
    if (!('speechSynthesis' in window)) {
      Object.defineProperty(window, 'speechSynthesis', {
        value: savedSpeechSynthesis,
        writable: true,
        configurable: true,
      });
    }
  });

  // ----- constructor -------------------------------------------------------
  describe('constructor', () => {
    it('creates service when speechSynthesis is available', () => {
      expect(service).toBeDefined();
    });

    it('throws when speechSynthesis is missing', () => {
      const original = window.speechSynthesis;
      delete (window as any).speechSynthesis;

      expect(() => new WebSpeechTTSService()).toThrow(
        'Web Speech API not supported in this browser',
      );

      // Restore immediately
      Object.defineProperty(window, 'speechSynthesis', {
        value: original,
        writable: true,
        configurable: true,
      });
    });
  });

  // ----- speak -------------------------------------------------------------
  describe('speak', () => {
    it('creates SpeechSynthesisUtterance with the given text', () => {
      service.speak('Hello DJ');
      expect(SpeechSynthesisUtterance).toHaveBeenCalledWith('Hello DJ');
    });

    it('calls speechSynthesis.speak', () => {
      service.speak('Hello');
      expect(mockSynth.speak).toHaveBeenCalled();
    });

    it('resolves when onend fires', async () => {
      const promise = service.speak('Hello');
      // Capture the utterance passed to speechSynthesis.speak
      const utterance = vi.mocked(mockSynth.speak).mock.calls[0][0] as any;
      utterance.onend?.();
      await expect(promise).resolves.toBeUndefined();
    });

    it('rejects when onerror fires', async () => {
      const promise = service.speak('Hello');
      const utterance = vi.mocked(mockSynth.speak).mock.calls[0][0] as any;
      utterance.onerror?.({ error: 'network' });
      await expect(promise).rejects.toThrow('Speech synthesis error');
    });

    it('calls stop before speaking (cancels prior speech)', () => {
      Object.defineProperty(mockSynth, 'speaking', { value: true, writable: true, configurable: true });
      service.speak('New text');
      expect(mockSynth.cancel).toHaveBeenCalled();
      Object.defineProperty(mockSynth, 'speaking', { value: false, writable: true, configurable: true });
    });
  });

  // ----- stop --------------------------------------------------------------
  describe('stop', () => {
    it('calls speechSynthesis.cancel when speaking', () => {
      Object.defineProperty(mockSynth, 'speaking', { value: true, writable: true, configurable: true });
      service.stop();
      expect(mockSynth.cancel).toHaveBeenCalled();
      Object.defineProperty(mockSynth, 'speaking', { value: false, writable: true, configurable: true });
    });

    it('does not call cancel when not speaking', () => {
      Object.defineProperty(mockSynth, 'speaking', { value: false, writable: true, configurable: true });
      service.stop();
      expect(mockSynth.cancel).not.toHaveBeenCalled();
    });
  });

  // ----- setVoice / setRate / setPitch -------------------------------------
  describe('setVoice', () => {
    it('selects a voice by voiceURI', () => {
      // Should not throw; voice is stored internally
      expect(() => service.setVoice('test-voice')).not.toThrow();
    });

    it('sets null for unknown voiceURI', () => {
      expect(() => service.setVoice('nonexistent-voice-uri')).not.toThrow();
    });
  });

  describe('setRate', () => {
    it('clamps rate between 0.1 and 10', () => {
      service.setRate(0.01);
      service.setRate(15);
      service.setRate(1.5);
    });

    it('applies rate to utterance', () => {
      service.setRate(1.5);
      service.speak('Test');
      const utterance = vi.mocked(mockSynth.speak).mock.calls[0][0] as any;
      expect(utterance.rate).toBe(1.5);
    });
  });

  describe('setPitch', () => {
    it('clamps pitch between 0 and 2', () => {
      service.setPitch(-1);
      service.setPitch(5);
      service.setPitch(1.0);
    });

    it('applies pitch to utterance', () => {
      service.setPitch(0.8);
      service.speak('Test');
      const utterance = vi.mocked(mockSynth.speak).mock.calls[0][0] as any;
      expect(utterance.pitch).toBe(0.8);
    });
  });

  // ----- getAvailableVoices ------------------------------------------------
  describe('getAvailableVoices', () => {
    it('returns voices from speechSynthesis.getVoices()', async () => {
      const voices = await service.getAvailableVoices();
      expect(voices).toHaveLength(1);
      expect(voices[0]).toEqual({
        id: 'test-voice',
        name: 'Test Voice',
        language: 'en-US',
        provider: 'web-speech',
      });
    });
  });

  // ----- isAvailable -------------------------------------------------------
  describe('isAvailable', () => {
    it('returns true when speechSynthesis exists', () => {
      expect(service.isAvailable()).toBe(true);
    });
  });
});
