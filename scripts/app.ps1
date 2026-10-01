param(
    [ValidateSet("development", "production")]
    [string]$Mode = "development",

    [ValidateSet("up", "down", "logs", "ps")]
    [string]$Action = "up"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot

if ($Mode -eq "production") {
    throw "Production is not run with the local Compose stack. Publish images with the GitHub Actions 'Build and publish release images' workflow, then deploy through Kubernetes. See docs/deployment.md."
}

foreach ($name in @(
    "NODE_ENV", "OTP_DELIVERY", "STAFF_USERS", "JWT_SECRET",
    "MONGO_ROOT_USERNAME", "MONGO_ROOT_PASSWORD", "MONGO_APP_USERNAME", "MONGO_APP_PASSWORD",
    "MONGODB_URI", "TOTP_SECRETS", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM_NUMBER",
    "CORS_ORIGIN", "CLINIC_TIME_ZONE", "KAFKA_BROKERS"
)) {
    Remove-Item "Env:$name" -ErrorAction SilentlyContinue
}

$envFile = Join-Path $repoRoot ".env.development"
if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Missing .env.development. Create it from .env.development.example and set unique local secrets."
}

$composeArgs = switch ($Action) {
    "up"   { @("up", "--build", "-d") }
    "down" { @("down") }
    "logs" { @("logs", "-f") }
    "ps"   { @("ps") }
}

Push-Location $repoRoot
try {
    & docker compose --env-file $envFile @composeArgs
    if ($LASTEXITCODE -ne 0) {
        throw "docker compose failed with exit code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}

if ($Action -eq "up") {
    Write-Output "Clinic Desk is running at http://localhost:5173"
}
