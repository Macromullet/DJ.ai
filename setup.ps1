#!/usr/bin/env pwsh
# DJ.ai Backend Setup Tool
# Configures OAuth middleware secrets for local development or cloud deployment

param(
    [Parameter()]
    [ValidateSet('local', 'cloud')]
    [string]$Mode
)

$ErrorActionPreference = 'Stop'
$RepoRoot = $PSScriptRoot

Write-Host ""
Write-Host "╔══════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      DJ.ai Backend Setup Tool        ║" -ForegroundColor Cyan  
Write-Host "╚══════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# If no mode specified, ask
if (-not $Mode) {
    Write-Host "What would you like to configure?" -ForegroundColor Yellow
    Write-Host "  [1] Local development (Aspire + dotnet user-secrets)"
    Write-Host "  [2] Cloud deployment (Azure Key Vault)"
    Write-Host ""
    $choice = Read-Host "Select (1 or 2)"
    $Mode = if ($choice -eq '2') { 'cloud' } else { 'local' }
}

if ($Mode -eq 'local') {
    & "$RepoRoot/scripts/setup-local.ps1"
} else {
    & "$RepoRoot/scripts/setup-cloud.ps1"
}
