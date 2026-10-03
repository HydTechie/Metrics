$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $root 'frontend'
$backend = Join-Path $root 'backend'
$nodeCommand = (Get-Command node.exe -ErrorAction SilentlyContinue).Source

if (-not $nodeCommand) {
  $nodeCommand = 'C:\Users\phani\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
}

if (-not (Test-Path -LiteralPath $nodeCommand)) {
  throw "node.exe was not found. Install Node.js or update the fallback path in start-debug.ps1."
}

$frontendCli = Join-Path $frontend 'node_modules\vite\bin\vite.js'
$backendCli = Join-Path $backend 'node_modules\@nestjs\cli\bin\nest.js'

if (-not (Test-Path -LiteralPath $frontendCli)) {
  throw "Frontend dependencies are missing: $frontendCli"
}

if (-not (Test-Path -LiteralPath $backendCli)) {
  throw "Backend dependencies are missing: $backendCli"
}

$frontendCommand = "& '$nodeCommand' '$frontendCli' --host 0.0.0.0 --debug"
$backendCommand = "& '$nodeCommand' '$backendCli' start --watch --debug 127.0.0.1:9229"

Write-Host 'Starting Clinic Desk in debug mode...'
Write-Host 'Frontend: Vite debug output at http://127.0.0.1:5173'
Write-Host 'Backend: Node inspector at ws://127.0.0.1:9229'

Start-Process -FilePath 'powershell.exe' -WorkingDirectory $frontend -ArgumentList @(
  '-NoExit',
  '-Command',
  $frontendCommand
)

Start-Process -FilePath 'powershell.exe' -WorkingDirectory $backend -ArgumentList @(
  '-NoExit',
  '-Command',
  $backendCommand
)

Write-Host 'Both debug processes were launched in separate PowerShell windows.'
