import { describe, it, expect } from 'vitest'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const validation = require('../validation.cjs')

// ---------------------------------------------------------------------------
// isAllowedAIHost
// ---------------------------------------------------------------------------
describe('isAllowedAIHost', () => {
  it('should allow api.openai.com', () => {
    expect(validation.isAllowedAIHost('https://api.openai.com/v1/chat/completions')).toBe(true)
  })

  it('should allow api.anthropic.com', () => {
    expect(validation.isAllowedAIHost('https://api.anthropic.com/v1/messages')).toBe(true)
  })

  it('should allow generativelanguage.googleapis.com', () => {
    expect(
      validation.isAllowedAIHost('https://generativelanguage.googleapis.com/v1beta/models'),
    ).toBe(true)
  })

  it('should allow api.elevenlabs.io', () => {
    expect(validation.isAllowedAIHost('https://api.elevenlabs.io/v1/text-to-speech')).toBe(true)
  })

  it('should reject unknown hosts', () => {
    expect(validation.isAllowedAIHost('https://evil.com/api')).toBe(false)
  })

  it('should reject localhost', () => {
    expect(validation.isAllowedAIHost('http://localhost:3000')).toBe(false)
  })

  it('should reject http (non-HTTPS)', () => {
    expect(validation.isAllowedAIHost('http://api.openai.com/v1/chat/completions')).toBe(false)
  })

  it('should handle invalid URLs gracefully', () => {
    expect(validation.isAllowedAIHost('not-a-url')).toBe(false)
    expect(validation.isAllowedAIHost('')).toBe(false)
  })

  // SSRF prevention — subdomain spoofing must not pass
  it('should reject api.openai.com.evil.com', () => {
    expect(validation.isAllowedAIHost('https://api.openai.com.evil.com/v1')).toBe(false)
  })

  it('should reject subdomains of allowed hosts', () => {
    expect(validation.isAllowedAIHost('https://x.api.openai.com/v1')).toBe(false)
  })

  // SSRF: path-based bypass — allowed host appears only in the path
  it('should reject path-based SSRF bypass (evil.com/api.openai.com)', () => {
    expect(validation.isAllowedAIHost('https://evil.com/api.openai.com')).toBe(false)
  })

  // SSRF: userinfo credential-smuggling bypass
  it('should reject userinfo bypass (user:pass@api.openai.com)', () => {
    expect(validation.isAllowedAIHost('https://user:pass@api.openai.com')).toBe(false)
  })

  // SSRF: encoded-dot domain confusion
  it('should reject encoded dot bypass (api.openai.com%2eevil.com)', () => {
    expect(validation.isAllowedAIHost('https://api.openai.com%2eevil.com')).toBe(false)
  })

  // SSRF: non-standard port — could target a different service on the same host
  it('should reject non-standard port (api.openai.com:8080)', () => {
    expect(validation.isAllowedAIHost('https://api.openai.com:8080')).toBe(false)
  })

  // Explicit port 443 should be normalized away by URL parser → allowed
  it('should allow explicit standard port 443', () => {
    expect(validation.isAllowedAIHost('https://api.openai.com:443/v1/chat')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// isValidRedirectUri
// ---------------------------------------------------------------------------
describe('isValidRedirectUri', () => {
  it('should accept valid http://localhost redirect', () => {
    expect(validation.isValidRedirectUri('http://localhost:5173/oauth/callback')).toBe(true)
  })

  it('should accept djai:// protocol redirect', () => {
    expect(validation.isValidRedirectUri('djai://oauth/callback')).toBe(true)
  })

  it('should accept djai:// with query params', () => {
    expect(validation.isValidRedirectUri('djai://oauth/callback?code=abc&state=xyz')).toBe(true)
  })

  it('should reject non-localhost http host', () => {
    expect(validation.isValidRedirectUri('http://example.com:5173/oauth/callback')).toBe(false)
  })

  it('should reject https localhost (only http allowed)', () => {
    expect(validation.isValidRedirectUri('https://localhost:5173/oauth/callback')).toBe(false)
  })

  it('should reject localhost.attacker.com bypass', () => {
    expect(
      validation.isValidRedirectUri('http://localhost.attacker.com:5173/oauth/callback'),
    ).toBe(false)
  })

  it('should reject djai:// with wrong path', () => {
    expect(validation.isValidRedirectUri('djai://evil/callback')).toBe(false)
  })

  it('should handle invalid URLs', () => {
    expect(validation.isValidRedirectUri('not-a-url')).toBe(false)
  })

  it('should handle empty / undefined input', () => {
    expect(validation.isValidRedirectUri('')).toBe(false)
    expect(validation.isValidRedirectUri(undefined)).toBe(false)
  })

  // Redirect URI attack: userinfo hijack — hostname resolves to evil.com
  it('should reject userinfo hijack (localhost:5173@evil.com)', () => {
    expect(
      validation.isValidRedirectUri('http://localhost:5173@evil.com/oauth/callback'),
    ).toBe(false)
  })

  // Redirect URI attack: path traversal — normalized path is /evil, not /oauth/callback
  it('should reject path traversal (../evil)', () => {
    expect(
      validation.isValidRedirectUri('http://localhost:5173/oauth/callback/../evil'),
    ).toBe(false)
  })

  // Redirect URI: query param injection — query params are separate from path, should pass
  it('should accept query param injection (still valid callback path)', () => {
    expect(
      validation.isValidRedirectUri('http://localhost:5173/oauth/callback?redirect=evil.com'),
    ).toBe(true)
  })

  // Redirect URI: fragment injection — fragments are client-side only, should pass
  it('should accept fragment injection (client-side only)', () => {
    expect(
      validation.isValidRedirectUri('http://localhost:5173/oauth/callback#evil'),
    ).toBe(true)
  })

  // djai:// protocol: prefix matching bypass — callback.evil ≠ callback
  it('should reject djai:// prefix bypass (callback.evil)', () => {
    expect(validation.isValidRedirectUri('djai://oauth/callback.evil')).toBe(false)
  })

  // djai:// protocol: path traversal — normalized path is /evil
  it('should reject djai:// path traversal (callback/../evil)', () => {
    expect(validation.isValidRedirectUri('djai://oauth/callback/../evil')).toBe(false)
  })

  // localhost without the required /oauth/callback path should fail
  it('should reject localhost without oauth callback path', () => {
    expect(validation.isValidRedirectUri('http://localhost:5173/')).toBe(false)
    expect(validation.isValidRedirectUri('http://localhost:5173/evil')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isAllowedOAuthHost
// ---------------------------------------------------------------------------
describe('isAllowedOAuthHost', () => {
  it('should NOT allow accounts.google.com (YouTube removed)', () => {
    expect(
      validation.isAllowedOAuthHost('https://accounts.google.com/o/oauth2/v2/auth'),
    ).toBe(false)
  })

  it('should allow accounts.spotify.com', () => {
    expect(validation.isAllowedOAuthHost('https://accounts.spotify.com/authorize')).toBe(true)
  })

  it('should allow appleid.apple.com', () => {
    expect(validation.isAllowedOAuthHost('https://appleid.apple.com/auth/authorize')).toBe(true)
  })

  it('should allow authorize.music.apple.com', () => {
    expect(
      validation.isAllowedOAuthHost('https://authorize.music.apple.com/woa'),
    ).toBe(true)
  })

  it('should reject http (non-HTTPS)', () => {
    expect(validation.isAllowedOAuthHost('http://accounts.spotify.com/authorize')).toBe(
      false,
    )
  })

  it('should reject unknown hosts', () => {
    expect(validation.isAllowedOAuthHost('https://evil-oauth.com/authorize')).toBe(false)
  })

  it('should reject subdomain spoofing (accounts.spotify.com.evil.com)', () => {
    expect(
      validation.isAllowedOAuthHost('https://accounts.spotify.com.evil.com/authorize'),
    ).toBe(false)
  })

  it('should handle invalid URLs', () => {
    expect(validation.isAllowedOAuthHost('')).toBe(false)
    expect(validation.isAllowedOAuthHost('not-a-url')).toBe(false)
  })

  // Userinfo credential-smuggling on OAuth host
  it('should reject userinfo bypass on OAuth host', () => {
    expect(
      validation.isAllowedOAuthHost('https://user:pass@accounts.spotify.com/authorize'),
    ).toBe(false)
  })

  // Non-standard port on OAuth host
  it('should reject non-standard port on OAuth host', () => {
    expect(
      validation.isAllowedOAuthHost('https://accounts.spotify.com:8443/authorize'),
    ).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isTTSResponseWithinLimit
// ---------------------------------------------------------------------------
describe('isTTSResponseWithinLimit', () => {
  it('should accept small responses', () => {
    expect(validation.isTTSResponseWithinLimit(1024)).toBe(true)
  })

  it('should accept 5 MB', () => {
    expect(validation.isTTSResponseWithinLimit(5 * 1024 * 1024)).toBe(true)
  })

  it('should accept exactly 10 MB', () => {
    expect(validation.isTTSResponseWithinLimit(10 * 1024 * 1024)).toBe(true)
  })

  it('should reject 10 MB + 1 byte', () => {
    expect(validation.isTTSResponseWithinLimit(10 * 1024 * 1024 + 1)).toBe(false)
  })

  it('should reject 100 MB', () => {
    expect(validation.isTTSResponseWithinLimit(100 * 1024 * 1024)).toBe(false)
  })

  it('should accept zero bytes', () => {
    expect(validation.isTTSResponseWithinLimit(0)).toBe(true)
  })

  // Edge case: negative values must be rejected (invalid content-length)
  it('should reject negative values', () => {
    expect(validation.isTTSResponseWithinLimit(-1)).toBe(false)
  })

  // Edge case: NaN is not a valid size
  it('should reject NaN', () => {
    expect(validation.isTTSResponseWithinLimit(NaN)).toBe(false)
  })

  // Edge case: Infinity is not a valid size
  it('should reject Infinity', () => {
    expect(validation.isTTSResponseWithinLimit(Infinity)).toBe(false)
  })

  // Edge case: Negative Infinity
  it('should reject negative Infinity', () => {
    expect(validation.isTTSResponseWithinLimit(-Infinity)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isValidPlaybackAction
// ---------------------------------------------------------------------------
describe('isValidPlaybackAction', () => {
  it.each(['play', 'pause', 'next', 'previous'])('should allow "%s"', (action) => {
    expect(validation.isValidPlaybackAction(action)).toBe(true)
  })

  it('should reject unknown actions', () => {
    expect(validation.isValidPlaybackAction('stop')).toBe(false)
    expect(validation.isValidPlaybackAction('rewind')).toBe(false)
    expect(validation.isValidPlaybackAction('')).toBe(false)
  })

  it('should reject injection attempts', () => {
    expect(validation.isValidPlaybackAction('play; rm -rf /')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// buildCSP
// ---------------------------------------------------------------------------
describe('buildCSP', () => {
  const csp = validation.buildCSP()

  it('should return a string', () => {
    expect(typeof csp).toBe('string')
  })

  it('should include default-src self', () => {
    expect(csp).toContain("default-src 'self'")
  })

  it('should include connect-src for AI API hosts', () => {
    expect(csp).toContain('https://api.openai.com')
    expect(csp).toContain('https://api.anthropic.com')
    expect(csp).toContain('https://generativelanguage.googleapis.com')
    expect(csp).toContain('https://api.elevenlabs.io')
  })

  it('should include connect-src for OAuth hosts', () => {
    expect(csp).toContain('https://accounts.spotify.com')
    expect(csp).toContain('https://api.music.apple.com')
    expect(csp).not.toContain('https://accounts.google.com')
  })

  it('should not include frame-src for YouTube (removed)', () => {
    expect(csp).not.toContain('youtube.com')
  })

  it('should include connect-src localhost wildcard', () => {
    expect(csp).toContain('http://localhost:*')
  })

  it('should include script-src for music SDKs', () => {
    expect(csp).toContain('https://sdk.scdn.co')
    expect(csp).toContain('https://js-cdn.music.apple.com')
  })

  // CSP security: unsafe-eval must NEVER appear (enables arbitrary code execution)
  it('should NOT contain unsafe-eval', () => {
    expect(csp).not.toContain('unsafe-eval')
  })

  // CSP security: no standalone wildcard * in script-src, connect-src, or frame-src
  it('should NOT contain standalone wildcard in dangerous directives', () => {
    // Parse each directive and check for standalone '*'
    const directives = csp.split(';').map((d) => d.trim()).filter(Boolean)
    const dangerousDirectives = directives.filter(
      (d) =>
        d.startsWith('script-src') ||
        d.startsWith('connect-src') ||
        d.startsWith('frame-src') ||
        d.startsWith('default-src'),
    )
    for (const directive of dangerousDirectives) {
      // A standalone * source is just the character * separated by spaces
      // This should NOT match host:* patterns like http://localhost:*
      const sources = directive.split(/\s+/).slice(1) // drop directive name
      const hasStandaloneWildcard = sources.some((s) => s === '*')
      expect(hasStandaloneWildcard).toBe(false)
    }
  })

  // CSP security: document that unsafe-inline IS present (required by third-party SDKs)
  // This is a known trade-off, not a bug — but we explicitly track it
  it('should contain unsafe-inline only in script-src and style-src', () => {
    const directives = csp.split(';').map((d) => d.trim()).filter(Boolean)
    const directivesWithUnsafeInline = directives.filter((d) => d.includes("'unsafe-inline'"))
    const directiveNames = directivesWithUnsafeInline.map((d) => d.split(/\s+/)[0])
    // unsafe-inline is accepted ONLY in script-src (music SDKs) and style-src
    expect(directiveNames).toEqual(expect.arrayContaining(['script-src', 'style-src']))
    expect(directiveNames).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// isOAuthCallback — proper URL-based callback matching
// ---------------------------------------------------------------------------
describe('isOAuthCallback', () => {
  const redirectUri = 'http://localhost:5173/oauth/callback'

  it('should match exact callback URL', () => {
    expect(validation.isOAuthCallback('http://localhost:5173/oauth/callback', redirectUri)).toBe(
      true,
    )
  })

  it('should match callback URL with query params (code, state)', () => {
    expect(
      validation.isOAuthCallback(
        'http://localhost:5173/oauth/callback?code=abc&state=xyz',
        redirectUri,
      ),
    ).toBe(true)
  })

  it('should match callback URL with fragment', () => {
    expect(
      validation.isOAuthCallback('http://localhost:5173/oauth/callback#token=abc', redirectUri),
    ).toBe(true)
  })

  // The startsWith bypass that this function replaces
  it('should reject prefix-matching bypass (callbackevil.com)', () => {
    expect(
      validation.isOAuthCallback(
        'http://localhost:5173/oauth/callbackevil.com?code=stolen',
        redirectUri,
      ),
    ).toBe(false)
  })

  it('should reject different port', () => {
    expect(
      validation.isOAuthCallback('http://localhost:9999/oauth/callback?code=abc', redirectUri),
    ).toBe(false)
  })

  it('should reject different hostname', () => {
    expect(
      validation.isOAuthCallback('http://evil.com:5173/oauth/callback?code=abc', redirectUri),
    ).toBe(false)
  })

  it('should reject different protocol', () => {
    expect(
      validation.isOAuthCallback('https://localhost:5173/oauth/callback?code=abc', redirectUri),
    ).toBe(false)
  })

  it('should reject path traversal', () => {
    expect(
      validation.isOAuthCallback(
        'http://localhost:5173/oauth/callback/../evil',
        redirectUri,
      ),
    ).toBe(false)
  })

  it('should handle invalid URLs gracefully', () => {
    expect(validation.isOAuthCallback('not-a-url', redirectUri)).toBe(false)
    expect(validation.isOAuthCallback('', redirectUri)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isDjaiOAuthCallback — deep-link protocol validation
// ---------------------------------------------------------------------------
describe('isDjaiOAuthCallback', () => {
  it('should match valid djai://oauth/callback', () => {
    expect(validation.isDjaiOAuthCallback('djai://oauth/callback')).toBe(true)
  })

  it('should match with query params', () => {
    expect(validation.isDjaiOAuthCallback('djai://oauth/callback?code=abc&state=xyz')).toBe(true)
  })

  // Prefix bypass: callback.evil has pathname /callback.evil, not /callback
  it('should reject prefix bypass (callback.evil)', () => {
    expect(validation.isDjaiOAuthCallback('djai://oauth/callback.evil')).toBe(false)
  })

  // Path traversal: normalized path is /evil
  it('should reject path traversal (callback/../evil)', () => {
    expect(validation.isDjaiOAuthCallback('djai://oauth/callback/../evil')).toBe(false)
  })

  it('should reject wrong host', () => {
    expect(validation.isDjaiOAuthCallback('djai://evil/callback')).toBe(false)
  })

  it('should reject wrong protocol', () => {
    expect(validation.isDjaiOAuthCallback('http://oauth/callback')).toBe(false)
  })

  it('should handle invalid URLs', () => {
    expect(validation.isDjaiOAuthCallback('')).toBe(false)
    expect(validation.isDjaiOAuthCallback('not-a-url')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// isAllowedExternalProtocol
// ---------------------------------------------------------------------------
describe('isAllowedExternalProtocol', () => {
  it('should allow http:', () => {
    expect(validation.isAllowedExternalProtocol('http://example.com')).toBe(true)
  })

  it('should allow https:', () => {
    expect(validation.isAllowedExternalProtocol('https://example.com')).toBe(true)
  })

  it('should reject file: protocol', () => {
    expect(validation.isAllowedExternalProtocol('file:///etc/passwd')).toBe(false)
  })

  it('should reject javascript: protocol', () => {
    expect(validation.isAllowedExternalProtocol('javascript:alert(1)')).toBe(false)
  })

  it('should reject data: protocol', () => {
    expect(validation.isAllowedExternalProtocol('data:text/html,<h1>evil</h1>')).toBe(false)
  })

  it('should reject custom protocols', () => {
    expect(validation.isAllowedExternalProtocol('djai://something')).toBe(false)
  })

  it('should handle invalid URLs', () => {
    expect(validation.isAllowedExternalProtocol('')).toBe(false)
    expect(validation.isAllowedExternalProtocol('not-a-url')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Exported constants smoke checks
// ---------------------------------------------------------------------------
describe('exported constants', () => {
  it('TTS_MAX_SIZE should be 10 MB', () => {
    expect(validation.TTS_MAX_SIZE).toBe(10 * 1024 * 1024)
  })

  it('AI_API_ALLOWLIST should have 4 entries', () => {
    expect(validation.AI_API_ALLOWLIST.size).toBe(4)
  })

  it('ALLOWED_OAUTH_HOSTS should have 3 entries', () => {
    expect(validation.ALLOWED_OAUTH_HOSTS.size).toBe(3)
  })
})
