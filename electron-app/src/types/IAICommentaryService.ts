// Placeholder for AI Commentary Service interface
// TODO: Implement when re-integrating AI commentary

export interface AICommentary {
  text: string;
  timestamp: Date;
  trackId: string;
}

export interface PreviousTrackContext {
  title: string;
  artist: string;
}

export interface IAICommentaryService {
  generateCommentary(
    trackTitle: string,
    artist: string,
    album?: string,
    previousTrack?: PreviousTrackContext
  ): Promise<AICommentary>;
  
  getCommentaryForTrack(trackId: string): Promise<AICommentary | null>;
  
  clearCache(): void;
}
