import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiTTSService } from '../GeminiTTSService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function geminiResponseJson(mimeType = 'audio/wav', audioData = 'AAAA') {
  return JSON.stringify({
    candidates: [
      {
        content: {
          parts: [
            {
              inline_data: {
                data: btoa(audioData),
                mime_type: mimeType,
              },
            },
          ],
        },
      },
    ],
  });
}

function setupRequestMock(
  bodyOverride?: string | null,
  statusOverride?: Partial<{ ok: boolean; status: number; statusText: string }>,
) {
  const body = bodyOverride !== undefined ? bodyOverride : geminiResponseJson();
  const request = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    body,
    ...statusOverride,
  });
  (window.electron as any).aiProxy.request = request;
  return request;
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

describe('GeminiTTSService', () => {
  const OriginalMockAudio = globalThis.Audio;
  let service: GeminiTTSService;

  beforeEach(() => {
    audioInstances = [];
    vi.stubGlobal('Audio', AutoPlayAudio);
    service = new GeminiTTSService({ apiKey: 'test-gemini-key' });
  });

  afterEach(() => {
    vi.stubGlobal('Audio', OriginalMockAudio);
  });

  // ----- constructor -------------------------------------------------------
  describe('constructor', () => {
    it('defaults voice to Kore', async () => {
      const req = setupRequestMock();
      await service.speak('hi');
      const body = req.mock.calls[0][0].body;
      expect(body.generationConfig.speech_config.voice_config.prebuilt_voice_config.voice_name).toBe(
        'Kore',
      );
    });

    it('accepts a custom voice', async () => {
      const svc = new GeminiTTSService({ apiKey: 'k', voice: 'Fenrir' });
      const req = setupRequestMock();
      await svc.speak('hi');
      const body = req.mock.calls[0][0].body;
      expect(body.generationConfig.speech_config.voice_config.prebuilt_voice_config.voice_name).toBe(
        'Fenrir',
      );
    });

    it('falls back to Kore for an invalid voice', async () => {
      const svc = new GeminiTTSService({ apiKey: 'k', voice: 'NonExistent' });
      const req = setupRequestMock();
      await svc.speak('hi');
      const body = req.mock.calls[0][0].body;
      expect(body.generationConfig.speech_config.voice_config.prebuilt_voice_config.voice_name).toBe(
        'Kore',
      );
    });
  });

  // ----- getAvailableVoices ------------------------------------------------
  describe('getAvailableVoices', () => {
    it('returns 16 Gemini voices', async () => {
      const voices = await service.getAvailableVoices();
      expect(voices).toHaveLength(16);
    });

    it('all voices have gemini provider', async () => {
      const voices = await service.getAvailableVoices();
      expect(voices.every((v) => v.provider === 'gemini')).toBe(true);
      expect(voices.every((v) => v.language === 'en')).toBe(true);
    });
  });

  // ----- isAvailable -------------------------------------------------------
  describe('isAvailable', () => {
    it('returns true with apiKey', () => {
      expect(service.isAvailable()).toBe(true);
    });
    it('returns false without apiKey', () => {
      expect(new GeminiTTSService({ apiKey: '' }).isAvailable()).toBe(false);
    });
  });

  // ----- speak: request construction ---------------------------------------
  describe('speak', () => {
    it('constructs correct request body with generationConfig', async () => {
      const req = setupRequestMock();
      await service.speak('Say hello');

      expect(req).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('generativelanguage.googleapis.com'),
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );

      // Auth header is injected by main process — NOT sent from renderer
      const sentHeaders = req.mock.calls[0][0].headers;
      expect(sentHeaders).not.toHaveProperty('x-goog-api-key');

      const body = req.mock.calls[0][0].body;
      expect(body.contents[0].parts[0].text).toBe('Say hello');
      expect(body.generationConfig.response_modalities).toEqual(['AUDIO']);
    });

    it('plays audio after successful response', async () => {
      setupRequestMock();
      await service.speak('Hello');
      expect(audioInstances).toHaveLength(1);
      expect(audioInstances[0].play).toHaveBeenCalled();
    });

    it('throws on API error', async () => {
      setupRequestMock(undefined, { ok: false, status: 403, statusText: 'Forbidden' });
      await expect(service.speak('Test')).rejects.toThrow('Gemini TTS API error: 403 Forbidden');
    });

    it('throws on empty body', async () => {
      setupRequestMock(null);
      await expect(service.speak('Test')).rejects.toThrow('Gemini TTS API returned empty response');
    });

    it('throws when response has no inline_data', async () => {
      setupRequestMock(JSON.stringify({ candidates: [{ content: { parts: [{}] } }] }));
      await expect(service.speak('Test')).rejects.toThrow(
        'Gemini TTS response did not contain audio data',
      );
    });
  });

  // ----- MIME type handling / PCM conversion --------------------------------
  describe('MIME type and PCM conversion', () => {
    it('does not convert audio/wav (passes through)', async () => {
      setupRequestMock(geminiResponseJson('audio/wav', 'RIFFwavdata'));
      const blob = await service.renderToBlob('hi');
      expect(blob.type).toBe('audio/wav');
    });

    it('does not convert audio/mpeg', async () => {
      setupRequestMock(geminiResponseJson('audio/mpeg', 'mp3data'));
      const blob = await service.renderToBlob('hi');
      expect(blob.type).toBe('audio/mpeg');
    });

    it('normalises audio/mp3 to audio/mpeg', async () => {
      setupRequestMock(geminiResponseJson('audio/mp3', 'mp3data'));
      const blob = await service.renderToBlob('hi');
      expect(blob.type).toBe('audio/mpeg');
    });

    it('converts audio/L16 (PCM) to audio/wav', async () => {
      setupRequestMock(geminiResponseJson('audio/L16', '\x00\x01\x02\x03'));
      const blob = await service.renderToBlob('hi');
      expect(blob.type).toBe('audio/wav');
    });

    it('converts audio/pcm to audio/wav', async () => {
      setupRequestMock(geminiResponseJson('audio/pcm', '\x00\x01'));
      const blob = await service.renderToBlob('hi');
      expect(blob.type).toBe('audio/wav');
    });

    it('converts unknown MIME type to audio/wav (treated as PCM)', async () => {
      setupRequestMock(geminiResponseJson('audio/raw', '\x00\x01'));
      const blob = await service.renderToBlob('hi');
      expect(blob.type).toBe('audio/wav');
    });

    it('pcmToWav produces valid WAV header bytes', async () => {
      const pcmSamples = '\x00\x01\x02\x03\x04\x05\x06\x07';
      setupRequestMock(geminiResponseJson('audio/L16', pcmSamples));
      const blob = await service.renderToBlob('hi');

      // Read blob via FileReader for broad jsdom compatibility
      const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
      const view = new DataView(buffer);

      // RIFF header
      expect(String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))).toBe('RIFF');
      // WAVE identifier
      expect(String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11))).toBe('WAVE');
      // fmt  sub-chunk
      expect(String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15))).toBe('fmt ');
      // Audio format = 1 (PCM)
      expect(view.getUint16(20, true)).toBe(1);
      // Channels = 1
      expect(view.getUint16(22, true)).toBe(1);
      // Sample rate = 24000
      expect(view.getUint32(24, true)).toBe(24000);
      // Bits per sample = 16
      expect(view.getUint16(34, true)).toBe(16);
      // data sub-chunk
      expect(String.fromCharCode(view.getUint8(36), view.getUint8(37), view.getUint8(38), view.getUint8(39))).toBe('data');
    });
  });

  // ----- stop / requestId --------------------------------------------------
  describe('stop', () => {
    it('can be called when nothing is playing', () => {
      expect(() => service.stop()).not.toThrow();
    });
  });

  describe('requestId invalidation', () => {
    it('stale requests are discarded', async () => {
      const req = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  status: 200,
                  statusText: 'OK',
                  body: geminiResponseJson(),
                }),
              10,
            ),
          ),
      );
      (window.electron as any).aiProxy.request = req;

      const promise = service.speak('Hello');
      service.stop();
      await promise;

      expect(audioInstances).toHaveLength(0);
    });
  });

  // ----- setVoice / setRate / setPitch -------------------------------------
  describe('setVoice', () => {
    it('updates voice for valid Gemini voice', async () => {
      service.setVoice('Puck');
      const req = setupRequestMock();
      await service.speak('hi');
      const body = req.mock.calls[0][0].body;
      expect(body.generationConfig.speech_config.voice_config.prebuilt_voice_config.voice_name).toBe(
        'Puck',
      );
    });

    it('ignores invalid voice', async () => {
      service.setVoice('InvalidVoice');
      const req = setupRequestMock();
      await service.speak('hi');
      const body = req.mock.calls[0][0].body;
      expect(body.generationConfig.speech_config.voice_config.prebuilt_voice_config.voice_name).toBe(
        'Kore',
      );
    });
  });

  describe('setRate / setPitch', () => {
    it('setRate is a no-op', () => {
      expect(() => service.setRate(2)).not.toThrow();
    });
    it('setPitch is a no-op', () => {
      expect(() => service.setPitch(0.5)).not.toThrow();
    });
  });

  // ----- renderToBlob ------------------------------------------------------
  describe('renderToBlob', () => {
    it('returns a Blob with correct MIME type', async () => {
      setupRequestMock(geminiResponseJson('audio/mpeg', 'data'));
      const blob = await service.renderToBlob('Hello');
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('audio/mpeg');
    });
  });

  // ----- fetch fallback ----------------------------------------------------
  describe('fetch fallback', () => {
    it('uses fetch when aiProxy.request is unavailable', async () => {
      (window.electron as any).aiProxy.request = undefined;
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve(JSON.parse(geminiResponseJson())),
        headers: new Headers(),
      } as any);

      await service.speak('Test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });
});
