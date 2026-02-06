export {};

interface AiProxyResponse {
  ok: boolean;
  status: number;
  statusText: string;
  body: string | null;
}

interface AiProxyRequestOptions {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

interface ElectronBridge {
  ytMusic: {
    playUrl: (url: string) => Promise<void>;
    control: (action: string) => Promise<void>;
    getTrack: () => Promise<unknown>;
    show: () => Promise<void>;
    hide: () => Promise<void>;
    search: (query: string) => Promise<unknown>;
  };
  oauthDeepLink: {
    onCallback: (callback: (url: string) => void) => void;
    removeCallback: () => void;
  };
  openOAuthWindow: (options: unknown) => Promise<unknown>;
  aiProxy: {
    request: (options: AiProxyRequestOptions) => Promise<AiProxyResponse>;
  };
  safeStorage: {
    isAvailable: () => Promise<boolean>;
    encrypt: (plaintext: string) => Promise<string>;
    decrypt: (encrypted: string) => Promise<string>;
  };
  isElectron: true;
}

declare global {
  interface Window {
    electron?: ElectronBridge;
  }
}
