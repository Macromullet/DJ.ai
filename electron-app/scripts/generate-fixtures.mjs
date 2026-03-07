// Generate valid minimal MP3 and WAV files for testing
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', 'src', 'test-fixtures');

if (!existsSync(fixturesDir)) mkdirSync(fixturesDir, { recursive: true });

// Valid WAV file: 44-byte header + 44100 samples of silence (1 second, 16-bit mono, 44.1kHz)
function createWav() {
  const sampleRate = 44100;
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = sampleRate; // 1 second
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // chunk size
  buffer.writeUInt16LE(1, 20);  // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28); // byte rate
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32); // block align
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  // Data is all zeros (silence)

  return buffer;
}

// Valid minimal MP3 frame (MPEG1 Layer3, 128kbps, 44100Hz, stereo)
function createMp3() {
  // MP3 frame header: 0xFFFB9004 = sync(FFF) + MPEG1(11) + Layer3(01) + no CRC(1) + 128kbps(1001) + 44.1kHz(00) + no padding(0) + stereo(00)
  // Frame size = 144 * bitrate / sampleRate + padding = 144 * 128000 / 44100 = 417 bytes
  const frameSize = 417;
  const numFrames = 38; // ~1 second at 44.1kHz (each frame = 1152 samples)
  const buffer = Buffer.alloc(frameSize * numFrames);

  for (let i = 0; i < numFrames; i++) {
    const offset = i * frameSize;
    buffer[offset] = 0xFF;
    buffer[offset + 1] = 0xFB;
    buffer[offset + 2] = 0x90;
    buffer[offset + 3] = 0x04;
    // Rest is silence (zeros)
  }

  return buffer;
}

writeFileSync(join(fixturesDir, 'silence-1s.wav'), createWav());
writeFileSync(join(fixturesDir, 'silence-1s.mp3'), createMp3());
console.log('Generated: silence-1s.wav (' + createWav().length + ' bytes)');
console.log('Generated: silence-1s.mp3 (' + createMp3().length + ' bytes)');
