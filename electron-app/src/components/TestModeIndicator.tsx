import React, { useState } from 'react';
import { isTestMode } from '../config/testMode';

const TestModeIndicator: React.FC = () => {
  const [expanded, setExpanded] = useState(true);

  if (!isTestMode()) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      backgroundColor: '#ff9800',
      color: 'white',
      padding: '10px 15px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      zIndex: 9999,
      maxWidth: expanded ? '400px' : '150px',
      transition: 'all 0.3s ease'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>🧪 TEST MODE</strong>
        <button 
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            padding: '5px 10px',
            borderRadius: '4px',
            fontSize: '12px'
          }}
        >
          {expanded ? '−' : '+'}
        </button>
      </div>
      
      {expanded && (
        <div style={{ marginTop: '10px', fontSize: '13px' }}>
          <p style={{ margin: '5px 0' }}>
            Using <strong>MockMusicProvider</strong> with 100 test tracks
          </p>
          <div style={{ marginTop: '10px' }}>
            <strong>Try searching for:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>"Test Track 1" - "Test Track 100"</li>
              <li>"Test Artist 1" - "Test Artist 10"</li>
              <li>"Test Album 1" - "Test Album 20"</li>
              <li>Or just search "test" to see all</li>
            </ul>
          </div>
          <div style={{ 
            marginTop: '10px', 
            padding: '8px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <strong>Features available:</strong>
            <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
              <li>✅ Search & Browse</li>
              <li>✅ Play/Pause/Next/Previous</li>
              <li>✅ Auto-advance</li>
              <li>✅ Text-to-Speech (browser)</li>
              <li>❌ No API calls needed</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestModeIndicator;
