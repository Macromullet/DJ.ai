#!/usr/bin/env pwsh
# Test Summary Generator — merges all test suite results into a single JSON
# Usage: pwsh scripts/test-summary.ps1

param(
    [string]$OutputPath = "electron-app/test-results/summary.json"
)

$ErrorActionPreference = "Continue"
$repoRoot = Split-Path -Parent $PSScriptRoot

# Ensure output directory exists
$outputDir = Split-Path -Parent (Join-Path $repoRoot $OutputPath)
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$summary = @{
    timestamp = (Get-Date -Format "o")
    overall = "PASS"
    suites = @{}
    failures = @()
}

# Parse Vitest JSON
$vitestPath = Join-Path $repoRoot "electron-app/test-results/vitest-results.json"
if (Test-Path $vitestPath) {
    try {
        $vitest = Get-Content $vitestPath -Raw | ConvertFrom-Json
        $passed = 0; $failed = 0; $skipped = 0; $total = 0
        $durationMs = 0

        if ($vitest.testResults) {
            foreach ($file in $vitest.testResults) {
                foreach ($test in $file.assertionResults) {
                    $total++
                    switch ($test.status) {
                        "passed" { $passed++ }
                        "failed" { 
                            $failed++
                            $summary.failures += @{
                                suite = "unit"
                                file = $file.name -replace [regex]::Escape($repoRoot + "\electron-app\"), ""
                                test = $test.fullName
                                error = ($test.failureMessages -join "`n")
                            }
                        }
                        "pending" { $skipped++ }
                    }
                }
                $durationMs += $file.endTime - $file.startTime
            }
        }

        $summary.suites["unit"] = @{
            total = $total; passed = $passed; failed = $failed; skipped = $skipped; durationMs = $durationMs
        }
        if ($failed -gt 0) { $summary.overall = "FAIL" }
    } catch {
        Write-Warning "Failed to parse Vitest results: $_"
    }
} else {
    Write-Host "Vitest results not found at $vitestPath"
}

# Parse xUnit TRX
$trxPath = Join-Path $repoRoot "test-results/backend-results.trx"
# Also check oauth-proxy.Tests location
if (-not (Test-Path $trxPath)) {
    $trxPath = Join-Path $repoRoot "oauth-proxy.Tests/test-results/backend-results.trx"
}
if (Test-Path $trxPath) {
    try {
        [xml]$trx = Get-Content $trxPath
        $ns = @{ t = "http://microsoft.com/schemas/VisualStudio/TeamTest/2010" }
        $counters = $trx.TestRun.ResultSummary.Counters
        
        $total = [int]$counters.total
        $passed = [int]$counters.passed
        $failed = [int]$counters.failed
        
        # Extract failures
        $results = $trx.TestRun.Results.UnitTestResult
        foreach ($result in $results) {
            if ($result.outcome -eq "Failed") {
                $summary.failures += @{
                    suite = "backend"
                    test = $result.testName
                    error = if ($result.Output.ErrorInfo.Message) { $result.Output.ErrorInfo.Message } else { "Unknown error" }
                    stack = if ($result.Output.ErrorInfo.StackTrace) { $result.Output.ErrorInfo.StackTrace } else { "" }
                }
            }
        }

        $times = $trx.TestRun.ResultSummary.RunInfos
        $summary.suites["backend"] = @{
            total = $total; passed = $passed; failed = $failed; skipped = $total - $passed - $failed; durationMs = 0
        }
        if ($failed -gt 0) { $summary.overall = "FAIL" }
    } catch {
        Write-Warning "Failed to parse TRX results: $_"
    }
} else {
    Write-Host "TRX results not found"
}

# Parse Playwright JSON
$pwPath = Join-Path $repoRoot "electron-app/test-results/playwright-results.json"
if (Test-Path $pwPath) {
    try {
        $pw = Get-Content $pwPath -Raw | ConvertFrom-Json
        $passed = 0; $failed = 0; $skipped = 0; $total = 0
        $durationMs = if ($pw.stats.duration) { $pw.stats.duration } else { 0 }

        if ($pw.suites) {
            function Walk-Suites($suites) {
                foreach ($suite in $suites) {
                    if ($suite.specs) {
                        foreach ($spec in $suite.specs) {
                            foreach ($test in $spec.tests) {
                                foreach ($result in $test.results) {
                                    $script:total++
                                    switch ($result.status) {
                                        "passed" { $script:passed++ }
                                        "failed" { 
                                            $script:failed++
                                            $summary.failures += @{
                                                suite = "e2e"
                                                file = $suite.file
                                                test = $spec.title
                                                error = if ($result.error.message) { $result.error.message } else { "Test failed" }
                                            }
                                        }
                                        "skipped" { $script:skipped++ }
                                    }
                                }
                            }
                        }
                    }
                    if ($suite.suites) { Walk-Suites $suite.suites }
                }
            }
            Walk-Suites $pw.suites
        }

        $summary.suites["e2e"] = @{
            total = $total; passed = $passed; failed = $failed; skipped = $skipped; durationMs = $durationMs
        }
        if ($failed -gt 0) { $summary.overall = "FAIL" }
    } catch {
        Write-Warning "Failed to parse Playwright results: $_"
    }
} else {
    Write-Host "Playwright results not found at $pwPath"
}

# Write summary
$summaryJson = $summary | ConvertTo-Json -Depth 10
$outputFullPath = Join-Path $repoRoot $OutputPath
Set-Content -Path $outputFullPath -Value $summaryJson -Encoding UTF8
Write-Host ""
Write-Host "=== Test Summary ==="
Write-Host "Overall: $($summary.overall)"
foreach ($suite in $summary.suites.GetEnumerator()) {
    $s = $suite.Value
    Write-Host "  $($suite.Key): $($s.passed)/$($s.total) passed$(if ($s.failed -gt 0) { ", $($s.failed) FAILED" })"
}
if ($summary.failures.Count -gt 0) {
    Write-Host ""
    Write-Host "Failures: $($summary.failures.Count)"
    foreach ($f in $summary.failures) {
        Write-Host "  [$($f.suite)] $($f.test)"
    }
}
Write-Host ""
Write-Host "Summary written to: $OutputPath"
