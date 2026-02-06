import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface OAuthCallbackProps {
  onSuccess: (provider: string, callbackUrl: string) => void;
}

export function OAuthCallback({ onSuccess }: OAuthCallbackProps) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const state = params.get('state');
      const error = params.get('error');

      if (error) {
        console.error('OAuth error:', error);
        alert(`Authentication failed: ${error}`);
        navigate('/');
        return;
      }

      if (!code) {
        console.error('No authorization code received');
        navigate('/');
        return;
      }

      // Determine which provider initiated the OAuth flow
      // Fix 3: Use state-based lookup first, fallback to pending provider
      let provider = '';
      if (state) {
        provider = localStorage.getItem(`djai_oauth_state_${state}`) || '';
      }
      
      if (!provider) {
        provider = localStorage.getItem('djai_oauth_pending_provider') || 'youtube';
      }
      
      // Cleanup happens in the provider handler now
      
      // Pass the full callback URL to parent
      onSuccess(provider, window.location.href);
      
      // Redirect back to main app
      navigate('/');
    };

    handleCallback();
  }, [location, navigate, onSuccess]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#1a1a1a',
      color: '#FFD700',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{ fontSize: '48px' }}>🔄</div>
      <h2>Completing authentication...</h2>
      <p>You'll be redirected shortly.</p>
    </div>
  );
}
