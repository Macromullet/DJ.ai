# Web Audio API

> AudioContext, frequency analysis, and audio graphs — the technology behind DJ.ai's GPU visualizer.

The Web Audio API provides a powerful system for controlling audio in web applications. DJ.ai uses it to analyze audio frequency data in real time, feeding that data into a Three.js WebGL renderer to create GPU-accelerated visualizations (bars, waves, particles, rings) that react to the music. The API models audio processing as a **graph of nodes** connected together.

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

The `AnalyserNode` provides real-time frequency and time-domain analysis — this is what powers DJ.ai's visualizer:

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

  // Feed into Three.js visualization
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
     │         └──→ [Data fed to AudioVisualizer (Three.js)]
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

### Visualization Modes in DJ.ai

The `AudioVisualizer` component offers multiple visualization modes, each using the same frequency data differently:

```typescript
// Bars — height based on frequency magnitude
bars.forEach((bar, i) => {
  bar.scale.y = dataArray[i] / 255; // Normalize to 0-1
});

// Wave — vertex positions based on waveform
analyser.getByteTimeDomainData(waveArray); // Time-domain data
wave.geometry.setAttribute('position', /* waveform vertices */);

// Particles — particle positions react to frequencies
particles.forEach((p, i) => {
  const freq = dataArray[i % analyser.frequencyBinCount];
  p.position.y = freq / 255 * maxHeight;
});

// Rings — ring radius pulses with bass frequencies
const bassEnergy = dataArray.slice(0, 4).reduce((a, b) => a + b) / 4;
ring.scale.set(bassEnergy / 255, bassEnergy / 255, 1);
```

---

## 🔗 DJ.ai Connection

- **`electron-app/src/components/AudioVisualizer.tsx`** — Creates `AudioContext`, `AnalyserNode`, and connects them to the audio source; reads frequency data with `getByteFrequencyData()` in a `requestAnimationFrame` loop; renders with Three.js `WebGLRenderer`
- **`electron-app/src/App.tsx`** — Manages the `AudioContext` lifecycle and passes it to the AudioVisualizer component
- **`electron-app/src/components/VolumeControl.tsx`** — Could use `GainNode` for precise volume control (currently uses HTML audio element volume)

---

## 🎯 Key Takeaways

- Web Audio API models audio processing as a **graph of connected nodes**
- **`AnalyserNode`** provides real-time frequency data without modifying the audio stream
- **`getByteFrequencyData()`** fills a `Uint8Array` with 0-255 frequency magnitudes
- DJ.ai feeds this data into **Three.js** for GPU-accelerated visualization at 60fps
- `AudioContext` must be **resumed after user interaction** (browser autoplay policy)
- Higher `fftSize` = more frequency bins = more detail, but more computation

---

## 📖 Resources

- [Web Audio API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) — Comprehensive guide
- [AudioContext (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext) — Entry point API
- [AnalyserNode (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode) — Frequency analysis node
- [Visualizations with Web Audio API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API) — Tutorial on building visualizers
