import { useState, useEffect, useRef } from 'react';
import './TrackProgressBar.css';

interface TrackProgressBarProps {
  /**
   * Current playback position in milliseconds (polled from provider)
   */
  currentTimeMs?: number;
  
  /**
   * Current track duration in milliseconds
   */
  durationMs?: number;
  
  /**
   * Whether playback is active
   */
  isPlaying: boolean;
  
  /**
   * Callback when user seeks to a position
   */
  onSeek?: (positionMs: number) => void;
}

/**
 * Track Progress Bar Component
 * 
 * Displays current playback position with seek functionality.
 * Updates in real-time while playing.
 * Works with any music provider.
 */
export function TrackProgressBar({ currentTimeMs: currentTimeMsProp, durationMs, isPlaying, onSeek }: TrackProgressBarProps) {
  const [currentTimeMs, setCurrentTimeMs] = useState(currentTimeMsProp || 0);
  const [duration, setDuration] = useState(durationMs || 0);
  const [isDragging, setIsDragging] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Refs to avoid stale closures in window event handlers
  const durationRef = useRef(duration);
  const onSeekRef = useRef(onSeek);

  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);

  // Update duration when prop changes
  useEffect(() => {
    if (durationMs) {
      setDuration(durationMs);
    }
  }, [durationMs]);

  // Update currentTimeMs from prop when not dragging
  useEffect(() => {
    if (!isDragging && currentTimeMsProp !== undefined) {
      setCurrentTimeMs(currentTimeMsProp);
    }
  }, [currentTimeMsProp, isDragging]);

  // Poll playback position while playing (increment locally for smooth progress)
  useEffect(() => {
    if (isPlaying && !isDragging) {
      intervalRef.current = window.setInterval(() => {
        setCurrentTimeMs(prev => prev + 100);
      }, 100);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, isDragging]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (clientX: number) => {
    const dur = durationRef.current;
    if (!progressBarRef.current || !dur) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = (clientX - rect.left) / rect.width;
    const newPositionMs = Math.max(0, Math.min(dur, percent * dur));
    
    setCurrentTimeMs(newPositionMs);

    if (onSeekRef.current) {
      onSeekRef.current(newPositionMs);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleSeek(e.clientX);
  };

  // Use refs for the handlers so window listeners always call latest versions
  const handleMouseMoveRef = useRef((_e: MouseEvent) => {});
  const handleMouseUpRef = useRef(() => {});

  handleMouseMoveRef.current = (e: MouseEvent) => {
    handleSeek(e.clientX);
  };

  handleMouseUpRef.current = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      const onMove = (e: MouseEvent) => handleMouseMoveRef.current(e);
      const onUp = () => handleMouseUpRef.current();
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      
      return () => {
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
    }
  }, [isDragging]);

  const progressPercent = duration > 0 ? (currentTimeMs / duration) * 100 : 0;
  const currentSeconds = Math.floor(currentTimeMs / 1000);
  const totalSeconds = Math.floor(duration / 1000);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!duration) return;
    const seekStep = 5000; // 5 seconds in ms
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const newPos = Math.min(duration, currentTimeMs + seekStep);
      setCurrentTimeMs(newPos);
      onSeek?.(newPos);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const newPos = Math.max(0, currentTimeMs - seekStep);
      setCurrentTimeMs(newPos);
      onSeek?.(newPos);
    }
  };

  return (
    <div className="track-progress-bar">
      <div className="progress-time">{formatTime(currentTimeMs)}</div>
      
      <div 
        ref={progressBarRef}
        className="progress-bar-container"
        onMouseDown={handleMouseDown}
        role="slider"
        aria-label="Track progress"
        aria-valuenow={currentSeconds}
        aria-valuemin={0}
        aria-valuemax={totalSeconds}
        aria-valuetext={`${formatTime(currentTimeMs)} of ${formatTime(duration)}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="progress-bar-bg">
          <div 
            className="progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="progress-handle" />
          </div>
        </div>
      </div>
      
      <div className="progress-time">{formatTime(duration)}</div>
    </div>
  );
}
