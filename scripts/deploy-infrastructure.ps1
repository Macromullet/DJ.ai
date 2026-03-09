<#
.SYNOPSIS
    Deploy DJ.ai infrastructure and app to Azure.

.DESCRIPTION
    Validates and deploys Bicep templates, then publishes the Azure Functions app.
    Uses az CLI directly — no azd required.

    Resource group convention: rg-djai-{environment}
    Resource groups must be pre-created before running this script.

.PARAMETER Environment
    Target environment (default: 'dev'). Maps to resource group rg-djai-{env}.

.PARAMETER Location
    Azure region (default: 'eastus2').

.PARAMETER TenantId
    Azure AD tenant ID. If provided, runs az login against this tenant.

.PARAMETER SubscriptionId
    Azure subscription ID. If provided, sets this as the active subscription.

.PARAMETER SkipProvision
    Skip infrastructure provisioning (only publish the app code).

.PARAMETER ValidateOnly
    Only validate Bicep templates — don't deploy anything.

.PARAMETER AllowedRedirectHosts
    Comma-separated redirect hosts (default: 'localhost:5173,localhost:5174').

.EXAMPLE
    .\scripts\deploy-infrastructure.ps1                          # Full deploy to 'dev'
    .\scripts\deploy-infrastructure.ps1 -ValidateOnly            # Just validate Bicep
    .\scripts\deploy-infrastructure.ps1 -Environment staging     # Deploy to staging
    .\scripts\deploy-infrastructure.ps1 -SkipProvision           # Publish app code only
    .\scripts\deploy-infrastructure.ps1 -TenantId abc... -SubscriptionId xyz...
#>

param(
    [string]$Environment = 'dev',
    [string]$Location = 'eastus2',
    [string]$TenantId,
    [string]$SubscriptionId,
    [switch]$SkipProvision,
    [switch]$ValidateOnly,
    [switch]$EnableNetworkIsolation,
    [string]$AllowedRedirectHosts = 'localhost:5173,localhost:5174'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$resourceGroup = "rg-djai-$Environment"

Write-Host "`n=== DJ.ai Azure Deploy ===" -ForegroundColor Cyan
Write-Host "Environment:    $Environment"
Write-Host "Resource Group: $resourceGroup"
Write-Host "Location:       $Location"
Write-Host ""

# --- Pre-flight checks ---
Write-Host "[1/4] Pre-flight checks..." -ForegroundColor Yellow

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Error "Azure CLI (az) not found. Install from https://aka.ms/installazurecli"
}

# Login if needed
if ($TenantId) {
    Write-Host "  Logging into tenant $TenantId..." -ForegroundColor Gray
    az login --tenant $TenantId --only-show-errors | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Error "Azure CLI login failed." }
} else {
    $check = az account show 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Not logged in — opening browser..." -ForegroundColor Gray
        az login --only-show-errors | Out-Null
        if ($LASTEXITCODE -ne 0) { Write-Error "Azure CLI login failed." }
    }
}

if ($SubscriptionId) {
    az account set --subscription $SubscriptionId 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { Write-Error "Failed to set subscription $SubscriptionId." }
}

$acct = az account show 2>&1 | ConvertFrom-Json
Write-Host "  Subscription: $($acct.name) ($($acct.id))" -ForegroundColor Gray
Write-Host "  Tenant:       $($acct.tenantId)" -ForegroundColor Gray

# Verify resource group exists
$rgCheck = az group show --name $resourceGroup 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Resource group '$resourceGroup' not found. Create it first:`n  az group create --name $resourceGroup --location $Location"
}
Write-Host "  Resource group '$resourceGroup' exists" -ForegroundColor Gray

# --- Validate Bicep ---
Write-Host "`n[2/4] Validating Bicep templates..." -ForegroundColor Yellow

$bicepFiles = Get-ChildItem -Path "$root\infra" -Recurse -Filter '*.bicep'
$hasErrors = $false

foreach ($file in $bicepFiles) {
    $result = az bicep build --file $file.FullName --stdout 2>&1
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

# --- Provision infrastructure ---
if (-not $SkipProvision) {
    Write-Host "`n[3/4] Provisioning infrastructure..." -ForegroundColor Yellow

    $deploymentName = "djai-$Environment-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

    $deployParams = @(
        'deployment', 'group', 'create',
        '--resource-group', $resourceGroup,
        '--template-file', "$root\infra\main.bicep",
        '--parameters', "environmentName=$Environment",
        '--parameters', "allowedRedirectHosts=$AllowedRedirectHosts",
        '--parameters', "enableNetworkIsolation=$($EnableNetworkIsolation.IsPresent.ToString().ToLower())",
        '--name', $deploymentName,
        '--mode', 'Incremental',
        '--verbose'
    )

    az @deployParams
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Provisioning failed. Check errors above."
    }
    Write-Host "  Infrastructure provisioned!" -ForegroundColor Green
} else {
    Write-Host "`n[3/4] Skipping provisioning (--SkipProvision)" -ForegroundColor Gray
}

# --- Deploy application ---
Write-Host "`n[4/4] Deploying application..." -ForegroundColor Yellow

# Get function app name from deployment outputs
$outputs = az deployment group show `
    --resource-group $resourceGroup `
    --name $deploymentName `
    --query 'properties.outputs' -o json 2>&1 | ConvertFrom-Json

$funcAppName = $outputs.AZURE_FUNCTION_APP_NAME.value
if (-not $funcAppName) {
    Write-Error "Could not determine Function App name from deployment outputs. Check that main.bicep outputs 'AZURE_FUNCTION_APP_NAME'."
}

Write-Host "  Publishing to $funcAppName..." -ForegroundColor Gray

if (-not (Get-Command func -ErrorAction SilentlyContinue)) {
    Write-Error "Azure Functions Core Tools (func) not found. Install: npm i -g azure-functions-core-tools@4"
}

Push-Location "$root\oauth-proxy"
try {
    dotnet publish -c Release -o ./publish 2>&1
    if ($LASTEXITCODE -ne 0) { Write-Error "dotnet publish failed." }

    Push-Location ./publish
    try {
        func azure functionapp publish $funcAppName --dotnet-isolated 2>&1
        if ($LASTEXITCODE -ne 0) { Write-Error "Function app publish failed." }
    } finally {
        Pop-Location
    }
    Remove-Item -Recurse -Force ./publish -ErrorAction SilentlyContinue
} finally {
    Pop-Location
}

# --- Output results ---
Write-Host "`n=== Deployment Complete ===" -ForegroundColor Green
Write-Host "Environment:    $Environment"
Write-Host "Resource Group: $resourceGroup"
Write-Host "Function App:   $funcAppName"

$funcUrl = "https://$funcAppName.azurewebsites.net"
Write-Host "Endpoint:       $funcUrl" -ForegroundColor Cyan

Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "  1. Add OAuth secrets to Key Vault: .\setup.ps1 --cloud"
Write-Host "  2. Test endpoint: curl $funcUrl/oauth/health"
Write-Host "  3. Tear down: az group delete --name $resourceGroup --no-wait --yes"
