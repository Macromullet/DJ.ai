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

interface CopilotChatOptions {
  systemPrompt: string;
  userPrompt: string;
}

interface CopilotChatResponse {
  ok: boolean;
  text?: string;
  error?: string;
}

interface ElectronBridge {
  oauthDeepLink: {
    onCallback: (callback: (url: string) => void) => void;
    removeCallback: () => void;
  };
  openOAuthWindow: (options: unknown) => Promise<unknown>;
  aiProxy: {
    request: (options: AiProxyRequestOptions) => Promise<AiProxyResponse>;
    ttsRequest: (options: AiProxyRequestOptions) => Promise<AiProxyResponse>;
  };
  copilot: {
    chat: (options: CopilotChatOptions) => Promise<CopilotChatResponse>;
  };
  safeStorage: {
    isAvailable: () => Promise<boolean>;
    encrypt: (plaintext: string) => Promise<string>;
    decrypt: (encrypted: string) => Promise<string>;
  };
  notifications: {
    show: (options: { title: string; body: string; icon?: string }) => Promise<boolean>;
  };
  tray: {
    updateInfo: (info: { title: string; artist: string; isPlaying: boolean }) => Promise<boolean>;
    onPlaybackToggle: (callback: () => void) => () => void;
    onNextTrack: (callback: () => void) => () => void;
    onPreviousTrack: (callback: () => void) => () => void;
  };
  isElectron: true;
}

declare global {
  interface Window {
    electron?: ElectronBridge;
  }
}
