import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock window.electron (Electron preload API)
const mockElectron = {
  aiProxy: {
    request: vi.fn().mockResolvedValue({ ok: true, status: 200, body: '{}', headers: {} }),
  },
  tts: {
    speak: vi.fn().mockResolvedValue(null),
  },
  oauth: {
    openExternal: vi.fn().mockResolvedValue(undefined),
  },
  oauthDeepLink: {
    onCallback: vi.fn().mockReturnValue(() => {}),
  },
  tray: {
    onPlayPause: vi.fn().mockReturnValue(() => {}),
    onNext: vi.fn().mockReturnValue(() => {}),
    onPrevious: vi.fn().mockReturnValue(() => {}),
    updateNowPlaying: vi.fn(),
    updatePlaybackState: vi.fn(),
  },
  notifications: {
    show: vi.fn().mockResolvedValue(undefined),
  },
  platform: 'win32',
}

Object.defineProperty(window, 'electron', {
  value: mockElectron,
  writable: true,
  configurable: true,
})

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
})

// Mock Audio
class MockAudio {
  src = ''
  volume = 1
  currentTime = 0
  duration = 180
  paused = true
  onended: (() => void) | null = null
  oncanplaythrough: (() => void) | null = null
  onerror: (() => void) | null = null
  play = vi.fn().mockResolvedValue(undefined)
  pause = vi.fn()
  load = vi.fn()
  addEventListener = vi.fn()
  removeEventListener = vi.fn()
}

vi.stubGlobal('Audio', MockAudio)

// Mock AudioContext
class MockAudioContext {
  state = 'running'
  sampleRate = 44100
  destination = {}
  createBufferSource = vi.fn().mockReturnValue({
    buffer: null,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null,
    disconnect: vi.fn(),
  })
  createGain = vi.fn().mockReturnValue({
    gain: { value: 1, setValueAtTime: vi.fn() },
    connect: vi.fn(),
    disconnect: vi.fn(),
  })
  createAnalyser = vi.fn().mockReturnValue({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteFrequencyData: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
  })
  decodeAudioData = vi.fn().mockResolvedValue({
    duration: 3.0,
    numberOfChannels: 1,
    sampleRate: 44100,
    length: 132300,
    getChannelData: vi.fn().mockReturnValue(new Float32Array(132300)),
  })
  resume = vi.fn().mockResolvedValue(undefined)
  close = vi.fn().mockResolvedValue(undefined)
}

vi.stubGlobal('AudioContext', MockAudioContext)
vi.stubGlobal('webkitAudioContext', MockAudioContext)

// Mock URL.createObjectURL / revokeObjectURL
if (typeof URL !== 'undefined') {
  URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url')
  URL.revokeObjectURL = vi.fn()
}

// Mock SpeechSynthesis
const mockSpeechSynthesis = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn().mockReturnValue([
    { name: 'Test Voice', lang: 'en-US', default: true, localService: true, voiceURI: 'test-voice' },
  ]),
  speaking: false,
  paused: false,
  pending: false,
  onvoiceschanged: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

Object.defineProperty(window, 'speechSynthesis', {
  value: mockSpeechSynthesis,
  writable: true,
  configurable: true,
})

vi.stubGlobal('SpeechSynthesisUtterance', vi.fn().mockImplementation(() => ({
  text: '',
  voice: null,
  rate: 1,
  pitch: 1,
  volume: 1,
  onend: null,
  onerror: null,
})))

// Mock fetch
vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({}),
  text: () => Promise.resolve(''),
  blob: () => Promise.resolve(new Blob()),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  headers: new Headers(),
}))

// Mock matchMedia (for prefers-reduced-motion, etc.)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Reset all mocks between tests
afterEach(() => {
  vi.clearAllMocks()
  localStorageMock.clear()
})
