# Web Speech API

> SpeechSynthesis — DJ.ai's free, browser-native text-to-speech fallback.

The Web Speech API provides speech synthesis (text-to-speech) built into every modern browser. DJ.ai's `WebSpeechTTSService` uses this API as a **free fallback** TTS option — no API key required, no network calls, instant availability. While the voice quality is basic compared to OpenAI or ElevenLabs, it's always available and costs nothing.

---

## Core Concepts

### SpeechSynthesis

The `speechSynthesis` global object controls the speech engine:

```typescript
// Basic text-to-speech
const utterance = new SpeechSynthesisUtterance("Now playing Bohemian Rhapsody by Queen");
speechSynthesis.speak(utterance);
```

### SpeechSynthesisUtterance

An utterance represents a speech request with configurable properties:

```typescript
const utterance = new SpeechSynthesisUtterance(text);

// Configure voice properties
utterance.rate = 1.0;     // Speed: 0.1 to 10 (1.0 = normal)
utterance.pitch = 1.0;    // Pitch: 0 to 2 (1.0 = normal)
utterance.volume = 1.0;   // Volume: 0 to 1

// Select a specific voice
const voices = speechSynthesis.getVoices();
utterance.voice = voices.find(v => v.name === 'Google UK English Male');

// Event handlers
utterance.onstart = () => console.log('Speech started');
utterance.onend = () => console.log('Speech finished');
utterance.onerror = (e) => console.error('Speech error:', e.error);
```

### DJ.ai's WebSpeechTTSService

```typescript
// Simplified from electron-app/src/services/WebSpeechTTSService.ts
class WebSpeechTTSService implements ITTSService {
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private rate: number = 1.0;
  private pitch: number = 1.0;

  async speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = this.selectedVoice;
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(new Error(e.error));
      speechSynthesis.speak(utterance);
    });
  }

  stop(): void {
    speechSynthesis.cancel();
  }

  async getAvailableVoices(): Promise<TTSVoice[]> {
    const voices = speechSynthesis.getVoices();
    return voices.map(v => ({
      id: v.name,
      name: v.name,
      language: v.lang,
      provider: 'web-speech',
    }));
  }

  isAvailable(): boolean {
    return 'speechSynthesis' in window;
  }
}
```

### Getting Available Voices

Voices load asynchronously in some browsers. The recommended pattern:

```typescript
function getVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = speechSynthesis.getVoices();
    if (voices.length > 0) {
      resolve(voices);
      return;
    }
    // Chrome loads voices asynchronously
    speechSynthesis.onvoiceschanged = () => {
      resolve(speechSynthesis.getVoices());
    };
  });
}
```

Electron (Chromium) typically provides 20+ voices including:
- System-installed voices (Windows SAPI, macOS AVSpeech)
- Google voices (if online)
- Various languages and genders

### Comparison: WebSpeech vs Other TTS in DJ.ai

| Feature | Web Speech | OpenAI TTS | ElevenLabs | Gemini TTS |
|---------|-----------|------------|------------|------------|
| Cost | Free | Paid | Paid | Paid |
| API Key | Not needed | Required | Required | Required |
| Quality | Basic | High | Very High | High |
| Latency | Instant | ~500ms | ~800ms | ~600ms |
| Voices | 20+ system | 6 | 15+ | Multiple |
| Offline | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Pre-render | ❌ No* | ✅ renderToBlob | ✅ renderToBlob | ✅ renderToBlob |

*Web Speech cannot render to a Blob — it only plays audio directly through the speakers.

### Limitations

- **No `renderToBlob`** — WebSpeech plays directly; can't pre-render audio for seamless transitions
- **Voice quality varies** — depends on the OS and installed voice packs
- **No SSML support** — can't control pronunciation, pauses, or emphasis
- **Chrome queue bug** — long utterances may get stuck; cancel and re-speak as a workaround
- **Cross-platform differences** — different voices available on Windows, macOS, Linux

---

## 🔗 DJ.ai Connection

- **`electron-app/src/services/WebSpeechTTSService.ts`** — Implements `ITTSService` using `SpeechSynthesis` API; provides `speak()`, `stop()`, `setVoice()`, `setRate()`, `setPitch()`, `getAvailableVoices()`, `isAvailable()`
- **`electron-app/src/config/productionMode.ts`** — Selects WebSpeechTTSService as the default TTS when no API keys are configured
- **`electron-app/src/components/Settings.tsx`** — TTS provider dropdown includes "Web Speech" as the free option
- **`electron-app/src/types/ITTSService.ts`** — Interface includes optional `renderToBlob?()` and `speakFromBlob?()` that WebSpeech does **not** implement

---

## 🎯 Key Takeaways

- Web Speech API is **free and always available** — no API key, no network, no cost
- DJ.ai uses it as the **default TTS fallback** when no premium TTS API keys are configured
- It implements `ITTSService.speak()` by wrapping `SpeechSynthesisUtterance` in a Promise
- **Cannot pre-render to Blob** — the main limitation vs. OpenAI/ElevenLabs TTS
- Voice availability depends on the operating system and installed voice packs
- Use `speechSynthesis.cancel()` to stop speech immediately

---

## 📖 Resources

- [Web Speech API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) — Overview
- [SpeechSynthesis (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis) — Speech synthesis interface
- [SpeechSynthesisUtterance (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance) — Utterance configuration
- [Using the Web Speech API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API) — Tutorial
