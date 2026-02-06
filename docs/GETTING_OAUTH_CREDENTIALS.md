# Getting OAuth Credentials for Local Development

## Overview

For **local testing with real OAuth**, you need to get credentials from each provider. These are FREE for development/personal use.

**Important:**
- ✅ `local.settings.json` is in `.gitignore` (safe to put real secrets)
- ✅ Secrets stay on your machine only
- ✅ Azure production uses Key Vault (separate credentials)

---

## 1. Google OAuth (for YouTube Music)

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Select a project" → "New Project"
3. Name: `DJ.ai Local Dev` (or anything)
4. Click "Create"

### Step 2: Enable YouTube Data API

1. In your new project, go to "APIs & Services" → "Library"
2. Search for "YouTube Data API v3"
3. Click it → Click "Enable"

### Step 3: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure consent screen:
   - User Type: **External**
   - App name: `DJ.ai Local Dev`
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue" through all screens
4. Back to "Create OAuth client ID":
   - Application type: **Web application**
   - Name: `DJ.ai Local OAuth`
   - Authorized redirect URIs:
     - `http://localhost:5173/oauth/callback`
     - `http://localhost:5174/oauth/callback`
     - `http://localhost:5175/oauth/callback`
     - `http://localhost:5176/oauth/callback`
     - `http://localhost:5177/oauth/callback`
   - Click "Create"

### Step 4: Copy Credentials

You'll see:
- **Client ID**: Something like `123456789-abc...apps.googleusercontent.com`
- **Client Secret**: Something like `GOCSPX-abc123...`

**Save these!** You'll paste them into `local.settings.json`

---

## 2. Spotify OAuth

### Step 1: Create Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account (free account is fine)
3. Click "Create app"
4. Fill in:
   - App name: `DJ.ai Local Dev`
   - App description: `Local development testing`
   - Redirect URIs:
     - `http://localhost:5173/oauth/callback`
     - `http://localhost:5174/oauth/callback`
     - `http://localhost:5175/oauth/callback`
     - `http://localhost:5176/oauth/callback`
     - `http://localhost:5177/oauth/callback`
   - Check "Web API" and "Web Playback SDK"
   - Agree to terms
   - Click "Save"

### Step 2: Get Credentials

1. Click "Settings" on your new app
2. You'll see:
   - **Client ID**: 32-character string
   - Click "View client secret"
   - **Client Secret**: Another 32-character string

**Save these!**

---

## 3. Apple Music (Optional - More Complex)

### Requirements
- Apple Developer Account ($99/year) **OR**
- Skip Apple Music for now (Spotify + YouTube enough for testing)

### If You Want Apple Music:

1. Enroll in [Apple Developer Program](https://developer.apple.com/programs/)
2. Go to [Certificates, IDs & Profiles](https://developer.apple.com/account/resources/certificates/list)
3. Create a MusicKit Key:
   - Click "+" → "MusicKit"
   - Download the `.p8` file
   - Note your **Team ID** and **Key ID**

**For local dev, I recommend skipping Apple Music initially** - test with Spotify and YouTube first.

---

## 4. Configure local.settings.json

```bash
cd oauth-proxy

# Copy the example
cp local.settings.json.example local.settings.json

# Edit with your real credentials
notepad local.settings.json  # or vi, code, etc.
```

### Fill in your credentials:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "dotnet-isolated",
    "AZURE_FUNCTIONS_ENVIRONMENT": "Development",
    
    "GoogleClientId": "123456789-abc.apps.googleusercontent.com",
    "GoogleClientSecret": "GOCSPX-yourSecretHere",
    
    "SpotifyClientId": "your32charspotifyclientid",
    "SpotifyClientSecret": "your32charspotifyclientsecret",
    
    "AppleMusicTeamId": "YOURTEAMID",
    "AppleMusicKeyId": "YOURKEYID",
    "AppleMusicPrivateKey": "-----BEGIN PRIVATE KEY-----\nYourKeyContentHere\n-----END PRIVATE KEY-----"
  }
}
```

**Save the file.** Git will ignore it (it's in `.gitignore`).

---

## 5. Test It Works

```powershell
# Start with real OAuth
.\start-dev.ps1

# OR start manually:
cd oauth-proxy
func start --port 7071
```

**You should see:**
```
Functions:
  SpotifyOAuthInitiate: [POST] http://localhost:7071/api/oauth/spotify/initiate
  SpotifyOAuthExchange: [POST] http://localhost:7071/api/oauth/spotify/exchange
  YouTubeOAuthInitiate: [POST] http://localhost:7071/api/oauth/youtube/initiate
  ...
```

### Test OAuth Flow:

1. Open app: http://localhost:5173
2. Click "Connect to Spotify" (or YouTube)
3. Should redirect to real Spotify/Google login
4. After login, should redirect back to app
5. Should see "Connected" status

---

## Troubleshooting

### "Redirect URI mismatch"

**Spotify:**
- Go to app settings → Redirect URIs
- Make sure `http://localhost:5173/oauth/callback` is listed
- Click "Save"

**Google:**
- Go to Credentials → Your OAuth Client
- Edit → Authorized redirect URIs
- Add all localhost ports (5173-5177)

### "Invalid client"

- Double-check Client ID and Secret are copied correctly
- No extra spaces or newlines
- Restart Functions host after changing `local.settings.json`

### "CORS error"

- Check `host.json` has CORS for localhost
- Should already be configured from earlier commits

---

## Quick Testing Workflow

### For Quick UI Testing (No OAuth Needed):
```powershell
# Use stub mode
.\start-dev.ps1 -UseStubs

# Or use test mode (no backend needed)
# Open: http://localhost:5173?test=true
```

### For Real OAuth Testing:
```powershell
# Configure local.settings.json once (above)
.\start-dev.ps1

# Test Spotify or YouTube OAuth
```

---

## Production (Azure) vs Local

| Environment | Secrets Location | Setup |
|-------------|------------------|-------|
| **Local Dev** | `oauth-proxy/local.settings.json` | Copy from providers (this guide) |
| **Azure Production** | Azure Key Vault | Upload via `az keyvault secret set` |

**Same credentials work for both!** You can:
1. Use same credentials locally and in Azure (simple)
2. Or create separate OAuth apps for prod vs dev (recommended for real apps)

---

## Security Notes

✅ **Safe:**
- `local.settings.json` is gitignored
- Secrets stay on your machine
- OAuth redirect URIs restricted to localhost

⚠️ **Remember:**
- Don't commit `local.settings.json`
- Don't share screenshots with secrets visible
- Don't paste secrets in chat/Discord/etc.

✅ **If Leaked:**
- Revoke/regenerate in provider dashboard
- Create new OAuth client
- Update `local.settings.json`

---

## Summary

**Minimum for local testing:**
1. ✅ Get Google OAuth credentials (5 minutes)
2. ✅ Get Spotify OAuth credentials (5 minutes)
3. ✅ Paste into `local.settings.json`
4. ✅ Run `.\start-dev.ps1`
5. ✅ Test OAuth flows

**Total setup time:** ~15 minutes

**Then you can:**
- Test real Spotify playback
- Test real YouTube playback
- Verify OAuth security
- Build confidence before Azure deployment

Ready to get your credentials? Start with Spotify (easiest)!
