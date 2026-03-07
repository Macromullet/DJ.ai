import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ElevenLabsTTSService } from '../ElevenLabsTTSService';

const FAKE_BASE64_AUDIO = btoa('fake-elevenlabs-audio');

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

describe('ElevenLabsTTSService', () => {
  const OriginalMockAudio = globalThis.Audio;
  let service: ElevenLabsTTSService;

  beforeEach(() => {
    audioInstances = [];
    vi.stubGlobal('Audio', AutoPlayAudio);
    service = new ElevenLabsTTSService({ apiKey: 'test-eleven-key' });
    delete (window.electron as any).aiProxy.ttsRequest;
  });

  afterEach(() => {
    vi.stubGlobal('Audio', OriginalMockAudio);
  });

  // ----- constructor -------------------------------------------------------
  describe('constructor', () => {
    it('defaults voice to Rachel (21m00Tcm4TlvDq8ikWAM)', async () => {
      const tts = setupTtsRequestMock();
      await service.speak('hi');
      expect(tts.mock.calls[0][0].url).toContain('21m00Tcm4TlvDq8ikWAM');
    });

    it('accepts a custom voice id', async () => {
      const svc = new ElevenLabsTTSService({
        apiKey: 'k',
        voice: '5Q0t7uMcjvnagumLfvZi', // Paul
      });
      const tts = setupTtsRequestMock();
      await svc.speak('hi');
      expect(tts.mock.calls[0][0].url).toContain('5Q0t7uMcjvnagumLfvZi');
    });

    it('falls back to Rachel for invalid voice', async () => {
      const svc = new ElevenLabsTTSService({ apiKey: 'k', voice: 'nonexistent' });
      const tts = setupTtsRequestMock();
      await svc.speak('hi');
      expect(tts.mock.calls[0][0].url).toContain('21m00Tcm4TlvDq8ikWAM');
    });
  });

  // ----- getAvailableVoices ------------------------------------------------
  describe('getAvailableVoices', () => {
    it('returns 15 ElevenLabs voices', async () => {
      const voices = await service.getAvailableVoices();
      expect(voices).toHaveLength(15);
    });

    it('all voices have elevenlabs provider', async () => {
      const voices = await service.getAvailableVoices();
      expect(voices.every((v) => v.provider === 'elevenlabs')).toBe(true);
      expect(voices.every((v) => v.language === 'en')).toBe(true);
    });
  });

  // ----- isAvailable -------------------------------------------------------
  describe('isAvailable', () => {
    it('true when apiKey is set', () => {
      expect(service.isAvailable()).toBe(true);
    });
    it('false when apiKey is empty', () => {
      expect(new ElevenLabsTTSService({ apiKey: '' }).isAvailable()).toBe(false);
    });
  });

  // ----- speak -------------------------------------------------------------
  describe('speak', () => {
    it('uses correct voice ID in URL', async () => {
      const tts = setupTtsRequestMock();
      await service.speak('Hello');
      expect(tts.mock.calls[0][0].url).toBe(
        'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
      );
    });

    it('request body includes model_id, stability, similarity_boost', async () => {
      const tts = setupTtsRequestMock();
      await service.speak('Hello');

      const body = tts.mock.calls[0][0].body;
      expect(body).toEqual(
        expect.objectContaining({
          text: 'Hello',
          model_id: 'eleven_turbo_v2_5',
          voice_settings: expect.objectContaining({
            stability: 0.5,
            similarity_boost: 0.75,
            use_speaker_boost: true,
          }),
        }),
      );
    });

    it('sends xi-api-key header', async () => {
      const tts = setupTtsRequestMock();
      await service.speak('Hello');
      expect(tts.mock.calls[0][0].headers).toEqual(
        expect.objectContaining({ 'xi-api-key': 'test-eleven-key' }),
      );
    });

    it('throws on API error', async () => {
      setupTtsRequestMock({ ok: false, status: 429, statusText: 'Too Many Requests' });
      await expect(service.speak('Test')).rejects.toThrow(
        'ElevenLabs TTS API error: 429 Too Many Requests',
      );
    });

    it('throws on empty body', async () => {
      setupTtsRequestMock({ ok: true, body: null });
      await expect(service.speak('Test')).rejects.toThrow(
        'ElevenLabs TTS API returned empty response',
      );
    });
  });

  // ----- setVoice ----------------------------------------------------------
  describe('setVoice', () => {
    it('updates voice id for a known voice', async () => {
      service.setVoice('ErXwobaYiN019PkySvjV'); // Antoni
      const tts = setupTtsRequestMock();
      await service.speak('hi');
      expect(tts.mock.calls[0][0].url).toContain('ErXwobaYiN019PkySvjV');
    });

    it('ignores unknown voice id', async () => {
      service.setVoice('unknown-id');
      const tts = setupTtsRequestMock();
      await service.speak('hi');
      expect(tts.mock.calls[0][0].url).toContain('21m00Tcm4TlvDq8ikWAM');
    });
  });

  // ----- setRate (stability mapping) ---------------------------------------
  describe('setRate', () => {
    it('maps slower rate to higher stability', async () => {
      service.setRate(0.5);
      const tts = setupTtsRequestMock();
      await service.speak('hi');
      expect(tts.mock.calls[0][0].body.voice_settings.stability).toBeCloseTo(1.0);
    });

    it('maps faster rate to lower stability', async () => {
      service.setRate(2.0);
      const tts = setupTtsRequestMock();
      await service.speak('hi');
      expect(tts.mock.calls[0][0].body.voice_settings.stability).toBeCloseTo(0.4);
    });

    it('clamps stability to 0–1 range for extreme rates', async () => {
      service.setRate(5.0);
      const tts = setupTtsRequestMock();
      await service.speak('hi');
      expect(tts.mock.calls[0][0].body.voice_settings.stability).toBeGreaterThanOrEqual(0);
      expect(tts.mock.calls[0][0].body.voice_settings.stability).toBeLessThanOrEqual(1);
    });
  });

  // ----- setPitch ----------------------------------------------------------
  describe('setPitch', () => {
    it('is a no-op', () => {
      expect(() => service.setPitch(1.5)).not.toThrow();
    });
  });

  // ----- stop / requestId --------------------------------------------------
  describe('stop and requestId', () => {
    it('safe to call when nothing is playing', () => {
      expect(() => service.stop()).not.toThrow();
    });

    it('stale requests do not play audio', async () => {
      const ttsRequest = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({ ok: true, status: 200, statusText: 'OK', body: FAKE_BASE64_AUDIO }),
              10,
            ),
          ),
      );
      (window.electron as any).aiProxy.ttsRequest = ttsRequest;

      const promise = service.speak('Hello');
      service.stop();
      await promise;

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
  });
});
