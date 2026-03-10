#!/usr/bin/env pwsh
# DJ.ai Cloud Setup Tool
# Configures cloud secrets in Azure Key Vault

param(
    [string]$ResourceGroup,
    [string]$KeyVaultName
)

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

Write-Host "✓ Prerequisites met (logged in as $account)" -ForegroundColor Green
Write-Host ""

# Auto-detect Key Vault
Write-Host "Detecting Key Vault..." -ForegroundColor Cyan
$kvName = $KeyVaultName

# Try resource group parameter
if (-not $kvName -and $ResourceGroup) {
    $kvName = az keyvault list --resource-group $ResourceGroup --query "[0].name" -o tsv 2>$null
}

# Try all accessible vaults as fallback
if (-not $kvName) {
    $kvName = az keyvault list --query "[?starts_with(name, 'kv-')].name" -o tsv 2>$null | Select-Object -First 1
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
Write-Host "  This is set as an app setting on the Function App via Bicep parameters." -ForegroundColor DarkGray
Write-Host "  Set it as a GitHub Actions variable (ALLOWED_REDIRECT_HOSTS) or pass it" -ForegroundColor DarkGray
Write-Host "  to deploy-infrastructure.ps1 via -AllowedRedirectHosts." -ForegroundColor DarkGray

Write-Host ""
Write-Host "Setup complete! Deploy with:" -ForegroundColor Green
Write-Host "  .\scripts\deploy-infrastructure.ps1 -Environment dev" -ForegroundColor Cyan
