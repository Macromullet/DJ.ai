# Web APIs

> Browser platform APIs that DJ.ai uses for audio, speech, storage, and binary data.

DJ.ai runs inside Electron's Chromium renderer, which means it has access to the full set of modern Web APIs. The app uses these browser-native capabilities for **audio frequency analysis** (Web Audio API), **free text-to-speech** (Web Speech API), **audio blob management** (URL/Blob APIs), and **client-side persistence** (localStorage). Understanding these APIs is essential because they're the foundation of DJ.ai's audio and storage features.

---

## 🗺️ Learning Path

| Order | Topic | What You'll Learn |
|-------|-------|-------------------|
| 1 | [Web Audio API](./web-audio-api.md) | AudioContext, frequency analysis, audio graphs |
| 2 | [Web Speech API](./web-speech-api.md) | SpeechSynthesis for free browser TTS |
| 3 | [URL & Blob](./url-and-blob.md) | Object URLs for audio playback, memory management |
| 4 | [localStorage](./local-storage.md) | Client-side persistence for tokens and settings |

---

## 🔗 DJ.ai Connection

| API | DJ.ai Usage |
|-----|------------|
| Web Audio API | AudioVisualizer uses `AnalyserNode` for real-time frequency data → Three.js GPU visualization |
| Web Speech API | WebSpeechTTSService uses `SpeechSynthesis` as a free TTS fallback |
| URL / Blob | TTS services create audio Blobs, convert to object URLs for `Audio` element playback |
| localStorage | OAuth tokens, settings, device token, volume, onboarding status |

---

## 📖 Resources

- [Web APIs (MDN)](https://developer.mozilla.org/en-US/docs/Web/API) — Complete Web API reference
- [Using Web APIs](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Client-side_web_APIs/Introduction) — Introduction to browser APIs
