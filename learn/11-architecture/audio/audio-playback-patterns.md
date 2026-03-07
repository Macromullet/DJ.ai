# Audio Playback Patterns

## The Concept

Web browsers provide two primary ways to play audio:

1. **HTML5 Audio Element** (`new Audio()`) — Simple, declarative, handles decoding automatically
2. **Web Audio API** (`AudioContext`) — Low-level, programmable, supports processing and visualization

Most applications should start with the Audio element and fall back to AudioContext only when needed (for processing, visualization, or when autoplay policies block the simpler approach).

### HTML5 Audio Element

```typescript
const audio = new Audio(url);
audio.volume = 0.8;
audio.play();
audio.pause();
audio.onended = () => console.log('Done');
audio.onerror = (e) => console.error('Audio error', e);
```

**Pros:** Simple API, automatic decoding, built-in buffering
**Cons:** Limited processing capabilities, no frequency analysis

### Web Audio API

```typescript
const ctx = new AudioContext();
const response = await fetch(audioUrl);
const buffer = await ctx.decodeAudioData(await response.arrayBuffer());

const source = ctx.createBufferSource();
source.buffer = buffer;
source.connect(ctx.destination);
source.start();
```

**Pros:** Audio processing, frequency analysis, mixing multiple sources
**Cons:** More complex, requires manual buffer management

## How DJ.ai Handles Audio Playback

### Primary Path: HTML5 Audio

DJ.ai uses the Audio element as the primary playback mechanism for TTS:

```typescript
// Simplified from DJ.ai's TTS services
async speak(text: string): Promise<void> {
  const wavBlob = await this.generateSpeech(text);
  const url = URL.createObjectURL(wavBlob);

  this.audio = new Audio(url);
  this.audio.volume = this.volume;

  this.audio.onended = () => {
    URL.revokeObjectURL(url);
    this.onComplete?.();
  };

  this.audio.onerror = (e) => {
    URL.revokeObjectURL(url);
    console.error('TTS playback failed:', e);
  };

  await this.audio.play();
}
```

### Fallback: AudioContext

Some browsers block `audio.play()` without user interaction (autoplay policy). The AudioContext fallback handles this:

```typescript
async playWithFallback(url: string): Promise<void> {
  try {
    // Try HTML5 Audio first
    const audio = new Audio(url);
    await audio.play();
  } catch (e) {
    // Fallback to AudioContext
    const ctx = new AudioContext();
    const response = await fetch(url);
    const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  }
}
```

### Error Handling

Audio playback can fail for many reasons — network errors, unsupported formats, autoplay restrictions, or corrupted data:

```typescript
this.audio.onerror = (event) => {
  const error = this.audio?.error;
  switch (error?.code) {
    case MediaError.MEDIA_ERR_ABORTED:
      console.log('Playback aborted');
      break;
    case MediaError.MEDIA_ERR_NETWORK:
      console.error('Network error during playback');
      break;
    case MediaError.MEDIA_ERR_DECODE:
      console.error('Audio decoding failed');
      break;
    case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
      console.error('Audio format not supported');
      break;
  }
};
```

## DJ.ai Connection

DJ.ai's TTS services in `electron-app/src/services/` use the HTML5 Audio element as the primary playback path. Each service creates an `Audio` instance, sets the Blob URL as the source, and handles `onended`/`onerror` events for cleanup. The AudioContext path is used when browser autoplay policies block the simpler approach. Music playback (from Spotify/Apple Music) uses embedded players rather than direct Audio elements.

## Key Takeaways

- Start with HTML5 Audio — it's simpler and handles most use cases
- AudioContext is the fallback for autoplay restrictions and the path for audio visualization
- Always handle `onerror` — audio playback fails silently without error handlers
- Clean up resources (Blob URLs, AudioContext) when playback ends or fails

## Further Reading

- [MDN: HTMLAudioElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement)
- [MDN: Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [MDN: Autoplay Guide](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide)
