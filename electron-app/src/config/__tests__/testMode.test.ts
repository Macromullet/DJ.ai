import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock heavy provider/service dependencies so testMode can construct them.
// Must use function/class syntax (not arrows) so they are constructable with `new`.
vi.mock('../../providers/MockMusicProvider', () => {
  return {
    MockMusicProvider: class MockMusicProvider { name = 'MockMusicProvider'; },
  };
});

vi.mock('../../services/WebSpeechTTSService', () => {
  return {
    WebSpeechTTSService: class WebSpeechTTSService { name = 'WebSpeechTTSService'; },
  };
});

vi.mock('../../services/AICommentaryService', () => {
  return {
    AICommentaryService: class AICommentaryService { name = 'AICommentaryService'; },
  };
});

import { isTestMode, initializeTestMode } from '../testMode';
import { container } from '../container';

describe('isTestMode', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '' },
      writable: true,
      configurable: true,
    });
    localStorage.clear();
  });

  it('returns true when URL has ?test=true', () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search: '?test=true' },
      writable: true,
      configurable: true,
    });
    expect(isTestMode()).toBe(true);
  });

  it('returns true when localStorage has djai-test-mode=true', () => {
    localStorage.setItem('djai-test-mode', 'true');
    expect(isTestMode()).toBe(true);
  });

  it('returns false when neither flag is set', () => {
    expect(isTestMode()).toBe(false);
  });
});

describe('initializeTestMode', () => {
  beforeEach(() => {
    container.clear();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('registers musicProvider in the container', () => {
    initializeTestMode();
    expect(container.has('musicProvider')).toBe(true);
    expect(container.get('musicProvider')).toEqual(expect.objectContaining({ name: 'MockMusicProvider' }));
  });

  it('registers ttsService in the container', () => {
    initializeTestMode();
    expect(container.has('ttsService')).toBe(true);
    expect(container.get('ttsService')).toEqual(expect.objectContaining({ name: 'WebSpeechTTSService' }));
  });

  it('registers aiCommentaryService in the container', () => {
    initializeTestMode();
    expect(container.has('aiCommentaryService')).toBe(true);
    expect(container.get('aiCommentaryService')).toEqual(expect.objectContaining({ name: 'AICommentaryService' }));
  });

  it('returns a ServiceContainer', () => {
    const result = initializeTestMode();
    expect(result).toHaveProperty('musicProvider');
    expect(result).toHaveProperty('ttsService');
    expect(result).toHaveProperty('aiCommentaryService');
  });
});
