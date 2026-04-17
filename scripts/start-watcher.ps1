# Ruflo Swarm — Start Watcher (PowerShell)
# Uruchom na każdej maszynie: .\scripts\start-watcher.ps1
# Opcjonalnie: .\scripts\start-watcher.ps1 -Machine x1extreme

param(
    [string]$Machine = ""
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Write-Host "╔═══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🤖 Ruflo Swarm — Starting Watcher            ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════╝" -ForegroundColor Cyan

# Set machine identity
if ($Machine -ne "") {
    $env:RUFLO_MACHINE = $Machine
    Write-Host "  Machine: $Machine" -ForegroundColor Green
} else {
    Write-Host "  Machine: auto-detect from hostname ($env:COMPUTERNAME)" -ForegroundColor Yellow
}

# Check for RUFLO_PAT
if (-not $env:RUFLO_PAT) {
    # Try to get from git credential manager
    try {
        $creds = "protocol=https`nhost=github.com" | git credential fill 2>$null
        $token = ($creds | Select-String "password=(.+)").Matches.Groups[1].Value
        if ($token) {
            $env:RUFLO_PAT = $token
            Write-Host "  Token: loaded from git credential manager ✅" -ForegroundColor Green
        }
    } catch {}
}

if (-not $env:RUFLO_PAT) {
    Write-Host "  ❌ RUFLO_PAT not set and not found in git credentials" -ForegroundColor Red
    Write-Host "  Set it with: `$env:RUFLO_PAT = 'gho_...'` " -ForegroundColor Yellow
    exit 1
}

Write-Host "  Token: ✅ configured" -ForegroundColor Green
Write-Host ""
Write-Host "  Starting watcher... (Ctrl+C to stop)" -ForegroundColor Cyan
Write-Host ""

# Start watcher
node "$ScriptDir\watcher.mjs"
