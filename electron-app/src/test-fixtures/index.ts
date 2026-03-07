// Test fixture utilities for audio blobs and base64 data.
// Binary fixture files (silence-1s.wav, silence-1s.mp3) are generated
// by scripts/generate-fixtures.mjs. These helpers provide lightweight
// in-memory equivalents usable in any test environment (jsdom/node).

/** Minimal valid WAV: 44-byte header with zero-length data chunk */
const WAV_HEADER = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, // RIFF
  0x24, 0x00, 0x00, 0x00, // file size - 8
  0x57, 0x41, 0x56, 0x45, // WAVE
  0x66, 0x6D, 0x74, 0x20, // fmt
  0x10, 0x00, 0x00, 0x00, // chunk size 16
  0x01, 0x00, 0x01, 0x00, // PCM, mono
  0x44, 0xAC, 0x00, 0x00, // 44100 Hz
  0x88, 0x58, 0x01, 0x00, // byte rate
  0x02, 0x00, 0x10, 0x00, // block align, bits per sample
  0x64, 0x61, 0x74, 0x61, // data
  0x00, 0x00, 0x00, 0x00, // data size 0
]);

/** Minimal valid MP3 frame header (MPEG1 Layer3, 128kbps, 44.1kHz) */
function buildMp3Frame(): Uint8Array {
  const frame = new Uint8Array(417);
  frame[0] = 0xFF;
  frame[1] = 0xFB;
  frame[2] = 0x90;
  frame[3] = 0x04;
  return frame;
}

export function getSilenceWavBlob(): Blob {
  return new Blob([WAV_HEADER as BlobPart], { type: 'audio/wav' });
}

export function getSilenceMp3Blob(): Blob {
  return new Blob([buildMp3Frame() as BlobPart], { type: 'audio/mpeg' });
}

export function getSilenceWavBase64(): string {
  return 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
}

export function getSilenceMp3Base64(): string {
  return '//uQwAAA' + 'A'.repeat(100);
}
