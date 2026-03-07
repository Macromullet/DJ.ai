# Three.js & Audio Visualization

## The Concept

**Three.js** is a JavaScript library for creating 3D graphics in the browser using WebGL. Combined with the **Web Audio API**, it enables real-time audio visualization — transforming frequency and waveform data into dynamic 3D scenes.

### The Rendering Pipeline

```
Web Audio API                    Three.js
─────────────                    ────────
AudioContext                     Scene
  → AnalyserNode                   → Camera
    → getFrequencyData()            → Renderer
      → Float32Array                  → WebGL Canvas
        → Drive 3D geometry
```

### Three.js Core Concepts

| Concept | Description |
|---------|-------------|
| **Scene** | Container for all 3D objects, lights, and cameras |
| **Camera** | Viewpoint (PerspectiveCamera for 3D depth) |
| **Renderer** | Draws the scene to a `<canvas>` element |
| **Mesh** | Geometry (shape) + Material (appearance) |
| **AnimationLoop** | `requestAnimationFrame` loop updating the scene |

### Web Audio API for Frequency Data

```typescript
const audioCtx = new AudioContext();
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256; // Frequency resolution

const source = audioCtx.createMediaElementSource(audioElement);
source.connect(analyser);
analyser.connect(audioCtx.destination);

// In animation loop:
const dataArray = new Uint8Array(analyser.frequencyBinCount);
analyser.getByteFrequencyData(dataArray);
// dataArray now contains frequency amplitudes (0-255)
```

## Audio Visualization in DJ.ai

DJ.ai's planned `AudioVisualizer` component connects the music player's audio to a Three.js scene:

```typescript
// Conceptual implementation (electron-app/src/components/)
function AudioVisualizer({ audioElement }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current! });

    // Connect audio to analyser
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    const source = ctx.createMediaElementSource(audioElement);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    // Create visual elements
    const bars = createFrequencyBars(analyser.frequencyBinCount);
    bars.forEach(bar => scene.add(bar));

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);

      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);

      // Update bar heights based on frequency data
      bars.forEach((bar, i) => {
        bar.scale.y = data[i] / 255;
      });

      renderer.render(scene, camera);
    }

    animate();

    return () => {
      renderer.dispose();
      ctx.close();
    };
  }, [audioElement]);

  return <canvas ref={canvasRef} />;
}
```

### Reduced Motion Consideration

```typescript
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

if (prefersReducedMotion) {
  // Show static visualization or skip entirely
  return <StaticVisualizer />;
}
```

## DJ.ai Connection

The audio visualizer is a planned feature for DJ.ai. It will connect the music player's `HTMLAudioElement` to a Three.js scene via the Web Audio API's `AnalyserNode`. The component will live in `electron-app/src/components/` and respect the `prefers-reduced-motion` preference. GPU-accelerated visualization is one of DJ.ai's differentiating features for the desktop experience.

## Key Takeaways

- Three.js renders 3D scenes via WebGL — ideal for real-time audio visualization
- Web Audio API's `AnalyserNode` provides frequency and waveform data every frame
- Always clean up (dispose renderer, close AudioContext) to prevent memory leaks
- Respect `prefers-reduced-motion` — disable or simplify animations for accessibility

## Further Reading

- [Three.js: Creating a Scene](https://threejs.org/docs/#manual/en/introduction/Creating-a-scene)
- [Three.js: AudioAnalyser](https://threejs.org/docs/#api/en/audio/AudioAnalyser)
- [MDN: Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
