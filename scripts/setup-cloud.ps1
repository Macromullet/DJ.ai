#!/usr/bin/env pwsh
# DJ.ai Cloud Setup Tool
# Configures cloud secrets in Azure Key Vault

$ErrorActionPreference = 'Stop'

Write-Host "checking prerequisites..." -ForegroundColor Cyan

# Check az
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Error "Azure CLI (az) is not installed."
    exit 1
}

# Check az login
$account = az account show --query "user.name" -o tsv 2>$null
if (-not $account) {
    Write-Error "Not logged in to Azure. Run: az login"
    exit 1
}

# Check azd
if (-not (Get-Command azd -ErrorAction SilentlyContinue)) {
    Write-Error "Azure Developer CLI (azd) is not installed."
    exit 1
}

Write-Host "✓ Prerequisites met (logged in as $account)" -ForegroundColor Green
Write-Host ""

# Auto-detect Key Vault
Write-Host "Detecting Key Vault..." -ForegroundColor Cyan
$kvName = $null

# Try azd env first
if (Test-Path ".azure") {
    $envValues = azd env get-values 2>$null
    if ($envValues) {
        foreach ($line in $envValues) {
            if ($line -match 'AZURE_KEY_VAULT_NAME="?([^"]+)"?') {
                $kvName = $matches[1]
                break
            }
        }
    }
}

# Try az keyvault list as fallback
if (-not $kvName) {
    $kvName = az keyvault list --query "[0].name" -o tsv 2>$null
}

if ($kvName) {
    Write-Host "Found Key Vault: $kvName" -ForegroundColor Yellow
    $useDetected = Read-Host "Use this Key Vault? (Y/n)"
    if ($useDetected -match '^[Nn]') {
        $kvName = $null
    }
}

if (-not $kvName) {
    $kvName = Read-Host "Enter Key Vault name"
}

if (-not $kvName) {
    Write-Error "Key Vault name is required."
    exit 1
}

# Validate access
Write-Host "Verifying access to $kvName..." -ForegroundColor Cyan
try {
    $test = az keyvault secret list --vault-name $kvName --query "length(@)" 2>$null
    Write-Host "✓ Access confirmed" -ForegroundColor Green
} catch {
    Write-Error "Cannot access Key Vault '$kvName'. Ensure you have 'Key Vault Secrets Officer' role."
    exit 1
}

$secrets = @(
    @{ Name="GoogleClientId"; Description="Google OAuth Client ID"; Required=$true },
    @{ Name="GoogleClientSecret"; Description="Google OAuth Client Secret"; Required=$true },
    @{ Name="SpotifyClientId"; Description="Spotify OAuth Client ID"; Required=$true },
    @{ Name="SpotifyClientSecret"; Description="Spotify OAuth Client Secret"; Required=$true },
    @{ Name="AppleMusicTeamId"; Description="Apple Developer Team ID"; Required=$true },
    @{ Name="AppleMusicKeyId"; Description="Apple Music Key ID"; Required=$true },
    @{ Name="AppleMusicPrivateKey"; Description="Apple Music Private Key (PEM)"; Required=$true; IsMultiline=$true },
    @{ Name="OpenAiApiKey"; Description="OpenAI API Key (optional)"; Required=$false },
    @{ Name="AnthropicApiKey"; Description="Anthropic API Key (optional)"; Required=$false }
)

foreach ($secret in $secrets) {
    $name = $secret.Name
    $desc = $secret.Description
    $required = $secret.Required
    $isMultiline = $secret.IsMultiline

    Write-Host "Configuring $name..." -ForegroundColor Cyan
    Write-Host "  $desc" -ForegroundColor DarkGray

    # Check existing
    $currentVal = $null
    try {
        $currentVal = az keyvault secret show --vault-name $kvName --name $name --query "value" -o tsv 2>$null
    } catch {
        # Secret not found
    }

    if ($currentVal) {
        $maskedlen = [Math]::Min(4, $currentVal.Length)
        $masked = $currentVal.Substring(0, $maskedlen) + "****"
        Write-Host "  Current value: $masked" -ForegroundColor Yellow
        $keep = Read-Host "  Keep current value? (Y/n)"
        if ($keep -eq '' -or $keep -match '^[Yy]') {
            continue
        }
    }

    # Prompt
    $newValue = ""
    if ($isMultiline) {
        Write-Host "  Enter value (paste multiline content, end with blank line):" -ForegroundColor Cyan
        $lines = @()
        while ($true) {
            $line = Read-Host
            if ([string]::IsNullOrWhiteSpace($line)) { break }
            $lines += $line
        }
        if ($lines.Count -gt 0) { $newValue = $lines -join "`n" }
    } else {
        $newValue = Read-Host "  Enter value"
    }

    if ([string]::IsNullOrWhiteSpace($newValue)) {
        if ($required -and -not $currentVal) {
            Write-Warning "  $name is required but was skipped."
        }
        continue
    }

    # Set secret
    Write-Host "  Saving to Key Vault..." -ForegroundColor DarkGray
    az keyvault secret set --vault-name $kvName --name $name --value "$newValue" --output none
    Write-Host "  ✓ Saved" -ForegroundColor Green
}

# Configure allowed hosts
Write-Host "Configuring ALLOWED_REDIRECT_HOSTS..." -ForegroundColor Cyan
$newHosts = Read-Host "Enter allowed redirect hosts (comma-separated, e.g., https://dj-ai.azurewebsites.net)"
if (-not [string]::IsNullOrWhiteSpace($newHosts)) {
    azd env set ALLOWED_REDIRECT_HOSTS "$newHosts"
    Write-Host "  ✓ Updated ALLOWED_REDIRECT_HOSTS" -ForegroundColor Green
}

Write-Host ""
Write-Host "Setup complete! Run 'azd up' to deploy." -ForegroundColor Green
