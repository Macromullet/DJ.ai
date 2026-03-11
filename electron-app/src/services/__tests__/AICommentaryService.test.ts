import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AICommentaryService, AICommentaryConfig } from '../AICommentaryService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupRequestMock(body: string, statusOverride?: Partial<{ ok: boolean; status: number; statusText: string }>) {
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

function openaiResponse(content: string) {
  return JSON.stringify({
    choices: [{ message: { content } }],
  });
}

function anthropicResponse(text: string) {
  return JSON.stringify({
    content: [{ text }],
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AICommentaryService', () => {
  beforeEach(() => {
    // Reset aiProxy.request to the default from vitest.setup
    (window.electron as any).aiProxy.request = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      body: '{}',
      headers: {},
    });
    // Remove copilot mock between tests
    delete (window.electron as any).copilot;
  });

  // ----- constructor -------------------------------------------------------
  describe('constructor', () => {
    it('creates with copilot provider', () => {
      const svc = new AICommentaryService({ provider: 'copilot' });
      expect(svc).toBeDefined();
    });

    it('creates with openai provider', () => {
      const svc = new AICommentaryService({ provider: 'openai', openaiApiKey: 'key' });
      expect(svc).toBeDefined();
    });

    it('creates with anthropic provider', () => {
      const svc = new AICommentaryService({ provider: 'anthropic', anthropicApiKey: 'key' });
      expect(svc).toBeDefined();
    });
  });

  // ----- generateCommentary: copilot ---------------------------------------
  describe('generateCommentary with copilot provider', () => {
    it('uses copilot.chat when available', async () => {
      const chatFn = vi.fn().mockResolvedValue({ ok: true, text: 'Great song!' });
      (window.electron as any).copilot = { chat: chatFn };

      const svc = new AICommentaryService({ provider: 'copilot' });
      const result = await svc.generateCommentary('Song', 'Artist');

      expect(chatFn).toHaveBeenCalledWith(expect.objectContaining({
        systemPrompt: expect.stringContaining('veteran late-night radio DJ'),
        userPrompt: expect.stringContaining('Song'),
      }));
      expect(chatFn).toHaveBeenCalledWith(expect.objectContaining({
        userPrompt: expect.stringContaining('Artist'),
      }));
      expect(result.text).toBe('Great song!');
      expect(result.trackId).toBe('artist-song');
    });

    it('falls back to template when copilot is unavailable', async () => {
      // copilot is deleted in beforeEach — will throw, caught, fallback used
      const svc = new AICommentaryService({ provider: 'copilot' });
      const result = await svc.generateCommentary('Bohemian Rhapsody', 'Queen');

      // Fallback templates always include the track title
      expect(result.text).toContain('Bohemian Rhapsody');
      expect(result.text).toContain('Queen');
    });

    it('falls back to template when copilot returns error', async () => {
      const chatFn = vi.fn().mockResolvedValue({ ok: false, error: 'Auth expired' });
      (window.electron as any).copilot = { chat: chatFn };

      const svc = new AICommentaryService({ provider: 'copilot' });
      const result = await svc.generateCommentary('Song', 'Artist');

      // Error response triggers throw → caught → fallback template
      expect(result.text).toBeTruthy();
      expect(result.text).toContain('Song');
    });

    it('falls back to template when copilot returns empty text', async () => {
      const chatFn = vi.fn().mockResolvedValue({ ok: true, text: '' });
      (window.electron as any).copilot = { chat: chatFn };

      const svc = new AICommentaryService({ provider: 'copilot' });
      const result = await svc.generateCommentary('Song', 'Artist');

      // Empty text is falsy → throws → caught → fallback
      expect(typeof result.text).toBe('string');
      expect(result.text.length).toBeGreaterThan(0);
    });

    it('passes DJ system prompt and track context', async () => {
      const chatFn = vi.fn().mockResolvedValue({ ok: true, text: 'Nice transition!' });
      (window.electron as any).copilot = { chat: chatFn };

      const svc = new AICommentaryService({ provider: 'copilot' });
      await svc.generateCommentary('Hey Jude', 'The Beatles', 'Past Masters', {
        title: 'Yesterday',
        artist: 'The Beatles',
      });

      const callArgs = chatFn.mock.calls[0][0];
      // System prompt should contain DJ persona rules
      expect(callArgs.systemPrompt).toContain('NEVER open with biographical facts');
      expect(callArgs.systemPrompt).toContain('2-3 sentences MAX');
      // User prompt should contain track info and transition context
      expect(callArgs.userPrompt).toContain('Hey Jude');
      expect(callArgs.userPrompt).toContain('The Beatles');
      expect(callArgs.userPrompt).toContain('Past Masters');
      expect(callArgs.userPrompt).toContain('Yesterday');
    });
  });

  // ----- generateCommentary: openai ----------------------------------------
  describe('generateCommentary with openai provider', () => {
    it('sends correct request via IPC proxy', async () => {
      const reqMock = setupRequestMock(openaiResponse('Amazing track!'));
      const svc = new AICommentaryService({ provider: 'openai', openaiApiKey: 'sk-test' });

      const result = await svc.generateCommentary('Hey Jude', 'The Beatles', 'Past Masters');

      expect(reqMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.openai.com/v1/chat/completions',
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );

      // Auth header is injected by main process — NOT sent from renderer
      const sentHeaders = reqMock.mock.calls[0][0].headers;
      expect(sentHeaders).not.toHaveProperty('Authorization');

      const body = reqMock.mock.calls[0][0].body;
      expect(body.model).toBe('gpt-4o-mini');
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[1].role).toBe('user');
      expect(body.messages[1].content).toContain('Hey Jude');
      expect(body.messages[1].content).toContain('The Beatles');
      expect(body.messages[1].content).toContain('Past Masters');
      expect(result.text).toBe('Amazing track!');
    });

    it('throws when openai API key is missing', async () => {
      const svc = new AICommentaryService({ provider: 'openai' });
      // Error is caught internally, falls back to template
      const result = await svc.generateCommentary('Song', 'Artist');
      // Falls back to template since no API key → throws → caught
      expect(result.text).toBeTruthy();
    });

    it('falls back on API error', async () => {
      setupRequestMock('', { ok: false, status: 500, statusText: 'Server Error' });
      const svc = new AICommentaryService({ provider: 'openai', openaiApiKey: 'key' });
      const result = await svc.generateCommentary('Song', 'Artist');
      // Should use fallback template (not throw)
      expect(result.text).toBeTruthy();
    });
  });

  // ----- generateCommentary: anthropic -------------------------------------
  describe('generateCommentary with anthropic provider', () => {
    it('sends correct request via IPC proxy', async () => {
      const reqMock = setupRequestMock(anthropicResponse('Stellar track!'));
      const svc = new AICommentaryService({ provider: 'anthropic', anthropicApiKey: 'ant-key' });

      const result = await svc.generateCommentary('Stairway to Heaven', 'Led Zeppelin');

      expect(reqMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.anthropic.com/v1/messages',
          method: 'POST',
          headers: expect.objectContaining({
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          }),
        }),
      );

      // Auth header is injected by main process — NOT sent from renderer
      const sentHeaders = reqMock.mock.calls[0][0].headers;
      expect(sentHeaders).not.toHaveProperty('x-api-key');

      const body = reqMock.mock.calls[0][0].body;
      expect(body.model).toBe('claude-sonnet-4-20250514');
      expect(body.max_tokens).toBe(200);
      expect(body.messages[0].content).toContain('Stairway to Heaven');
      expect(body.messages[0].content).toContain('Led Zeppelin');
      expect(result.text).toBe('Stellar track!');
    });

    it('throws when anthropic API key is missing', async () => {
      const svc = new AICommentaryService({ provider: 'anthropic' });
      const result = await svc.generateCommentary('Song', 'Artist');
      // Falls back to template
      expect(result.text).toBeTruthy();
    });
  });

  // ----- caching -----------------------------------------------------------
  describe('caching', () => {
    it('second call for the same track returns cached commentary', async () => {
      const reqMock = setupRequestMock(openaiResponse('First call'));
      const svc = new AICommentaryService({ provider: 'openai', openaiApiKey: 'key' });

      const first = await svc.generateCommentary('Song', 'Artist');
      const second = await svc.generateCommentary('Song', 'Artist');

      // Should only call the API once
      expect(reqMock).toHaveBeenCalledTimes(1);
      expect(second.text).toBe(first.text);
    });

    it('different tracks are not confused in cache', async () => {
      const reqMock = setupRequestMock(openaiResponse('Comment A'));
      const svc = new AICommentaryService({ provider: 'openai', openaiApiKey: 'key' });

      await svc.generateCommentary('Song A', 'Artist A');

      reqMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        body: openaiResponse('Comment B'),
      });

      const b = await svc.generateCommentary('Song B', 'Artist B');
      expect(b.text).toBe('Comment B');
      expect(reqMock).toHaveBeenCalledTimes(2);
    });
  });

  // ----- getCommentaryForTrack ---------------------------------------------
  describe('getCommentaryForTrack', () => {
    it('returns cached commentary for a known trackId', async () => {
      setupRequestMock(openaiResponse('Cached!'));
      const svc = new AICommentaryService({ provider: 'openai', openaiApiKey: 'key' });
      await svc.generateCommentary('My Song', 'My Artist');

      const cached = await svc.getCommentaryForTrack('my-artist-my-song');
      expect(cached).not.toBeNull();
      expect(cached!.text).toBe('Cached!');
    });

    it('returns null for unknown trackId', async () => {
      const svc = new AICommentaryService({ provider: 'copilot' });
      const result = await svc.getCommentaryForTrack('nonexistent-track');
      expect(result).toBeNull();
    });
  });

  // ----- clearCache --------------------------------------------------------
  describe('clearCache', () => {
    it('removes all cached items', async () => {
      setupRequestMock(openaiResponse('To be cleared'));
      const svc = new AICommentaryService({ provider: 'openai', openaiApiKey: 'key' });
      await svc.generateCommentary('Song', 'Artist');

      svc.clearCache();

      const cached = await svc.getCommentaryForTrack('artist-song');
      expect(cached).toBeNull();
    });
  });

  // ----- updateConfig ------------------------------------------------------
  describe('updateConfig', () => {
    it('changes the active provider', async () => {
      const svc = new AICommentaryService({ provider: 'copilot' });
      svc.updateConfig({ provider: 'openai', openaiApiKey: 'new-key' });

      const reqMock = setupRequestMock(openaiResponse('OpenAI response'));
      await svc.generateCommentary('Song', 'Artist');

      // Should have called OpenAI, not Copilot
      expect(reqMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.openai.com/v1/chat/completions',
        }),
      );
    });
  });

  // ----- template-based commentary -----------------------------------------
  describe('template-based commentary', () => {
    it('includes track title and artist', async () => {
      // Force fallback by using copilot provider without copilot bridge
      const svc = new AICommentaryService({ provider: 'copilot' });
      const result = await svc.generateCommentary('Imagine', 'John Lennon');
      expect(result.text).toContain('Imagine');
      expect(result.text).toContain('John Lennon');
    });

    it('includes album when provided', async () => {
      const svc = new AICommentaryService({ provider: 'copilot' });

      // Run multiple times to increase chance of hitting a template with album
      const results: string[] = [];
      for (let i = 0; i < 20; i++) {
        svc.clearCache();
        const r = await svc.generateCommentary(`Song${i}`, 'Artist', 'TheAlbum');
        results.push(r.text);
      }

      // At least some templates should include the album
      const hasAlbum = results.some((t) => t.includes('TheAlbum'));
      expect(hasAlbum).toBe(true);
    });
  });

  // ----- generateCommentaryForTrack (legacy) -------------------------------
  describe('generateCommentaryForTrack (legacy)', () => {
    it('delegates to generateCommentary and returns text', async () => {
      setupRequestMock(openaiResponse('Legacy result'));
      const svc = new AICommentaryService({ provider: 'openai', openaiApiKey: 'key' });

      const text = await svc.generateCommentaryForTrack({
        id: '1',
        name: 'Song',
        artist: 'Artist',
        album: 'Album',
        durationMs: 200000,
      });

      expect(text).toBe('Legacy result');
    });
  });

  // ----- commentary object shape -------------------------------------------
  describe('commentary object', () => {
    it('has text, timestamp, and trackId', async () => {
      setupRequestMock(openaiResponse('Shape test'));
      const svc = new AICommentaryService({ provider: 'openai', openaiApiKey: 'key' });
      const result = await svc.generateCommentary('Title', 'Artist');

      expect(result).toHaveProperty('text', 'Shape test');
      expect(result).toHaveProperty('timestamp');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result).toHaveProperty('trackId', 'artist-title');
    });

    it('trackId is lowercase with hyphens', async () => {
      setupRequestMock(openaiResponse('ok'));
      const svc = new AICommentaryService({ provider: 'openai', openaiApiKey: 'key' });
      const result = await svc.generateCommentary('My Great Song', 'The Artist');
      expect(result.trackId).toBe('the-artist-my-great-song');
    });
  });
});
