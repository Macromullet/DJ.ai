import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAITTSService } from '../OpenAITTSService';

const FAKE_BASE64_AUDIO = btoa('fake-audio-data-for-testing');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupTtsRequestMock(
  override?: Partial<{ ok: boolean; status: number; statusText: string; body: string | null }>,
) {
  const ttsRequest = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    body: FAKE_BASE64_AUDIO,
    ...override,
  });
  (window.electron as any).aiProxy.ttsRequest = ttsRequest;
  return ttsRequest;
}

/** Class-based Audio mock whose play() auto-triggers onended. */
let audioInstances: InstanceType<typeof AutoPlayAudio>[] = [];
class AutoPlayAudio {
  src = '';
  volume = 1;
  currentTime = 0;
  duration = 180;
  paused = true;
  onended: (() => void) | null = null;
  oncanplaythrough: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  play = vi.fn().mockImplementation(() => {
    queueMicrotask(() => this.onended?.());
    return Promise.resolve();
  });
  pause = vi.fn();
  load = vi.fn();
  removeAttribute = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  constructor() {
    audioInstances.push(this);
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OpenAITTSService', () => {
  const OriginalMockAudio = globalThis.Audio;
  let service: OpenAITTSService;

  beforeEach(() => {
    audioInstances = [];
    vi.stubGlobal('Audio', AutoPlayAudio);
    service = new OpenAITTSService({ apiKey: 'test-api-key' });
    delete (window.electron as any).aiProxy.ttsRequest;
  });

  afterEach(() => {
    vi.stubGlobal('Audio', OriginalMockAudio);
  });

  // ----- constructor -------------------------------------------------------
  describe('constructor', () => {
    it('sets apiKey and defaults voice to onyx', () => {
      expect(service.isAvailable()).toBe(true);
    });

    it('accepts a custom valid voice', async () => {
      const svc = new OpenAITTSService({ apiKey: 'k', voice: 'nova' });
      const tts = setupTtsRequestMock();
      await svc.speak('hi');
      expect(tts).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.objectContaining({ voice: 'nova' }) }),
      );
    });

    it('falls back to onyx for an invalid voice', async () => {
      const svc = new OpenAITTSService({ apiKey: 'k', voice: 'bad' });
      const tts = setupTtsRequestMock();
      await svc.speak('hi');
      expect(tts).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.objectContaining({ voice: 'onyx' }) }),
      );
    });
  });

  // ----- setVoice / setRate / setPitch -------------------------------------
  describe('setVoice', () => {
    it('updates voice for a valid id', async () => {
      service.setVoice('shimmer');
      const tts = setupTtsRequestMock();
      await service.speak('hi');
      expect(tts).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.objectContaining({ voice: 'shimmer' }) }),
      );
    });

    it('ignores an invalid voice id', async () => {
      service.setVoice('does-not-exist');
      const tts = setupTtsRequestMock();
      await service.speak('hi');
      expect(tts).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.objectContaining({ voice: 'onyx' }) }),
      );
    });
  });

  describe('setRate', () => {
    it('clamps rate to the 0.25–4.0 range', async () => {
      service.setRate(0.1);
      const tts = setupTtsRequestMock();
      await service.speak('hi');
      expect(tts).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.objectContaining({ speed: 0.25 }) }),
      );
    });

    it('clamps high values', async () => {
      service.setRate(10);
      const tts = setupTtsRequestMock();
      await service.speak('hi');
      expect(tts).toHaveBeenCalledWith(
        expect.objectContaining({ body: expect.objectContaining({ speed: 4.0 }) }),
      );
    });
  });

  describe('setPitch', () => {
    it('is a no-op (does not throw)', () => {
      expect(() => service.setPitch(2.0)).not.toThrow();
    });
  });

  // ----- getAvailableVoices ------------------------------------------------
  describe('getAvailableVoices', () => {
    it('returns 6 OpenAI voices', async () => {
      const voices = await service.getAvailableVoices();
      expect(voices).toHaveLength(6);
      expect(voices.map((v) => v.id)).toEqual([
        'alloy',
        'echo',
        'fable',
        'onyx',
        'nova',
        'shimmer',
      ]);
    });

    it('every voice has the openai provider', async () => {
      const voices = await service.getAvailableVoices();
      expect(voices.every((v) => v.provider === 'openai')).toBe(true);
      expect(voices.every((v) => v.language === 'en')).toBe(true);
    });
  });

  // ----- isAvailable -------------------------------------------------------
  describe('isAvailable', () => {
    it('returns true when apiKey is set', () => {
      expect(service.isAvailable()).toBe(true);
    });

    it('returns false when apiKey is empty', () => {
      expect(new OpenAITTSService({ apiKey: '' }).isAvailable()).toBe(false);
    });
  });

  // ----- speak -------------------------------------------------------------
  describe('speak', () => {
    it('calls ttsRequest with correct parameters', async () => {
      const tts = setupTtsRequestMock();
      await service.speak('Hello world');

      expect(tts).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.openai.com/v1/audio/speech',
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
          body: expect.objectContaining({
            model: 'tts-1',
            voice: 'onyx',
            input: 'Hello world',
            speed: 1.0,
          }),
        }),
      );
    });

    it('plays audio via Audio element after successful fetch', async () => {
      setupTtsRequestMock();
      await service.speak('Hello');

      expect(audioInstances).toHaveLength(1);
      expect(audioInstances[0].play).toHaveBeenCalled();
    });

    it('falls back to fetch when ttsRequest is unavailable', async () => {
      // ttsRequest is deleted in beforeEach — fetch path is used
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: new Headers(),
      } as any);

      await service.speak('Test');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/audio/speech',
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('throws on API error from ttsRequest', async () => {
      setupTtsRequestMock({ ok: false, status: 401, statusText: 'Unauthorized' });
      await expect(service.speak('Test')).rejects.toThrow(
        'OpenAI TTS API error: 401 Unauthorized',
      );
    });

    it('throws when ttsRequest returns empty body', async () => {
      setupTtsRequestMock({ ok: true, body: null });
      await expect(service.speak('Test')).rejects.toThrow(
        'OpenAI TTS API returned empty response',
      );
    });

    it('throws on API error from fetch fallback', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as any);

      await expect(service.speak('Test')).rejects.toThrow('OpenAI TTS API error');
    });
  });

  // ----- stop --------------------------------------------------------------
  describe('stop', () => {
    it('can be called safely when nothing is playing', () => {
      expect(() => service.stop()).not.toThrow();
    });

    it('revokes blob URL after playback started', async () => {
      setupTtsRequestMock();
      await service.speak('Hello');

      service.stop();
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  // ----- requestId invalidation -------------------------------------------
  describe('requestId invalidation', () => {
    it('stale requests do not play audio', async () => {
      const ttsRequest = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ ok: true, status: 200, statusText: 'OK', body: FAKE_BASE64_AUDIO }),
              10,
            ),
          ),
      );
      (window.electron as any).aiProxy.ttsRequest = ttsRequest;

      const speakPromise = service.speak('Hello');
      service.stop();
      await speakPromise;

      expect(audioInstances).toHaveLength(0);
    });
  });

  // ----- renderToBlob ------------------------------------------------------
  describe('renderToBlob', () => {
    it('returns an audio/mpeg Blob', async () => {
      setupTtsRequestMock();
      const blob = await service.renderToBlob('Hello');
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('audio/mpeg');
    });

    it('throws on API error', async () => {
      setupTtsRequestMock({ ok: false, status: 500, statusText: 'Server Error' });
      await expect(service.renderToBlob('Hi')).rejects.toThrow('OpenAI TTS API error');
    });
  });
});
