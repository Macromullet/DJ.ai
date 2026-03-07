#!/usr/bin/env pwsh
# Create GitHub issues from CONTRIBUTING.md "Areas That Need Help"
# Run: gh auth login   (first time only)
# Then: .\scripts\create-issues.ps1

$ErrorActionPreference = "Stop"
$repo = "Macromullet/DJ.ai"

# Verify gh is authenticated
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "GitHub CLI not authenticated. Run: gh auth login"
    exit 1
}

Write-Host "Creating issues for DJ.ai..." -ForegroundColor Cyan

$issues = @(
    @{
        Title = "Add unit tests (Jest for React, xUnit for .NET)"
        Labels = "enhancement,testing,high-priority"
        Body = @"
## Description
Add comprehensive unit test coverage for both frontend and backend.

### Frontend (Jest + React Testing Library)
- Service tests: AICommentaryService, TTS services (OpenAI, Gemini, ElevenLabs, WebSpeech)
- Utility tests: secretStorage, validateApiKey, container DI
- Component tests: Settings, OnboardingWizard, VolumeControl
- Provider tests: MockMusicProvider tests

### Backend (xUnit)
- OAuth function tests: initiate, exchange, refresh for each provider
- Service tests: ISecretService, IDeviceAuthService, IStateStoreService
- Integration tests with mocked Key Vault

### Acceptance Criteria
- [ ] Frontend: >60% coverage on services/ and utils/
- [ ] Backend: >80% coverage on Functions/ and Services/
- [ ] CI pipeline runs tests on every push
"@
    },
    @{
        Title = "Add E2E tests with Playwright"
        Labels = "enhancement,testing,high-priority"
        Body = @"
## Description
Playwright is already configured but has zero test cases. Add end-to-end tests covering critical user flows.

### Test Cases Needed
- [ ] App launches and shows onboarding on first run
- [ ] Onboarding wizard completes successfully
- [ ] Settings modal opens/saves/closes
- [ ] Search returns results (mocked API)
- [ ] Playback controls work (play/pause/next/previous)
- [ ] TTS provider selection persists
- [ ] AI commentary displays in DJ commentary area
- [ ] Auto-DJ mode transitions between tracks
- [ ] OAuth connect/disconnect flow
- [ ] Volume control adjusts player volume
"@
    },
    @{
        Title = "GPU-accelerated audio visualizations (planned future feature)"
        Labels = "enhancement,high-priority"
        Body = @"
## Description
Add immersive, GPU-accelerated audio visualizations that react to the currently playing music. This is a planned future feature — no visualizer component or Three.js dependency currently exists in the project.

### Requirements
- [ ] WebGL-based renderer (library TBD — Three.js or similar)
- [ ] Audio frequency analysis via Web Audio API (AnalyserNode)
- [ ] Multiple visualization modes (waveform, spectrum bars, particle field)
- [ ] Fullscreen mode (existing fullscreen toggle should activate this)
- [ ] Smooth 60fps performance
- [ ] Respects prefers-reduced-motion (static fallback)

### Notes
- The visualizer library should be lazy-loaded to avoid bundle bloat
- Web Audio API learning material exists in learn/02-frontend/web-apis/web-audio-api.md
"@
    },
    @{
        Title = "Playlist management and persistence"
        Labels = "enhancement,medium-priority"
        Body = @"
## Description
Add the ability to create, save, load, and manage playlists that persist across sessions.

### Requirements
- [ ] Create/rename/delete playlists
- [ ] Add/remove/reorder tracks in playlist
- [ ] Persist playlists to localStorage or IndexedDB
- [ ] Import/export playlists (JSON format)
- [ ] Drag-and-drop reordering
- [ ] Queue management (up next)
"@
    },
    @{
        Title = "Improve error handling and user feedback"
        Labels = "enhancement,medium-priority"
        Body = @"
## Description
Replace console.warn/error calls with user-visible feedback.

### Areas to Improve
- [ ] AI commentary failures -> show fallback in UI
- [ ] TTS failures -> toast notification
- [ ] OAuth failures -> clear error with retry
- [ ] Network errors -> offline indicator
- [ ] API key validation -> inline in Settings
- [ ] Rate limiting -> inform user
"@
    },
    @{
        Title = "Desktop notifications for track changes"
        Labels = "enhancement,medium-priority"
        Body = @"
## Description
Show native desktop notifications when tracks change (useful when minimized).

### Requirements
- [ ] Notification on track change (title, artist, album art)
- [ ] Respect user toggle in Settings
- [ ] Use Electron Notification API
- [ ] Include action buttons (skip, pause)
"@
    },
    @{
        Title = "System tray integration"
        Labels = "enhancement,medium-priority"
        Body = @"
## Description
Add system tray icon with mini controls for background playback.

### Requirements
- [ ] Tray icon with context menu (Play/Pause, Next, Previous, Quit)
- [ ] Current track info on hover
- [ ] Minimize to tray option
- [ ] Media key support (hardware play/pause/next/previous keys)
"@
    },
    @{
        Title = "Keyboard shortcuts for playback and navigation"
        Labels = "enhancement,low-priority"
        Body = @"
## Description
Add keyboard shortcuts for common actions.

### Shortcuts
- [ ] Space: Play/Pause | Arrows: Next/Previous/Volume
- [ ] S: Settings | F: Fullscreen | M: Mute | /: Search
- [ ] Escape: Close modals
- [ ] Respect focus context (no triggers while typing)
"@
    },
    @{
        Title = "Custom themes and light mode"
        Labels = "enhancement,low-priority"
        Body = @"
## Description
Add theme support with light mode option.

### Requirements
- [ ] Light mode theme (design tokens already in place)
- [ ] Theme toggle in Settings
- [ ] Respect OS prefers-color-scheme
- [ ] WCAG AA contrast in both modes
"@
    },
    @{
        Title = "Improve auto-update experience"
        Labels = "enhancement,low-priority"
        Body = @"
## Description
Improve Electron auto-update flow.

### Requirements
- [ ] Check for updates on launch
- [ ] Background download with progress
- [ ] Non-intrusive restart prompt
- [ ] Release notes display
- [ ] Rollback on failure
"@
    }
)

$created = 0
foreach ($issue in $issues) {
    Write-Host "  Creating: $($issue.Title)..." -NoNewline
    $labelArgs = $issue.Labels -split "," | ForEach-Object { "--label"; $_.Trim() }
    gh issue create --repo $repo --title $issue.Title --body $issue.Body @labelArgs 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK" -ForegroundColor Green
        $created++
    } else {
        Write-Host " FAILED" -ForegroundColor Red
    }
}

Write-Host "`nCreated $created/$($issues.Count) issues." -ForegroundColor Cyan
