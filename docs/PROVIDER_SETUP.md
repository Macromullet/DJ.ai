# DJ.ai Provider Setup Guide

Step-by-step instructions for obtaining all API credentials needed to run DJ.ai. This covers music streaming providers (Apple Music, Spotify) and AI services (OpenAI and others).

> **What you're setting up**: DJ.ai uses OAuth for music providers (secrets stored in Azure Key Vault) and API keys for AI services (stored encrypted on your local machine via Electron's safeStorage).

---

## Table of Contents

- [Quick Reference: All Credentials](#quick-reference-all-credentials)
- [Apple Music (Required)](#apple-music)
- [Spotify (Required)](#spotify)
- [OpenAI (Required for AI DJ)](#openai)
- [Optional AI Providers](#optional-ai-providers)
  - [Anthropic (Claude)](#anthropic-claude)
  - [Google Gemini](#google-gemini)
  - [ElevenLabs](#elevenlabs)
- [Configuring DJ.ai](#configuring-djai)
  - [Local Development](#local-development)
  - [Azure Key Vault (Staging/Production)](#azure-key-vault-stagingproduction)
  - [Frontend AI Keys (In-App Settings)](#frontend-ai-keys-in-app-settings)

---

## Quick Reference: All Credentials

| Credential | Where It Goes | Required? | How to Get |
|------------|--------------|-----------|------------|
| Apple Music Team ID | Backend (Key Vault) | ✅ Yes | [Apple Developer Portal](#step-1-apple-developer-account) |
| Apple Music Key ID | Backend (Key Vault) | ✅ Yes | [Apple Developer Portal](#step-3-create-a-private-key) |
| Apple Music Private Key (.p8) | Backend (Key Vault) | ✅ Yes | [Apple Developer Portal](#step-3-create-a-private-key) |
| Spotify Client ID | Backend (Key Vault) | ✅ Yes | [Spotify Developer Dashboard](#step-1-spotify-developer-account) |
| Spotify Client Secret | Backend (Key Vault) | ✅ Yes | [Spotify Developer Dashboard](#step-2-create-an-app) |
| OpenAI API Key | Frontend (Settings UI) | ✅ For AI DJ | [OpenAI Platform](#openai) |
| Anthropic API Key | Frontend (Settings UI) | ❌ Optional | [Anthropic Console](#anthropic-claude) |
| Gemini API Key | Frontend (Settings UI) | ❌ Optional | [Google AI Studio](#google-gemini) |
| ElevenLabs API Key | Frontend (Settings UI) | ❌ Optional | [ElevenLabs Dashboard](#elevenlabs) |

---

## Apple Music

Apple Music requires three credentials: your **Team ID**, a **Key ID**, and a **Private Key** (.p8 file). These are used by the backend to sign JWT developer tokens (ES256 algorithm) that authenticate with the Apple Music API.

### Prerequisites

- An [Apple Developer Program](https://developer.apple.com/programs/) membership ($99/year)
- An Apple Music subscription on the account you'll test with

### Step 1: Apple Developer Account

1. Go to [developer.apple.com](https://developer.apple.com) and sign in
2. If you're not enrolled, click **Account** → **Join the Apple Developer Program** → follow the enrollment steps ($99/year)
3. Once enrolled, go to [developer.apple.com/account](https://developer.apple.com/account)

### Step 2: Find Your Team ID

1. Go to [developer.apple.com/account](https://developer.apple.com/account)
2. Scroll down to the **Membership details** section (or click **Membership** in the sidebar)
3. Your **Team ID** is a 10-character alphanumeric string (e.g., `A1B2C3D4E5`)
4. Copy this — you'll need it as `AppleMusicTeamId`

### Step 3: Create a Media Identifier

1. Go to **Certificates, Identifiers & Profiles** → [Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. Click the **+** button to register a new identifier
3. Select **Media IDs** and click **Continue**
4. Fill in:
   - **Description**: `DJ.ai` (or any name you like)
   - **Identifier**: `com.yourname.djai` (reverse-domain style)
5. Check **MusicKit** under services
6. Click **Continue** → **Register**

### Step 4: Create a Private Key

1. Go to **Certificates, Identifiers & Profiles** → [Keys](https://developer.apple.com/account/resources/authkeys/list)
2. Click the **+** button to create a new key
3. Enter a **Key Name**: `DJ.ai MusicKit Key`
4. Check **Media Services (MusicKit)**
5. Click **Configure** next to Media Services — select the Media ID you created in Step 3
6. Click **Continue** → **Register**
7. **Download the .p8 file immediately** — you can only download it once!
8. Note the **Key ID** displayed on the confirmation page (10-character string, e.g., `F5G6H7J8K9`)

### Step 5: Read the Private Key

The `.p8` file contains your private key in PEM format. You need the full contents including the header/footer lines:

```
-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBGwwagIBAQQg...
(your key content here — typically 3-4 lines of base64)
...
-----END PRIVATE KEY-----
```

Open the file in any text editor and copy the entire contents.

### Apple Music Credentials Summary

| Credential | Example | DJ.ai Secret Name |
|-----------|---------|-------------------|
| Team ID | `A1B2C3D4E5` | `AppleMusicTeamId` |
| Key ID | `F5G6H7J8K9` | `AppleMusicKeyId` |
| Private Key | `-----BEGIN PRIVATE KEY-----\n...` | `AppleMusicPrivateKey` |

> **How DJ.ai uses these**: The backend signs a JWT with your private key (ES256 algorithm). The JWT has `iss` = Team ID, `kid` = Key ID, and expires in 6 months. This developer token authenticates all Apple Music API calls. The user also authorizes via MusicKit JS in the browser to get a Music User Token for accessing their library.

### Official Docs

- [Create a media identifier and private key](https://developer.apple.com/help/account/capabilities/create-a-media-identifier-and-private-key)
- [Generating developer tokens](https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens)
- [MusicKit overview](https://developer.apple.com/musickit/)

---

## Spotify

Spotify requires a **Client ID** and **Client Secret** from a Spotify Developer app. These are used by the backend for OAuth token exchange (Authorization Code flow).

### Prerequisites

- A [Spotify account](https://www.spotify.com/signup) (free or Premium — Premium required for full playback via Web Playback SDK)

### Step 1: Spotify Developer Account

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. If prompted, accept the Developer Terms of Service

### Step 2: Create an App

1. Click **Create app**
2. Fill in the form:
   - **App name**: `DJ.ai`
   - **App description**: `AI-powered music DJ`
   - **Website**: (optional — leave blank or enter your GitHub repo URL)
   - **Redirect URIs**: Add these three:
     ```
     http://localhost:5173/oauth/callback
     http://localhost:5174/oauth/callback
     djai://oauth/callback
     ```
     The first two are for local development (Vite dev server ports). The third is for the packaged Electron app.
   - **APIs used**: Check **Web API** and **Web Playback SDK**
3. Check the Terms of Service box
4. Click **Save**

### Step 3: Get Your Credentials

1. You'll land on your app's overview page
2. Your **Client ID** is displayed directly on the page
3. Click **Settings** → find **Client Secret** → click **View client secret**
4. Copy both values

### Step 4: Verify Redirect URIs

1. In your app's **Settings**, scroll to **Redirect URIs**
2. Confirm all three URIs are listed:
   - `http://localhost:5173/oauth/callback`
   - `http://localhost:5174/oauth/callback`
   - `djai://oauth/callback`
3. If deploying to production, add your production callback URL as well

### Spotify Credentials Summary

| Credential | Example | DJ.ai Secret Name |
|-----------|---------|-------------------|
| Client ID | `1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d` | `SpotifyClientId` |
| Client Secret | `a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6` | `SpotifyClientSecret` |

> **How DJ.ai uses these**: The backend builds an authorization URL with your Client ID. After the user logs in and approves, Spotify redirects back with an auth code. The backend exchanges this code for access/refresh tokens using Basic auth with your Client ID and Client Secret. The client then uses these tokens directly against the Spotify Web API.

> **Scopes requested**: `user-read-private`, `user-read-email`, `user-library-read`, `user-top-read`, `playlist-read-private`, `playlist-read-collaborative`, `streaming`, `user-read-playback-state`, `user-modify-playback-state`, `user-read-currently-playing`

### Official Docs

- [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
- [App registration guide](https://developer.spotify.com/documentation/web-api/concepts/apps)
- [Authorization Code flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)

---

## OpenAI

OpenAI provides the AI commentary engine (the "DJ brain") and one of the TTS voice options. You need an **API key** from the OpenAI platform.

### Prerequisites

- An [OpenAI account](https://platform.openai.com/signup)
- A payment method on file (API usage is pay-as-you-go; new accounts may get a small free credit)

### Step 1: Create an Account

1. Go to [platform.openai.com](https://platform.openai.com)
2. Click **Sign up** (or **Log in** if you already have an account)
3. You can use email, Google, Microsoft, or Apple to sign in

> **Note**: ChatGPT and the API platform share the same login, but billing is separate. A ChatGPT Plus subscription does NOT include API credits.

### Step 2: Set Up Billing

1. Click your profile icon (top-right) → **Settings**
2. Go to **Billing** in the sidebar
3. Click **Add payment method** and enter a credit card
4. Set a **monthly spending limit** (recommended: start with $10-20 for development)

### Step 3: Generate an API Key

1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click **Create new secret key**
3. Give it a name: `DJ.ai`
4. Optionally assign it to a project (or leave as default)
5. Click **Create secret key**
6. **Copy the key immediately** — it starts with `sk-` and you won't be able to see it again

### Step 4: Verify It Works

You can test your key with a simple curl command:

```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-your-key-here"
```

If you get a JSON list of models, your key is working.

### OpenAI Credentials Summary

| Credential | Example | Where to Enter |
|-----------|---------|----------------|
| API Key | `sk-proj-abc123...` | DJ.ai Settings → AI Commentary → OpenAI API Key |

> **How DJ.ai uses this**: The OpenAI key powers two features: (1) AI DJ commentary generation via GPT chat completions, and (2) text-to-speech via the `/v1/audio/speech` endpoint. The key is stored encrypted on your machine via Electron's safeStorage — it never touches the backend server.

> **Cost estimate**: Typical usage is ~$0.01-0.05 per DJ commentary + TTS generation. Light daily use should cost well under $5/month.

### Official Docs

- [OpenAI API quickstart](https://platform.openai.com/docs/quickstart)
- [API key management](https://platform.openai.com/api-keys)
- [Pricing](https://openai.com/pricing)

---

## Optional AI Providers

These providers are alternatives or supplements to OpenAI. Configure them in the DJ.ai Settings UI if you want to use them.

### Anthropic (Claude)

Claude can be used as an alternative AI commentary engine.

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Go to **API Keys** in the sidebar
4. Click **Create Key** → name it `DJ.ai`
5. Copy the key (starts with `sk-ant-`)
6. Add a payment method under **Billing** (pay-as-you-go)

| Credential | Example | Where to Enter |
|-----------|---------|----------------|
| API Key | `sk-ant-api03-abc123...` | DJ.ai Settings → AI Commentary → Anthropic API Key |

### Google Gemini

Gemini can be used for TTS (text-to-speech) voice generation.

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click **Create API Key**
4. Select a Google Cloud project (or create one)
5. Copy the generated key

| Credential | Example | Where to Enter |
|-----------|---------|----------------|
| API Key | `AIzaSy...` | DJ.ai Settings → TTS → Gemini API Key |

> **Note**: Gemini API has a generous free tier. You may not need to set up billing for light usage.

### ElevenLabs

ElevenLabs provides premium AI voices for TTS.

1. Go to [elevenlabs.io](https://elevenlabs.io/) and sign up
2. Click your profile icon → **Profile + API key**
3. Copy your API key from the profile page

| Credential | Example | Where to Enter |
|-----------|---------|----------------|
| API Key | `xi-abc123...` | DJ.ai Settings → TTS → ElevenLabs API Key |

> **Note**: ElevenLabs has a free tier with limited characters per month. Paid plans start at $5/month.

---

## Configuring DJ.ai

Now that you have your credentials, here's how to plug them in.

### Local Development

For local development, secrets are stored via .NET user-secrets (injected automatically by Aspire).

**Option A: Interactive setup script**

```powershell
cd C:\Users\bphilpott\src\DJ.ai
.\setup.ps1 --local
```

This walks you through each secret interactively. It will prompt for:
- `SpotifyClientId` — paste your Spotify Client ID
- `SpotifyClientSecret` — paste your Spotify Client Secret
- `AppleMusicTeamId` — paste your 10-char Team ID
- `AppleMusicKeyId` — paste your 10-char Key ID
- `AppleMusicPrivateKey` — paste the entire .p8 file contents (multiline)

**Option B: Manual user-secrets**

```powershell
cd oauth-proxy
dotnet user-secrets set "SpotifyClientId" "your-spotify-client-id"
dotnet user-secrets set "SpotifyClientSecret" "your-spotify-client-secret"
dotnet user-secrets set "AppleMusicTeamId" "your-team-id"
dotnet user-secrets set "AppleMusicKeyId" "your-key-id"
dotnet user-secrets set "AppleMusicPrivateKey" "-----BEGIN PRIVATE KEY-----
your-key-content
-----END PRIVATE KEY-----"
```

**Then start the app:**

```powershell
cd DJai.AppHost
dotnet run
```

Aspire injects user-secrets into the oauth-proxy automatically. The Aspire Dashboard opens at `https://localhost:15888`.

### Azure Key Vault (Staging/Production)

For deployed environments, secrets live in Azure Key Vault.

> **⚠️ Network access**: If your Key Vault has `publicNetworkAccess: Disabled` (staging/prod with network isolation), you'll need to either:
> - Temporarily allow your IP in the Key Vault firewall (Azure Portal → Key Vault → Networking)
> - Use the Azure Portal UI to set secrets directly
> - Access via a VPN/jumpbox connected to the VNet

**Option A: Setup script**

```powershell
.\scripts\setup-cloud.ps1 -ResourceGroup rg-djai-staging
```

This auto-discovers the Key Vault in the resource group and prompts for each secret.

**Option B: Azure CLI**

```powershell
# Find your Key Vault name
az keyvault list --resource-group rg-djai-staging --query "[0].name" -o tsv

# Set each secret
az keyvault secret set --vault-name "your-kv-name" --name "SpotifyClientId" --value "your-value"
az keyvault secret set --vault-name "your-kv-name" --name "SpotifyClientSecret" --value "your-value"
az keyvault secret set --vault-name "your-kv-name" --name "AppleMusicTeamId" --value "your-value"
az keyvault secret set --vault-name "your-kv-name" --name "AppleMusicKeyId" --value "your-value"
az keyvault secret set --vault-name "your-kv-name" --name "AppleMusicPrivateKey" --value "$(cat path/to/AuthKey_XXXXXXXXXX.p8)"
```

**Option C: Azure Portal**

1. Go to [portal.azure.com](https://portal.azure.com)
2. Navigate to your Key Vault resource
3. Click **Secrets** in the sidebar
4. Click **+ Generate/Import** for each secret
5. Enter the name and value, then click **Create**

**Verify the health endpoint after setting secrets:**

```bash
curl https://your-function-app.azurewebsites.net/api/health
```

Expected response when everything is configured:
```json
{
  "status": "healthy",
  "keyVault": "connected",
  "appleMusicKey": "valid",
  "timestamp": "2026-03-11T12:00:00Z"
}
```

### Frontend AI Keys (In-App Settings)

AI service keys (OpenAI, Anthropic, Gemini, ElevenLabs) are entered directly in the DJ.ai Settings UI. They are **not** stored in Key Vault — they're encrypted locally on your machine.

1. Launch DJ.ai (via Aspire or Electron)
2. Click the **⚙️ Settings** gear icon
3. Scroll to the **AI Commentary** section
4. Paste your OpenAI API key (and optionally Anthropic)
5. Scroll to the **Text-to-Speech** section
6. Optionally add Gemini and/or ElevenLabs keys
7. Click **Save**

The keys are encrypted via Electron's `safeStorage` API (backed by the OS keychain) and stored in `<userData>/api-keys.enc`. The renderer process never sees plaintext keys — they're injected as auth headers by the main process when making API calls.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Health check returns `"keyVault": "unavailable"` | Secrets not set in Key Vault | Run `setup-cloud.ps1` or set secrets via Portal |
| Health check returns `"appleMusicKey": "invalid"` | Wrong key format | Ensure the full PEM is stored including `-----BEGIN/END-----` lines |
| Spotify "Connect" button does nothing | Missing Spotify credentials in backend | Set `SpotifyClientId` and `SpotifyClientSecret` |
| Spotify OAuth error "INVALID_CLIENT" | Redirect URI mismatch | Add `http://localhost:5173/oauth/callback` to Spotify app settings |
| OpenAI commentary fails silently | Invalid or expired API key | Check key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| "Key Vault access denied" in logs | MI not assigned KV Secrets User role | Check RBAC in Azure Portal → Key Vault → Access control (IAM) |
| Can't set KV secrets via CLI | Network isolation blocking public access | Temporarily allow your IP or use Azure Portal |
