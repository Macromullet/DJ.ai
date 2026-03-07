import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import './AudioVisualizer.css';

interface AudioVisualizerProps {
  /**
   * Audio element to visualize
   */
  audioSource?: HTMLAudioElement | any;
  
  /**
   * Whether visualization is active
   */
  isPlaying: boolean;
  
  /**
   * Visualization mode
   */
  mode?: 'bars' | 'wave' | 'particles' | 'rings';
}

/**
 * GPU-Accelerated Audio Visualizer
 * 
 * Uses THREE.js and Web Audio API for real-time music visualization.
 * Multiple modes inspired by classic Winamp visualizations.
 */
export function AudioVisualizer({ audioSource, isPlaying, mode = 'bars' }: AudioVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const visualizersRef = useRef<any>({});
  const isSourceConnectedRef = useRef(false);
  
  const [currentMode, setCurrentMode] = useState(mode);

  // Initialize THREE.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 50;
    cameraRef.current = camera;

    // Create renderer with GPU acceleration
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      
      if (renderer) {
        renderer.dispose();
        containerRef.current?.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Setup audio analysis
  useEffect(() => {
    if (!audioSource) return;

    try {
      // Reuse existing AudioContext if still open, otherwise create a new one
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const audioContext = audioContextRef.current;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      // Connect audio source
      // For HTML5 audio elements, use createMediaElementSource
      // TODO: Connect MusicKit JS or Spotify SDK audio output
      //   const source = audioContext.createMediaElementSource(audioSource);
      //   source.connect(analyser);
      //   analyser.connect(audioContext.destination);
      //   isSourceConnectedRef.current = true;
      
    } catch (error) {
      console.error('Error setting up audio analysis:', error);
    }

    return () => {
      isSourceConnectedRef.current = false;
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [audioSource]);

  // Initialize visualizers
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    
    // Clear existing visualizers
    Object.values(visualizersRef.current).forEach((viz: any) => {
      if (viz.mesh) scene.remove(viz.mesh);
      if (viz.meshes) viz.meshes.forEach((m: any) => scene.remove(m));
    });
    visualizersRef.current = {};

    // Create visualizer based on mode
    switch (currentMode) {
      case 'bars':
        visualizersRef.current.bars = createBarVisualizer(scene);
        break;
      case 'wave':
        visualizersRef.current.wave = createWaveVisualizer(scene);
        break;
      case 'particles':
        visualizersRef.current.particles = createParticleVisualizer(scene);
        break;
      case 'rings':
        visualizersRef.current.rings = createRingVisualizer(scene);
        break;
    }
  }, [currentMode]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !rendererRef.current || !sceneRef.current || !cameraRef.current) {
      return;
    }

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      // Get audio data — use real analyser only if a source is actually connected
      let audioData: number[] = [];
      if (isSourceConnectedRef.current && analyserRef.current && dataArrayRef.current) {
        analyserRef.current.getByteFrequencyData(dataArrayRef.current);
        audioData = Array.from(dataArrayRef.current);
      } else {
        // Fallback: generate fake data for demo
        audioData = generateFallbackAudioData();
      }

      // Update visualizer
      updateVisualizer(currentMode, visualizersRef.current, audioData);

      // Render scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };

    animate();

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isPlaying, currentMode]);

  return (
    <div className="audio-visualizer">
      <div ref={containerRef} className="visualizer-canvas" />
      
      <div className="visualizer-controls">
        <button 
          className={currentMode === 'bars' ? 'active' : ''}
          onClick={() => setCurrentMode('bars')}
          title="Frequency Bars"
        >
          📊
        </button>
        <button 
          className={currentMode === 'wave' ? 'active' : ''}
          onClick={() => setCurrentMode('wave')}
          title="Waveform"
        >
          〰️
        </button>
        <button 
          className={currentMode === 'particles' ? 'active' : ''}
          onClick={() => setCurrentMode('particles')}
          title="Particles"
        >
          ✨
        </button>
        <button 
          className={currentMode === 'rings' ? 'active' : ''}
          onClick={() => setCurrentMode('rings')}
          title="Rings"
        >
          ⭕
        </button>
      </div>
    </div>
  );
}

// ============ VISUALIZER CREATORS ============

function createBarVisualizer(scene: THREE.Scene) {
  const bars: THREE.Mesh[] = [];
  const barCount = 64;
  const barWidth = 1.5;
  const barSpacing = 0.2;
  
  for (let i = 0; i < barCount; i++) {
    const geometry = new THREE.BoxGeometry(barWidth, 1, barWidth);
    const material = new THREE.MeshBasicMaterial({ 
      color: new THREE.Color().setHSL(i / barCount, 1, 0.5)
    });
    const bar = new THREE.Mesh(geometry, material);
    
    bar.position.x = (i - barCount / 2) * (barWidth + barSpacing);
    bar.position.y = 0;
    
    scene.add(bar);
    bars.push(bar);
  }
  
  return { meshes: bars, type: 'bars' };
}

