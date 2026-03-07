# Web Audio API

> AudioContext, audio graphs, and programmatic audio control — the technology behind DJ.ai's audio playback and TTS pipeline.

The Web Audio API provides a powerful system for controlling audio in web applications. DJ.ai uses it for audio playback management, volume control via `GainNode`, and potential future audio analysis. The API models audio processing as a **graph of nodes** connected together.

---

## Core Concepts

### AudioContext

`AudioContext` is the entry point for all Web Audio operations. It represents an audio processing graph and manages the creation of audio nodes:

```typescript
// Create a single AudioContext for the app
const audioContext = new AudioContext();

// Resume after user interaction (browser autoplay policy)
document.addEventListener('click', () => {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
});
```

**Important:** Browsers require user interaction before allowing audio playback. The AudioContext starts in a `'suspended'` state and must be resumed after a gesture.

### AnalyserNode

The `AnalyserNode` provides real-time frequency and time-domain analysis — useful for audio metering and future visualization features:

```typescript
// Create an analyser
const analyser = audioContext.createAnalyser();
analyser.fftSize = 256; // FFT size (power of 2)
// frequencyBinCount = fftSize / 2 = 128 frequency bins

// Connect audio source → analyser → speakers
const source = audioContext.createMediaElementSource(audioElement);
source.connect(analyser);
analyser.connect(audioContext.destination);

// Read frequency data (0-255 range)
const dataArray = new Uint8Array(analyser.frequencyBinCount);

function animate() {
  analyser.getByteFrequencyData(dataArray);
  // dataArray[0] = bass, dataArray[127] = treble
  // Values 0-255 representing magnitude at each frequency

  // Feed into visualization or audio metering
  updateVisualization(dataArray);

  requestAnimationFrame(animate);
}
animate();
```

### Audio Node Graph

The Web Audio API uses a graph model where audio flows through connected nodes:

```
Audio Source (HTMLAudioElement / MediaStream)
     │
     ├──→ AnalyserNode (frequency analysis, no modification)
     │         │
     │         └──→ [Data available for metering or visualization]
     │
     └──→ GainNode (volume control)
              │
              └──→ AudioContext.destination (speakers)
```

```typescript
// Building the audio graph
const source = audioContext.createMediaElementSource(audioElement);
const gain = audioContext.createGain();
const analyser = audioContext.createAnalyser();

source.connect(analyser);    // Source → Analyser (for visualization)
analyser.connect(gain);      // Analyser → Gain (for volume)
gain.connect(audioContext.destination); // Gain → Speakers

// Control volume programmatically
gain.gain.value = 0.8; // 80% volume
```

### FFT (Fast Fourier Transform)

The `fftSize` property controls the frequency resolution. A higher value gives more frequency bins but less time resolution:

| fftSize | frequencyBinCount | Use Case |
|---------|-------------------|----------|
| 64 | 32 | Coarse bars (fast) |
| 256 | 128 | DJ.ai default — good balance |
| 1024 | 512 | Detailed spectrum (slower) |
| 2048 | 1024 | High-resolution analysis |

---

## 🔗 DJ.ai Connection

- **`electron-app/src/App.tsx`** — Manages the `AudioContext` lifecycle for playback and TTS audio
- **`electron-app/src/components/VolumeControl.tsx`** — Could use `GainNode` for precise volume control (currently uses HTML audio element volume)
- **Future:** A planned GPU visualizer will use `AnalyserNode` and `getByteFrequencyData()` for real-time audio-reactive graphics

---

## 🎯 Key Takeaways

- Web Audio API models audio processing as a **graph of connected nodes**
- **`AnalyserNode`** provides real-time frequency data without modifying the audio stream
- **`getByteFrequencyData()`** fills a `Uint8Array` with 0-255 frequency magnitudes
- DJ.ai uses the Web Audio API for **audio playback and TTS**; a planned GPU visualizer will leverage `AnalyserNode` for audio-reactive graphics
- `AudioContext` must be **resumed after user interaction** (browser autoplay policy)
- Higher `fftSize` = more frequency bins = more detail, but more computation

---

## 📖 Resources

- [Web Audio API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — Comprehensive guide
- [AudioContext (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext) — Entry point API
- [AnalyserNode (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) — Frequency analysis node
- [Visualizations with Web Audio API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API) — Tutorial on building visualizers
