import { useState, useEffect } from 'react';
import './VolumeControl.css';

interface VolumeControlProps {
  /**
   * YouTube player instance (if using YouTube provider)
   */
  youtubePlayer?: any;
  
  /**
   * Initial volume (0-100)
   */
  initialVolume?: number;
  
  /**
   * Callback when volume changes
   */
  onVolumeChange?: (volume: number) => void;
}

/**
 * Volume Control Component
 * 
 * Displays volume slider with mute/unmute button.
 * Persists volume preference to localStorage.
 * Works with any music provider.
 */
export function VolumeControl({ youtubePlayer, initialVolume = 80, onVolumeChange }: VolumeControlProps) {
  const [volume, setVolume] = useState(() => {
    // Load saved volume from localStorage
    const saved = localStorage.getItem('djai_volume');
    return saved ? parseInt(saved, 10) : initialVolume;
  });
  
  const [isMuted, setIsMuted] = useState(false);
  const [_volumeBeforeMute, setVolumeBeforeMute] = useState(volume);

  // Apply volume to YouTube player when it changes
  useEffect(() => {
    if (youtubePlayer && typeof youtubePlayer.setVolume === 'function') {
      try {
        youtubePlayer.setVolume(isMuted ? 0 : volume);
      } catch (error) {
        // Player not ready yet
      }
    }
  }, [volume, isMuted, youtubePlayer]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value, 10);
    setVolume(newVolume);
    
    // Save to localStorage
    localStorage.setItem('djai_volume', newVolume.toString());
    
    // If was muted and user moves slider, unmute
    if (isMuted && newVolume > 0) {
      setIsMuted(false);
    }
    
    // Notify parent
    if (onVolumeChange) {
      onVolumeChange(newVolume);
    }
  };

  const toggleMute = () => {
    if (isMuted) {
      // Unmute - restore previous volume
      setIsMuted(false);
    } else {
      // Mute - save current volume
      setVolumeBeforeMute(volume);
      setIsMuted(true);
    }
  };

  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return '🔇'; // Muted
    } else if (volume < 33) {
      return '🔈'; // Low
    } else if (volume < 66) {
      return '🔉'; // Medium
    } else {
      return '🔊'; // High
    }
  };

  return (
    <div className="volume-control">
      <button 
        className="volume-mute-btn"
        onClick={toggleMute}
        title={isMuted ? 'Unmute' : 'Mute'}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        {getVolumeIcon()}
      </button>
      
      <input
        type="range"
        min="0"
        max="100"
        value={isMuted ? 0 : volume}
        onChange={handleVolumeChange}
        className="volume-slider"
        title={`Volume: ${volume}%`}
        aria-label="Volume"
      />
      
      <span className="volume-percentage">{volume}%</span>
    </div>
  );
}
