// Placeholder for AI Commentary Service interface
// TODO: Implement when re-integrating AI commentary

export interface AICommentary {
  text: string;
  timestamp: Date;
  trackId: string;
}

export interface IAICommentaryService {
  generateCommentary(
    trackTitle: string,
    artist: string,
    album?: string
  ): Promise<AICommentary>;
  
  getCommentaryForTrack(trackId: string): Promise<AICommentary | null>;
  
  clearCache(): void;
}
