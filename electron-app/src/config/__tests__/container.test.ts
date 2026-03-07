import { describe, it, expect, beforeEach } from 'vitest'
import { container, registerServices, getMusicProvider, getTTSService, getAICommentaryService } from '../container'

describe('DIContainer', () => {
  beforeEach(() => {
    container.clear()
  })

  it('should register and retrieve a service', () => {
    const mockProvider = { name: 'mock' } as any
    container.register('musicProvider', mockProvider)
    expect(container.get('musicProvider')).toBe(mockProvider)
  })

  it('should throw when getting unregistered service', () => {
    expect(() => container.get('musicProvider')).toThrow('Service not registered: musicProvider')
  })

  it('should check if service exists', () => {
    expect(container.has('musicProvider')).toBe(false)
    container.register('musicProvider', {} as any)
    expect(container.has('musicProvider')).toBe(true)
  })

  it('should clear all services', () => {
    container.register('musicProvider', {} as any)
    container.clear()
    expect(container.has('musicProvider')).toBe(false)
  })

  it('should register multiple services at once', () => {
    const mockProvider = { name: 'mock' } as any
    const mockTTS = { name: 'tts' } as any
    registerServices({ musicProvider: mockProvider, ttsService: mockTTS })
    expect(container.get('musicProvider')).toBe(mockProvider)
    expect(container.get('ttsService')).toBe(mockTTS)
  })

  it('registerServices skips undefined values', () => {
    const mockProvider = { name: 'mock' } as any
    registerServices({ musicProvider: mockProvider, ttsService: undefined as any })
    expect(container.has('musicProvider')).toBe(true)
    expect(container.has('ttsService')).toBe(false)
  })

  it('getAll returns a copy of registered services', () => {
    const mockProvider = { name: 'mock' } as any
    container.register('musicProvider', mockProvider)

    const all = container.getAll()
    expect(all.musicProvider).toBe(mockProvider)

    // Mutating the copy should not affect the container
    all.musicProvider = { name: 'tampered' } as any
    expect(container.get('musicProvider')).toBe(mockProvider)
  })

  it('getMusicProvider helper returns the registered music provider', () => {
    const mockProvider = { name: 'mock' } as any
    container.register('musicProvider', mockProvider)
    expect(getMusicProvider()).toBe(mockProvider)
  })

  it('getMusicProvider throws when not registered', () => {
    expect(() => getMusicProvider()).toThrow('Service not registered: musicProvider')
  })

  it('getTTSService helper returns the registered TTS service', () => {
    const mockTTS = { name: 'tts' } as any
    container.register('ttsService', mockTTS)
    expect(getTTSService()).toBe(mockTTS)
  })

  it('getTTSService throws when not registered', () => {
    expect(() => getTTSService()).toThrow('Service not registered: ttsService')
  })

  it('getAICommentaryService returns undefined when not registered', () => {
    expect(getAICommentaryService()).toBeUndefined()
  })

  it('getAICommentaryService returns the service when registered', () => {
    const mockAI = { name: 'ai' } as any
    container.register('aiCommentaryService', mockAI)
    expect(getAICommentaryService()).toBe(mockAI)
  })
})
