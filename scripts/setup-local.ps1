#!/usr/bin/env pwsh
# DJ.ai Local Setup Tool
# Configures local dev secrets using dotnet user-secrets

$ErrorActionPreference = 'Stop'

Write-Host "checking prerequisites..." -ForegroundColor Cyan

# Check dotnet
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Error "dotnet CLI is not installed. Please install .NET 8 SDK."
    exit 1
}

# Check Aspire workload
$workloads = dotnet workload list
if ($workloads -notmatch "aspire") {
    Write-Error "Aspire workload is not installed. Run: dotnet workload install aspire"
    exit 1
}

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Error "Node.js is not installed. Please install Node.js."
    exit 1
}

# Check Docker
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker is not installed. Please install Docker Desktop."
    exit 1
}

Write-Host "✓ Prerequisites met" -ForegroundColor Green
Write-Host ""

$secrets = @(
    @{ Name="GoogleClientId"; Description="Google OAuth Client ID (from Google Cloud Console > APIs & Services > Credentials)"; Required=$true },
    @{ Name="GoogleClientSecret"; Description="Google OAuth Client Secret"; Required=$true },
    @{ Name="SpotifyClientId"; Description="Spotify OAuth Client ID (from developer.spotify.com/dashboard)"; Required=$true },
    @{ Name="SpotifyClientSecret"; Description="Spotify OAuth Client Secret"; Required=$true },
    @{ Name="AppleMusicTeamId"; Description="Apple Developer Team ID (from developer.apple.com/account)"; Required=$true },
    @{ Name="AppleMusicKeyId"; Description="Apple Music Key ID (from MusicKit key)"; Required=$true },
    @{ Name="AppleMusicPrivateKey"; Description="Apple Music Private Key (paste the full PEM content)"; Required=$true; IsMultiline=$true },
    @{ Name="OpenAiApiKey"; Description="OpenAI API Key (optional, for AI commentary)"; Required=$false },
    @{ Name="AnthropicApiKey"; Description="Anthropic API Key (optional, for AI commentary)"; Required=$false }
)

$configured = @()
$skipped = @()

foreach ($secret in $secrets) {
    $name = $secret.Name
    $desc = $secret.Description
    $required = $secret.Required
    $isMultiline = $secret.IsMultiline

    Write-Host "Configuring $name..." -ForegroundColor Cyan
    Write-Host "  $desc" -ForegroundColor DarkGray

    # Check if already set
    $allSecrets = dotnet user-secrets list --project DJai.AppHost
    $existingLine = $allSecrets | Select-String "^$name ="
    
    if ($existingLine) {
        $val = ($existingLine -split " = ", 2)[1].Trim()
        $maskedlen = [Math]::Min(4, $val.Length)
        $masked = $val.Substring(0, $maskedlen) + "****"
        Write-Host "  Current value: $masked" -ForegroundColor Yellow
        
        $keep = Read-Host "  Keep current value? (Y/n)"
        if ($keep -eq '' -or $keep -match '^[Yy]') {
            $configured += $name
            continue
        }
    }

    # Prompt for new value
    $newValue = ""
    if ($isMultiline) {
        Write-Host "  Enter value (paste multiline content, end with blank line):" -ForegroundColor Cyan
        $lines = @()
        while ($true) {
            $line = Read-Host
            if ([string]::IsNullOrWhiteSpace($line)) { break }
            $lines += $line
        }
        if ($lines.Count -gt 0) {
            $newValue = $lines -join "`n"
        }
    } else {
        $newValue = Read-Host "  Enter value"
    }

    if ([string]::IsNullOrWhiteSpace($newValue)) {
        if ($required -and -not $existingLine) {
            Write-Warning "  $name is required but was skipped."
            $skipped += $name
        } elseif ($existingLine) {
            # User chose to overwrite but provided empty string -> keep old value? or delete?
            # Assuming keep old value if empty entered on overwrite prompt, or maybe skip?
            # Let's assume skip means "don't change"
            Write-Host "  No value entered. Keeping existing." -ForegroundColor DarkGray
            $configured += $name
        } else {
            Write-Host "  Skipped (optional)" -ForegroundColor DarkGray
            $skipped += $name
        }
        continue
    }

    # Set secret
    dotnet user-secrets set "$name" "$newValue" --project DJai.AppHost | Out-Null
    $configured += $name
    Write-Host "  ✓ Saved" -ForegroundColor Green
    Write-Host ""
}

Write-Host "Setup Summary" -ForegroundColor Cyan
Write-Host "============="
foreach ($name in $configured) { Write-Host "✓ $name" -ForegroundColor Green }
foreach ($name in $skipped) { Write-Host "— $name" -ForegroundColor DarkGray }

Write-Host ""
Write-Host "Setup complete! Run .\start-dev.ps1 to start development." -ForegroundColor Green
