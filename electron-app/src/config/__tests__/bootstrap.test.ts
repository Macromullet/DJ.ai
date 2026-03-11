import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependent modules before importing bootstrap
vi.mock('../testMode', () => ({
  initializeTestMode: vi.fn(),
}));

vi.mock('../productionMode', () => ({
  initializeProductionMode: vi.fn(),
}));

vi.mock('../../utils/secretStorage', () => ({
  getApiKeys: vi.fn().mockResolvedValue({
    openaiApiKey: '',
    anthropicApiKey: '',
    elevenLabsApiKey: '',
    geminiApiKey: '',
  }),
}));

import { bootstrapApp } from '../bootstrap';
import { initializeTestMode } from '../testMode';
import { initializeProductionMode } from '../productionMode';
import { getApiKeys } from '../../utils/secretStorage';

describe('bootstrapApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Default: no test flags, DEV mode is true in vitest
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '' },
      writable: true,
      configurable: true,
    });

    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('enters test mode when URL has ?test=true', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?test=true' },
      writable: true,
      configurable: true,
    });

    await bootstrapApp();

    expect(initializeTestMode).toHaveBeenCalled();
    expect(initializeProductionMode).not.toHaveBeenCalled();
  });

  it('enters test mode when localStorage has djai-test-mode=true', async () => {
    localStorage.setItem('djai-test-mode', 'true');

    await bootstrapApp();

    expect(initializeTestMode).toHaveBeenCalled();
    expect(initializeProductionMode).not.toHaveBeenCalled();
  });

  it('does not call getApiKeys in test mode', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?test=true' },
      writable: true,
      configurable: true,
    });

    await bootstrapApp();

    expect(getApiKeys).not.toHaveBeenCalled();
  });

  it('enters production mode when no test flag is set', async () => {
    await bootstrapApp();

    expect(initializeProductionMode).toHaveBeenCalled();
    expect(initializeTestMode).not.toHaveBeenCalled();
  });

  it('loads settings from localStorage djAiSettings', async () => {
    const settings = { currentProvider: 'spotify', ttsProvider: 'openai', aiProvider: 'openai' };
    localStorage.setItem('djAiSettings', JSON.stringify(settings));

    await bootstrapApp();

    expect(initializeProductionMode).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'spotify',
        ttsProvider: 'openai',
        aiProvider: 'openai',
      }),
    );
  });

  it('handles invalid JSON in localStorage gracefully', async () => {
    localStorage.setItem('djAiSettings', '{not-valid-json!!!');

    await bootstrapApp();

    // Should still call production mode with defaults (no crash)
    expect(initializeProductionMode).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'apple',          // default
        ttsProvider: 'web-speech',  // default
      }),
    );
  });

  it('handles missing localStorage entry with defaults', async () => {
    // djAiSettings not set at all
    await bootstrapApp();

    expect(initializeProductionMode).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'apple',
        ttsProvider: 'web-speech',
      }),
    );
  });

  describe('AI provider fallback logic', () => {
    it('defaults to anthropic when user has only Anthropic key', async () => {
      vi.mocked(getApiKeys).mockResolvedValueOnce({
        openaiApiKey: '',
        anthropicApiKey: 'sk-ant-xxx',
        elevenLabsApiKey: '',
        geminiApiKey: '',
      });

      await bootstrapApp();

      expect(initializeProductionMode).toHaveBeenCalledWith(
        expect.objectContaining({ aiProvider: 'anthropic' }),
      );
    });

    it('defaults to openai when user has only OpenAI key', async () => {
      vi.mocked(getApiKeys).mockResolvedValueOnce({
        openaiApiKey: 'sk-openai-xxx',
        anthropicApiKey: '',
        elevenLabsApiKey: '',
        geminiApiKey: '',
      });

      await bootstrapApp();

      expect(initializeProductionMode).toHaveBeenCalledWith(
        expect.objectContaining({ aiProvider: 'openai' }),
      );
    });

    it('defaults to anthropic when user has both keys and no saved setting', async () => {
      vi.mocked(getApiKeys).mockResolvedValueOnce({
        openaiApiKey: 'sk-openai-xxx',
        anthropicApiKey: 'sk-ant-xxx',
        elevenLabsApiKey: '',
        geminiApiKey: '',
      });

      await bootstrapApp();

      expect(initializeProductionMode).toHaveBeenCalledWith(
        expect.objectContaining({ aiProvider: 'anthropic' }),
      );
    });

    it('uses stored aiProvider setting when present, even with both keys', async () => {
      vi.mocked(getApiKeys).mockResolvedValueOnce({
        openaiApiKey: 'sk-openai-xxx',
        anthropicApiKey: 'sk-ant-xxx',
        elevenLabsApiKey: '',
        geminiApiKey: '',
      });
      localStorage.setItem('djAiSettings', JSON.stringify({ aiProvider: 'openai' }));

      await bootstrapApp();

      expect(initializeProductionMode).toHaveBeenCalledWith(
        expect.objectContaining({ aiProvider: 'openai' }),
      );
    });

    it('defaults to copilot when user has neither key', async () => {
      vi.mocked(getApiKeys).mockResolvedValueOnce({
        openaiApiKey: '',
        anthropicApiKey: '',
        elevenLabsApiKey: '',
        geminiApiKey: '',
      });

      await bootstrapApp();

      expect(initializeProductionMode).toHaveBeenCalledWith(
        expect.objectContaining({ aiProvider: 'copilot' }),
      );
    });
  });
});
