# Apple Music User Tokens

## Concept

A **Music User Token** grants access to a specific user's Apple Music account — their library, playlists, listening history, and personalized recommendations. It is obtained client-side through MusicKit JS after the user authenticates with their Apple ID.

This is the second piece of Apple Music's two-token model: the Developer Token identifies the app, the Music User Token identifies the user.

## How Authorization Works

### Flow

```
1. App loads MusicKit JS and configures with Developer Token
2. App calls musicKitInstance.authorize()
3. Apple's OAuth popup opens → user logs in with Apple ID
4. User grants access to their Apple Music subscription
5. MusicKit returns the Music User Token
6. Token stored locally for subsequent API requests
```

### Code

```javascript
// MusicKit must be configured first
const music = await MusicKit.configure({
  developerToken: 'eyJ...',
  app: { name: 'DJ.ai', build: '1.0.0' }
});

// Open Apple's authorization popup
const musicUserToken = await music.authorize();
// musicUserToken is now available for API calls
```

### Token Usage

The Music User Token is sent as a custom header on personal-data API calls:

```http
GET /v1/me/library/songs
Authorization: Bearer {developerToken}
Music-User-Token: {musicUserToken}
```

## How DJ.ai Handles User Tokens

In `electron-app/src/providers/AppleMusicProvider.ts`:

1. **`authenticate()`** — Calls `musicKitInstance.authorize()` which opens Apple's OAuth popup
2. **Token storage** — The Music User Token is stored in `localStorage` for persistence across sessions
3. **`appleMusicFetch()`** — Attaches both tokens to every request:
   ```typescript
   headers: {
     'Authorization': `Bearer ${this.developerToken}`,
     'Music-User-Token': this.musicUserToken
   }
   ```
4. **`signOut()`** — Calls `musicKitInstance.unauthorize()` and clears stored tokens

### Device Token Integration

DJ.ai also sends an `X-Device-Token` header to the OAuth proxy for rate limiting. This is separate from the Music User Token — it's DJ.ai's own device identification mechanism, not an Apple concept.

## Token Scope and Limitations

- **Subscription required** — The user must have an active Apple Music subscription
- **No granular scopes** — Unlike Spotify, Apple Music doesn't have fine-grained scope selection; authorization is all-or-nothing
- **Token expiry** — Music User Tokens expire, but MusicKit JS handles refresh transparently
- **Single user** — Each token is tied to one Apple ID
- **No offline access** — Tokens require network connectivity to validate

## Differences from Standard OAuth

| Aspect | Standard OAuth 2.0 | Apple MusicKit |
|--------|-------------------|----------------|
| Token exchange | Backend exchanges code for tokens | MusicKit JS handles internally |
| Refresh flow | App calls `/token` with refresh token | MusicKit auto-refreshes |
| Scope selection | Granular scopes in auth URL | All-or-nothing |
| Popup handling | Custom redirect URI | Apple-managed popup |

## Key Takeaways

- Music User Tokens are obtained entirely client-side via MusicKit JS — no backend involvement
- The backend only provides the Developer Token; user auth happens in the browser
- MusicKit handles token refresh transparently — no manual refresh logic needed
- Both tokens must be present for personal-data API calls

## DJ.ai Connection

The Music User Token enables DJ.ai's personalization features — recommendations, library browsing, and listening history. Because MusicKit JS manages the token lifecycle, `AppleMusicProvider.ts` doesn't need the complex refresh logic that `SpotifyProvider.ts` and `YouTubeMusicProvider.ts` implement. This simplicity is a key advantage of the MusicKit approach.

## Further Reading

- [User Authentication for MusicKit (Apple)](https://developer.apple.com/documentation/applemusicapi/user_authentication_for_musickit)
- [MusicKit JS — authorize()](https://developer.apple.com/documentation/musickitjs/musickit/musickitinstance/authorize())
- [Apple Music API — Personal Resources](https://developer.apple.com/documentation/applemusicapi/accessing_user_s_personal_music_data)
