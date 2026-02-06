/**
 * Environment Configuration
 * 
 * Centralized configuration for environment-specific settings.
 * Replaces hardcoded values with environment variables.
 */

const getEnv = (key: string): string | undefined => {
  return (import.meta as any).env?.[key];
};

const isDev = import.meta.env.DEV;

const oauthProxyUrl = getEnv('VITE_OAUTH_PROXY_URL') ||
  (isDev ? 'http://localhost:7071/api' : null);

if (!oauthProxyUrl) {
  console.error('CRITICAL: VITE_OAUTH_PROXY_URL not configured for production build');
}

export const config = {
  // OAuth Proxy URL (localhost fallback only in development)
  oauthProxyUrl: oauthProxyUrl as string | null,
  
  // Whether the OAuth proxy URL is properly configured
  isOAuthProxyConfigured: !!oauthProxyUrl,
  
  // Environment flags
  isDevelopment: isDev,
  isProduction: getEnv('PROD') === 'true' || getEnv('MODE') === 'production',
} as const;

// Log configuration on startup (only in development)
if (config.isDevelopment) {
  console.log('🔧 DJ.ai Configuration:', {
    oauthProxyUrl: config.oauthProxyUrl,
    environment: config.isDevelopment ? 'development' : 'production',
  });
}

export default config;

