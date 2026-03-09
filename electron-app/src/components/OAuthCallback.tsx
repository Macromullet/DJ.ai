import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './OAuthCallback.css';

interface OAuthCallbackProps {
  onSuccess: (provider: string, callbackUrl: string) => void;
}

export function OAuthCallback({ onSuccess }: OAuthCallbackProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    (async () => {
      try {
        const params = new URLSearchParams(location.search);
        const code = params.get('code');
        const state = params.get('state');
        const oauthError = params.get('error');

        if (oauthError) {
          console.error('OAuth error:', oauthError);
          setError(`Authentication failed: ${oauthError}`);
          redirectTimer = setTimeout(() => navigate('/'), 3000);
          return;
        }

        if (!code) {
          console.error('No authorization code received');
          setError('No authorization code received. Redirecting...');
          redirectTimer = setTimeout(() => navigate('/'), 3000);
          return;
        }

        // Determine which provider initiated the OAuth flow
        // Use state-based lookup first, fallback to pending provider
        let provider = '';
        if (state) {
          provider = localStorage.getItem(`djai_oauth_state_${state}`) || '';
        }
        
        if (!provider) {
          provider = localStorage.getItem('djai_oauth_pending_provider') || 'apple';
        }
        
        // Pass the full callback URL to parent
        onSuccess(provider, window.location.href);
        
        // Redirect back to main app
        navigate('/');
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError('Authentication failed unexpectedly. Redirecting...');
        redirectTimer = setTimeout(() => navigate('/'), 3000);
      }
    })();

    return () => {
      if (redirectTimer !== undefined) {
        clearTimeout(redirectTimer);
      }
    };
  }, [location, navigate, onSuccess]);

  return (
    <div className={`oauth-callback ${error ? 'oauth-callback--error' : 'oauth-callback--loading'}`}>
      <div className="oauth-callback__icon">{error ? '❌' : '🔄'}</div>
      <h2>{error ? 'Authentication Error' : 'Completing authentication...'}</h2>
      <p>{error || "You'll be redirected shortly."}</p>
    </div>
  );
}
