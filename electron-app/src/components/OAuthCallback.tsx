import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface OAuthCallbackProps {
  onSuccess: (provider: string, callbackUrl: string) => void;
}

export function OAuthCallback({ onSuccess }: OAuthCallbackProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const state = params.get('state');
      const oauthError = params.get('error');

      if (oauthError) {
        console.error('OAuth error:', oauthError);
        setError(`Authentication failed: ${oauthError}`);
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      if (!code) {
        console.error('No authorization code received');
        setError('No authorization code received. Redirecting...');
        setTimeout(() => navigate('/'), 3000);
        return;
      }

      // Determine which provider initiated the OAuth flow
      // Fix 3: Use state-based lookup first, fallback to pending provider
      let provider = '';
      if (state) {
        provider = localStorage.getItem(`djai_oauth_state_${state}`) || '';
      }
      
      if (!provider) {
        provider = localStorage.getItem('djai_oauth_pending_provider') || 'apple';
      }
      
      // Cleanup happens in the provider handler now
      
      // Pass the full callback URL to parent
      onSuccess(provider, window.location.href);
      
      // Redirect back to main app
      navigate('/');
    };

    try {
      handleCallback().catch((err) => {
        console.error('OAuth callback error:', err);
        setError('Authentication failed unexpectedly. Redirecting...');
        setTimeout(() => navigate('/'), 3000);
      });
    } catch (err) {
      console.error('OAuth callback error:', err);
      setError('Authentication failed unexpectedly. Redirecting...');
      setTimeout(() => navigate('/'), 3000);
    }
  }, [location, navigate, onSuccess]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#1a1a1a',
      color: error ? '#ff4444' : '#FFD700',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{ fontSize: '48px' }}>{error ? '❌' : '🔄'}</div>
      <h2>{error ? 'Authentication Error' : 'Completing authentication...'}</h2>
      <p>{error || "You'll be redirected shortly."}</p>
    </div>
  );
}
