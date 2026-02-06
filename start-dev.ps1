#!/usr/bin/env pwsh
# start-dev.ps1 - Legacy wrapper, now delegates to Aspire
Write-Host "Starting DJ.ai via .NET Aspire..." -ForegroundColor Cyan
Write-Host "Dashboard will be available at https://localhost:15888" -ForegroundColor Yellow
Write-Host ""
dotnet run --project DJai.AppHost