function createWaveVisualizer(scene: THREE.Scene) {
  const points = [];
  const pointCount = 128;
  
  for (let i = 0; i < pointCount; i++) {
    points.push(new THREE.Vector3((i - pointCount / 2) * 0.8, 0, 0));
  }
  
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ 
    color: 0xffd700,
    linewidth: 2
  });
  const line = new THREE.Line(geometry, material);
  
  scene.add(line);
  
  return { mesh: line, points, type: 'wave' };
}

function createParticleVisualizer(scene: THREE.Scene) {
  const particleCount = 1000;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 100;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
    
    const color = new THREE.Color().setHSL(Math.random(), 1, 0.5);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  const material = new THREE.PointsMaterial({ 
    size: 0.5,
    vertexColors: true,
    transparent: true,
    opacity: 0.8
  });
  
  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
  
  return { mesh: particles, type: 'particles' };
}

function createRingVisualizer(scene: THREE.Scene) {
  const rings: THREE.Mesh[] = [];
  const ringCount = 32;
  
  for (let i = 0; i < ringCount; i++) {
    const geometry = new THREE.TorusGeometry(5 + i * 2, 0.2, 16, 100);
    const material = new THREE.MeshBasicMaterial({ 
      color: new THREE.Color().setHSL(i / ringCount, 1, 0.5),
      transparent: true,
      opacity: 0.6
    });
    const ring = new THREE.Mesh(geometry, material);
    
    ring.rotation.x = Math.PI / 2;
    ring.position.z = -i * 2;
    
    scene.add(ring);
    rings.push(ring);
  }
  
  return { meshes: rings, type: 'rings' };
}

// ============ VISUALIZER UPDATERS ============

function updateVisualizer(mode: string, visualizers: any, audioData: number[]) {
  const viz = visualizers[mode];
  if (!viz) return;

  const time = Date.now() * 0.001;

  switch (mode) {
    case 'bars':
      if (viz.meshes) {
        viz.meshes.forEach((bar: THREE.Mesh, i: number) => {
          const dataIndex = Math.floor(i * audioData.length / viz.meshes.length);
          const scale = (audioData[dataIndex] || 50) / 128;
          bar.scale.y = Math.max(0.1, scale * 20);
          bar.position.y = bar.scale.y / 2;
          
          // Color shift based on amplitude
          const hue = (i / viz.meshes.length + scale * 0.5) % 1;
          (bar.material as THREE.MeshBasicMaterial).color.setHSL(hue, 1, 0.5);
        });
      }
      break;

    case 'wave':
      if (viz.mesh && viz.points) {
        const positions = viz.mesh.geometry.attributes.position.array;
        viz.points.forEach((_point: THREE.Vector3, i: number) => {
          const dataIndex = Math.floor(i * audioData.length / viz.points.length);
          const amplitude = (audioData[dataIndex] || 50) / 128;
          
          positions[i * 3 + 1] = Math.sin(i * 0.2 + time * 2) * 5 * amplitude;
        });
        viz.mesh.geometry.attributes.position.needsUpdate = true;
      }
      break;

    case 'particles':
      if (viz.mesh) {
        const positions = viz.mesh.geometry.attributes.position.array;
        const avgAmplitude = audioData.reduce((a, b) => a + b, 0) / audioData.length / 128;
        
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] += Math.sin(time + i) * 0.2 * avgAmplitude;
        }
        
        viz.mesh.rotation.y = time * 0.3;
        viz.mesh.geometry.attributes.position.needsUpdate = true;
      }
      break;

    case 'rings':
      if (viz.meshes) {
        viz.meshes.forEach((ring: THREE.Mesh, i: number) => {
          const dataIndex = Math.floor(i * audioData.length / viz.meshes.length);
          const amplitude = (audioData[dataIndex] || 50) / 128;
          
          ring.scale.set(1 + amplitude * 0.5, 1 + amplitude * 0.5, 1);
          ring.rotation.z = time * 0.5 + i * 0.1;
          
          (ring.material as THREE.MeshBasicMaterial).opacity = 0.3 + amplitude * 0.5;
        });
      }
      break;
  }
}

// ============ FALLBACK DATA ============

function generateFallbackAudioData(): number[] {
  // Generate fake audio data for demo (when real audio is not available)
  const data = new Array(128);
  const time = Date.now() * 0.001;
  
  for (let i = 0; i < data.length; i++) {
    const wave = Math.sin(time * 2 + i * 0.1) * 0.5 + 0.5;
    const noise = Math.random() * 0.3;
    data[i] = (wave + noise) * 255;
  }
  
  return data;
}
