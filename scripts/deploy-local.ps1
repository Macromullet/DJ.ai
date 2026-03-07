<#
.SYNOPSIS
    Deploy DJ.ai infrastructure from your local machine (no GitHub Actions needed).

.DESCRIPTION
    Validates Bicep templates, then provisions and/or deploys to a target environment
    using your local Azure CLI credentials. Much faster iteration than CI/CD.

.PARAMETER Environment
    Target environment name (default: 'dev'). Creates resource group 'rg-<env>'.

.PARAMETER Location
    Azure region (default: 'eastus2').

.PARAMETER SkipProvision
    Skip infrastructure provisioning (only redeploy the app code).

.PARAMETER ValidateOnly
    Only validate Bicep templates — don't deploy anything.

.PARAMETER AllowedRedirectHosts
    Comma-separated redirect hosts (default: 'localhost:5173,localhost:5174').

.EXAMPLE
    .\scripts\deploy-local.ps1                          # Full deploy to 'dev'
    .\scripts\deploy-local.ps1 -ValidateOnly            # Just validate Bicep
    .\scripts\deploy-local.ps1 -Environment staging      # Deploy to staging
    .\scripts\deploy-local.ps1 -SkipProvision            # Redeploy app only
#>

param(
    [string]$Environment = 'dev',
    [string]$Location = 'eastus2',
    [switch]$SkipProvision,
    [switch]$ValidateOnly,
    [string]$AllowedRedirectHosts = 'localhost:5173,localhost:5174'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

Write-Host "`n=== DJ.ai Local Deploy ===" -ForegroundColor Cyan
Write-Host "Environment: $Environment"
Write-Host "Location:    $Location"
Write-Host ""

# --- Pre-flight checks ---
Write-Host "[1/5] Pre-flight checks..." -ForegroundColor Yellow

# Check az CLI
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Error "Azure CLI (az) not found. Install from https://aka.ms/installazurecli"
}

# Check azd
if (-not (Get-Command azd -ErrorAction SilentlyContinue)) {
    Write-Error "Azure Developer CLI (azd) not found. Install from https://aka.ms/azure-dev/install"
}

# Check logged in
$account = az account show 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Not logged into Azure CLI. Run: az login"
}
$accountInfo = $account | ConvertFrom-Json
Write-Host "  Subscription: $($accountInfo.name) ($($accountInfo.id))" -ForegroundColor Gray
Write-Host "  Tenant:       $($accountInfo.tenantId)" -ForegroundColor Gray

# --- Validate Bicep ---
Write-Host "`n[2/5] Validating Bicep templates..." -ForegroundColor Yellow

$bicepFiles = Get-ChildItem -Path "$root\infra" -Recurse -Filter '*.bicep'
$hasErrors = $false

foreach ($file in $bicepFiles) {
    $result = az bicep build --file $file.FullName 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  FAIL: $($file.Name)" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        $hasErrors = $true
    } else {
        Write-Host "  OK:   $($file.Name)" -ForegroundColor Green
    }
}

if ($hasErrors) {
    Write-Error "Bicep validation failed. Fix errors above before deploying."
}

if ($ValidateOnly) {
    Write-Host "`nAll Bicep templates valid!" -ForegroundColor Green
    exit 0
}

# --- Initialize azd environment ---
Write-Host "`n[3/5] Setting up azd environment '$Environment'..." -ForegroundColor Yellow

Push-Location $root
try {
    azd auth login 2>$null
    azd env new $Environment --no-prompt 2>$null
    azd env set AZURE_LOCATION $Location
    azd env set ALLOWED_REDIRECT_HOSTS $AllowedRedirectHosts
    azd env set AZURE_SUBSCRIPTION_ID $accountInfo.id

    if (-not $SkipProvision) {
        # --- Provision infrastructure ---
        Write-Host "`n[4/5] Provisioning infrastructure..." -ForegroundColor Yellow
        azd provision --no-prompt
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Provisioning failed. Check errors above."
        }
        Write-Host "  Infrastructure provisioned!" -ForegroundColor Green
    } else {
        Write-Host "`n[4/5] Skipping provisioning (--SkipProvision)" -ForegroundColor Gray
    }

    # --- Deploy application ---
    Write-Host "`n[5/5] Deploying application..." -ForegroundColor Yellow
    azd deploy --no-prompt
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Deployment failed. Check errors above."
    }

    # --- Output results ---
    Write-Host "`n=== Deployment Complete ===" -ForegroundColor Green
    Write-Host "Environment: $Environment"
    
    $envValues = azd env get-values 2>$null
    if ($envValues) {
        $funcUrl = ($envValues | Select-String 'AZURE_FUNCTION_APP_URL="([^"]*)"').Matches.Groups[1].Value
        $kvName = ($envValues | Select-String 'AZURE_KEY_VAULT_NAME="([^"]*)"').Matches.Groups[1].Value
        if ($funcUrl) { Write-Host "Function App:  $funcUrl" -ForegroundColor Cyan }
        if ($kvName) { Write-Host "Key Vault:     $kvName" -ForegroundColor Cyan }
    }

    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "  1. Add OAuth secrets to Key Vault: .\setup.ps1 --cloud"
    Write-Host "  2. Test endpoint: curl $funcUrl/oauth/health"
    Write-Host "  3. Tear down when done: azd down --environment $Environment --no-prompt"
} finally {
    Pop-Location
}
