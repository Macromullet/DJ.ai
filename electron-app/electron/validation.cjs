// Pure validation functions extracted from main.cjs for testability

const AI_API_ALLOWLIST = new Set([
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.elevenlabs.io',
]);

const ALLOWED_OAUTH_HOSTS = new Set([
  'accounts.spotify.com',
  'appleid.apple.com',
  'authorize.music.apple.com',
]);

const VALID_PLAYBACK_ACTIONS = new Set(['play', 'pause', 'next', 'previous']);

const TTS_MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Check whether a URL targets an allowed AI API host over HTTPS.
 * Rejects userinfo (credential smuggling) and non-standard ports (SSRF).
 * @param {string} url
 * @returns {boolean}
 */
function isAllowedAIHost(url) {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return false;
    if (parsed.port !== '') return false;
    return parsed.protocol === 'https:' && AI_API_ALLOWLIST.has(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Validate that a redirect URI is a safe OAuth callback destination.
 * Accepts http://localhost:<port>/oauth/callback or djai://oauth/callback
 * Uses proper URL parsing — never string prefix matching.
 * @param {string} uri
 * @returns {boolean}
 */
function isValidRedirectUri(uri) {
  try {
    const parsed = new URL(uri || '');
    if (parsed.username || parsed.password) return false;
    if (parsed.protocol === 'djai:') {
      return parsed.hostname === 'oauth' && parsed.pathname === '/callback';
    }
    return (
      parsed.hostname === 'localhost' &&
      parsed.protocol === 'http:' &&
      parsed.pathname === '/oauth/callback'
    );
  } catch {
    return false;
  }
}

/**
 * Check whether a URL targets an allowed OAuth provider host over HTTPS.
 * Rejects userinfo and non-standard ports.
 * @param {string} url
 * @returns {boolean}
 */
function isAllowedOAuthHost(url) {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) return false;
    if (parsed.port !== '') return false;
    return parsed.protocol === 'https:' && ALLOWED_OAUTH_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

/**
 * Check whether a TTS response is within the 10 MB size limit.
 * Rejects negative, NaN, and Infinity values.
 * @param {number} sizeBytes
 * @returns {boolean}
 */
function isTTSResponseWithinLimit(sizeBytes) {
  return Number.isFinite(sizeBytes) && sizeBytes >= 0 && sizeBytes <= TTS_MAX_SIZE;
}

/**
 * Check whether a playback control action string is valid.
 * @param {string} action
 * @returns {boolean}
 */
function isValidPlaybackAction(action) {
  return VALID_PLAYBACK_ACTIONS.has(action);
}

/**
 * Build the Content-Security-Policy header value applied to the main app window.
 * @param {{ isDev?: boolean }} [options] - If isDev is true, includes unsafe-inline in script-src for Vite HMR
 * @returns {string}
 */
function buildCSP(options = {}) {
  const isDev = options.isDev || false;
  // In production, Vite bundles all JS into external files — no inline scripts needed.
  // In dev mode, Vite HMR requires inline scripts.
  const scriptInline = isDev ? " 'unsafe-inline'" : '';
  return (
    "default-src 'self'; " +
    `script-src 'self'${scriptInline} https://sdk.scdn.co https://apisdk.scdn.co https://js-cdn.music.apple.com; ` +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https: http:; " +
    "media-src 'self' https:; " +
    "connect-src 'self' http://localhost:* https://*.azurewebsites.net https://*.azurestaticapps.net https://api.openai.com https://api.anthropic.com https://generativelanguage.googleapis.com https://api.spotify.com https://accounts.spotify.com https://apisdk.scdn.co https://api.music.apple.com https://authorize.music.apple.com https://api.elevenlabs.io;"
  );
}

/**
 * Check whether a navigation URL matches the expected OAuth callback URI.
 * Uses proper URL component comparison — NOT string prefix matching.
 * @param {string} url - The actual navigation URL
 * @param {string} redirectUri - The expected redirect URI
 * @returns {boolean}
 */
function isOAuthCallback(url, redirectUri) {
  try {
    const parsed = new URL(url);
    const expected = new URL(redirectUri);
    return (
      parsed.protocol === expected.protocol &&
      parsed.hostname === expected.hostname &&
      parsed.port === expected.port &&
      parsed.pathname === expected.pathname
    );
  } catch {
    return false;
  }
}

/**
 * Check whether a URL is a valid djai:// OAuth deep-link callback.
 * @param {string} url
 * @returns {boolean}
 */
function isDjaiOAuthCallback(url) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'djai:' &&
      parsed.hostname === 'oauth' &&
      parsed.pathname === '/callback'
    );
  } catch {
    return false;
  }
}

/**
 * Check whether a URL uses an allowed protocol for opening externally.
 * Only http: and https: are permitted.
 * @param {string} url
 * @returns {boolean}
 */
function isAllowedExternalProtocol(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

module.exports = {
  isAllowedAIHost,
  isValidRedirectUri,
  isAllowedOAuthHost,
  isTTSResponseWithinLimit,
  isValidPlaybackAction,
  buildCSP,
  isOAuthCallback,
  isDjaiOAuthCallback,
  isAllowedExternalProtocol,
  AI_API_ALLOWLIST,
  ALLOWED_OAUTH_HOSTS,
  VALID_PLAYBACK_ACTIONS,
  TTS_MAX_SIZE,
};
