# Test OAuth Proxy Locally
# Prerequisites: `func start` must be running on port 7071

$deviceToken = "12345678-1234-1234-1234-123456789abc"
$baseUrl = "http://localhost:7071/api/oauth"

Write-Host "=== Testing DJ.ai OAuth Proxy ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Initiate OAuth Flow
Write-Host "[1/3] Testing Spotify OAuth Initiate..." -ForegroundColor Yellow
try {
    $body = @{
        redirectUri = "http://localhost:5173/oauth/callback"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/spotify/initiate" `
        -Method POST `
        -Headers @{ "X-Device-Token" = $deviceToken; "Content-Type" = "application/json" } `
        -Body $body

    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "   State: $($response.state)" -ForegroundColor Gray
    Write-Host "   Auth URL: $($response.authUrl.Substring(0,80))..." -ForegroundColor Gray
}
catch {
    Write-Host "❌ Failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 2: Invalid Device Token
Write-Host "[2/3] Testing Invalid Device Token..." -ForegroundColor Yellow
try {
    $body = @{
        redirectUri = "http://localhost:5173/oauth/callback"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/spotify/initiate" `
        -Method POST `
        -Headers @{ "X-Device-Token" = "invalid"; "Content-Type" = "application/json" } `
        -Body $body

    Write-Host "❌ Should have failed but didn't!" -ForegroundColor Red
}
catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Correctly rejected invalid token" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $_" -ForegroundColor Red
    }
}

Write-Host ""

# Test 3: Missing Headers
Write-Host "[3/3] Testing Missing Device Token..." -ForegroundColor Yellow
try {
    $body = @{
        redirectUri = "http://localhost:5173/oauth/callback"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/spotify/initiate" `
        -Method POST `
        -Headers @{ "Content-Type" = "application/json" } `
        -Body $body

    Write-Host "❌ Should have failed but didn't!" -ForegroundColor Red
}
catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "✅ Correctly rejected missing token" -ForegroundColor Green
    } else {
        Write-Host "❌ Unexpected error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "=== Tests Complete ===" -ForegroundColor Cyan
