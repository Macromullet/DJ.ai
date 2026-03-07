import { describe, it, expect, beforeEach } from 'vitest'
import { MockTTSService } from '../MockTTSService'
import { MockAICommentaryService } from '../MockAICommentaryService'

describe('MockTTSService', () => {
  let tts: MockTTSService;

  beforeEach(() => {
    tts = new MockTTSService();
  });

  it('should track speak calls', async () => {
    await tts.speak('Hello world');
    expect(tts.callCount).toBe(1);
    expect(tts.getCallsFor('speak')).toHaveLength(1);
    expect(tts.wasCalledWith('speak', 'Hello world')).toBe(true);
  });

  it('should track setVoice/setRate/setPitch', () => {
    tts.setVoice('nova');
    tts.setRate(1.5);
    tts.setPitch(0.8);
    expect(tts.voice).toBe('nova');
    expect(tts.rate).toBe(1.5);
    expect(tts.pitch).toBe(0.8);
  });

  it('should fail when configured', async () => {
    tts = new MockTTSService({ shouldFail: true, failureError: 'API quota exceeded' });
    await expect(tts.speak('test')).rejects.toThrow('API quota exceeded');
  });

  it('should fail after N calls', async () => {
    tts = new MockTTSService({ failAfter: 1 });
    await tts.speak('first'); // succeeds (callCount=1, failAfter=1, so 1 > 1 is false)
    await expect(tts.speak('second')).rejects.toThrow(); // fails (callCount=2, 2 > 1 is true)
  });

  it('should return available voices', async () => {
    const voices = await tts.getAvailableVoices();
    expect(voices).toHaveLength(2);
    expect(voices[0].provider).toBe('openai');
  });

  it('should return audio blob from renderToBlob', async () => {
    const blob = await tts.renderToBlob('test');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('audio/mpeg');
  });

  it('should reset state', async () => {
    await tts.speak('test');
    tts.setVoice('custom');
    tts.reset();
    expect(tts.callCount).toBe(0);
    expect(tts.callHistory).toHaveLength(0);
    expect(tts.voice).toBe('mock-voice');
  });
});

describe('MockAICommentaryService', () => {
  let ai: MockAICommentaryService;

  beforeEach(() => {
    ai = new MockAICommentaryService();
  });

  it('should generate deterministic commentary', async () => {
    const result = await ai.generateCommentary('Bohemian Rhapsody', 'Queen', 'A Night at the Opera');
    expect(result.text).toContain('Bohemian Rhapsody');
    expect(result.text).toContain('Queen');
    expect(result.trackId).toBe('queen-bohemian-rhapsody');
  });

  it('should cache commentary', async () => {
    const result = await ai.generateCommentary('Test', 'Artist');
    const cached = await ai.getCommentaryForTrack(result.trackId);
    expect(cached).toEqual(result);
  });

  it('should return null for uncached tracks', async () => {
    const result = await ai.getCommentaryForTrack('nonexistent');
    expect(result).toBeNull();
  });

  it('should clear cache', async () => {
    await ai.generateCommentary('Test', 'Artist');
    ai.clearCache();
    const result = await ai.getCommentaryForTrack('artist-test');
    expect(result).toBeNull();
  });

  it('should fail when configured', async () => {
    ai = new MockAICommentaryService({ shouldFail: true });
    await expect(ai.generateCommentary('Test', 'Artist')).rejects.toThrow();
  });

  it('should cycle through templates', async () => {
    const r1 = await ai.generateCommentary('Track1', 'Artist1');
    const r2 = await ai.generateCommentary('Track2', 'Artist2');
    expect(r1.text).not.toBe(r2.text);
  });

  it('should reset state', async () => {
    await ai.generateCommentary('Test', 'Artist');
    ai.reset();
    expect(ai.callCount).toBe(0);
    expect(ai.callHistory).toHaveLength(0);
  });
});
