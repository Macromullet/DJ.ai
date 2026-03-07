/**
 * Secret Storage Utility
 *
 * API keys are managed by the Electron main process. The renderer NEVER
 * receives plaintext keys. This module provides a thin IPC wrapper:
 *   - saveApiKeys: sends new keys to main for encrypted storage
 *   - getApiKeyStatus: returns which keys are configured (boolean map)
 *   - clearApiKeys: wipes all stored keys
 *
 * In browser dev mode (no Electron), falls back to plaintext localStorage.
 */

const PLAIN_KEY = 'djai_secrets_plain';

export interface ApiKeys {
  openaiApiKey: string;
  anthropicApiKey: string;
  elevenLabsApiKey: string;
  geminiApiKey: string;
}

export interface ApiKeyStatus {
  openaiApiKey: boolean;
  anthropicApiKey: boolean;
  elevenLabsApiKey: boolean;
  geminiApiKey: boolean;
}

const DEFAULT_STATUS: ApiKeyStatus = {
  openaiApiKey: false,
  anthropicApiKey: false,
  elevenLabsApiKey: false,
  geminiApiKey: false,
};

const DEFAULT_KEYS: ApiKeys = {
  openaiApiKey: '',
  anthropicApiKey: '',
  elevenLabsApiKey: '',
  geminiApiKey: '',
};

function isElectronAvailable(): boolean {
  return !!(window as any).electron?.apiKeys;
}

/**
 * Returns true when running in browser dev mode (e.g., http://localhost).
 */
function isBrowserDevMode(): boolean {
  return window.location.protocol.startsWith('http');
}

/**
 * Save API keys. In Electron, keys are sent to the main process which
 * encrypts and stores them — they never come back to the renderer.
 * In browser dev mode, falls back to plaintext localStorage.
 */
export async function saveApiKeys(keys: Record<string, string>): Promise<void> {
  if (isElectronAvailable()) {
    await (window as any).electron.apiKeys.save(keys);
    // Clean up any legacy plaintext storage from earlier versions
    localStorage.removeItem(PLAIN_KEY);
    localStorage.removeItem('djai_secrets');
    localStorage.removeItem('djai_secrets_encrypted');
  } else if (isBrowserDevMode()) {
    console.warn('Electron not available — storing keys unencrypted (dev mode only)');
    // Read-merge-write: preserve existing keys not in this update
    const existing = JSON.parse(localStorage.getItem(PLAIN_KEY) || '{}');
    const merged = { ...existing };
    for (const [k, v] of Object.entries(keys)) {
      if (v === '') {
        delete merged[k];
      } else {
        merged[k] = v;
      }
    }
    localStorage.setItem(PLAIN_KEY, JSON.stringify(merged));
  } else {
    throw new Error('Cannot save API keys: Electron API not available in packaged mode.');
  }
}

/**
 * Get the status of configured API keys (which keys are set).
 * Returns boolean flags — NEVER plaintext keys.
 */
export async function getApiKeyStatus(): Promise<ApiKeyStatus> {
  try {
    if (isElectronAvailable()) {
      return await (window as any).electron.apiKeys.getStatus();
    } else if (isBrowserDevMode()) {
      const plain = localStorage.getItem(PLAIN_KEY) || localStorage.getItem('djai_secrets');
      if (!plain) return { ...DEFAULT_STATUS };
      const parsed = JSON.parse(plain);
      return {
        openaiApiKey: !!parsed.openaiApiKey,
        anthropicApiKey: !!parsed.anthropicApiKey,
        elevenLabsApiKey: !!parsed.elevenLabsApiKey,
        geminiApiKey: !!parsed.geminiApiKey,
      };
    }
    return { ...DEFAULT_STATUS };
  } catch (error) {
    console.error('Failed to get API key status:', error);
    return { ...DEFAULT_STATUS };
  }
}

/**
 * Legacy compatibility: returns placeholder keys based on status.
 * Services use these for truthiness checks only — real keys are injected
 * by the main process at the HTTP request level.
 */
export async function getApiKeys(): Promise<ApiKeys> {
  try {
    if (isElectronAvailable()) {
      const status = await getApiKeyStatus();
      return {
        openaiApiKey: status.openaiApiKey ? 'configured' : '',
        anthropicApiKey: status.anthropicApiKey ? 'configured' : '',
        elevenLabsApiKey: status.elevenLabsApiKey ? 'configured' : '',
        geminiApiKey: status.geminiApiKey ? 'configured' : '',
      };
    } else if (isBrowserDevMode()) {
      // In browser dev mode, return actual keys (needed for direct fetch)
      const plain = localStorage.getItem(PLAIN_KEY) || localStorage.getItem('djai_secrets');
      return plain ? { ...DEFAULT_KEYS, ...JSON.parse(plain) } : { ...DEFAULT_KEYS };
    }
    return { ...DEFAULT_KEYS };
  } catch (error) {
    console.error('Failed to load API keys:', error);
    return { ...DEFAULT_KEYS };
  }
}

export async function clearApiKeys(): Promise<void> {
  if (isElectronAvailable()) {
    await (window as any).electron.apiKeys.clear();
  }
  localStorage.removeItem(PLAIN_KEY);
  localStorage.removeItem('djai_secrets');
  localStorage.removeItem('djai_secrets_encrypted');
}
