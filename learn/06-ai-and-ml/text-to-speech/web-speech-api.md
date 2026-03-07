# Web Speech API

## Overview

The Web Speech API is a **browser-native** TTS system — no API key, no cloud service, no cost. It uses the operating system's built-in speech synthesis engine. While the quality is lower than cloud TTS services, it provides an essential **zero-cost fallback** for DJ.ai.

## How It Works

```javascript
const utterance = new SpeechSynthesisUtterance('Next up, a classic banger!');
utterance.voice = speechSynthesis.getVoices().find(v => v.name === 'Google US English');
utterance.rate = 1.1;    // 0.1 to 10 (1.0 = normal)
utterance.pitch = 1.0;   // 0 to 2 (1.0 = normal)
utterance.volume = 0.8;  // 0 to 1

speechSynthesis.speak(utterance);

// Events
utterance.onend = () => console.log('Done speaking');
utterance.onerror = (e) => console.error('Speech error:', e);
```

### Available Voices

Voices vary by OS and browser:

| OS | Typical Voices |
|----|----------------|
| macOS | Samantha, Alex, Daniel, Fiona (~30 voices) |
| Windows | David, Zira, Mark (~3-5 built-in, more via language packs) |
| Linux | espeak voices (robotic but functional) |
| ChromeOS | Google voices (highest quality for Web Speech) |

## DJ.ai Implementation

| File | Role |
|------|------|
| `electron-app/src/services/WebSpeechTTSService.ts` | Browser-native TTS wrapper implementing `ITTSService` |

### Key Implementation Details

```typescript
// Simplified from WebSpeechTTSService.ts
class WebSpeechTTSService implements ITTSService {
  async speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = this.selectedVoice;
      utterance.rate = this.rate;
      utterance.pitch = this.pitch;
      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);
      speechSynthesis.speak(utterance);
    });
  }

  stop(): void {
    speechSynthesis.cancel();
  }

  async getVoices(): Promise<string[]> {
    // Voices load asynchronously — may need to wait for 'voiceschanged' event
    return speechSynthesis.getVoices().map(v => v.name);
  }
}
```

### Why Web Speech as Fallback?

| Advantage | Details |
|-----------|---------|
| **Free** | No API key, no billing |
| **Offline** | Works without internet (uses OS voice engine) |
| **Instant** | No network latency |
| **Zero setup** | No configuration needed |

| Limitation | Details |
|------------|---------|
| **Quality** | Robotic compared to neural TTS |
| **Voices** | OS-dependent, limited selection |
| **Consistency** | Sounds different on each platform |
| **No streaming** | Must wait for full text before speaking |

### Quirks and Gotchas

1. **Voice loading is async**: `getVoices()` may return empty on first call. Listen for the `voiceschanged` event.
2. **Chrome 15-second limit**: Chrome stops utterances longer than ~15 seconds. Split long text into chunks.
3. **Cancel before new speech**: Always call `speechSynthesis.cancel()` before starting new speech to avoid queueing.

## Key Takeaways

- Web Speech API provides free, offline, zero-config TTS
- Quality is lower than cloud services but sufficient as a fallback
- Available voices depend on the OS, not the browser
- Use it as the default when users haven't configured a paid TTS provider
- Handle the async voice loading and Chrome's time limit quirks

## References

- [MDN — SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
- [MDN — SpeechSynthesisUtterance](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance)
- [Web Speech API Spec](https://wicg.github.io/speech-api/)
