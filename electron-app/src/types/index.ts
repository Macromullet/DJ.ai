export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArtUrl?: string;
  durationMs: number;
  serviceUrl?: string;
  djCommentary?: string;
}

// Re-export provider types
export * from './IMusicProvider';
