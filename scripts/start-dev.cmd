@echo off
setlocal
set "ROOT=%~dp0.."
set "NODE_ENV="
set "OTP_DELIVERY="
set "STAFF_USERS="
set "JWT_SECRET="
set "MONGO_ROOT_USERNAME="
set "MONGO_ROOT_PASSWORD="
set "MONGO_APP_USERNAME="
set "MONGO_APP_PASSWORD="
set "MONGODB_URI="
set "TOTP_SECRETS="
set "TWILIO_ACCOUNT_SID="
set "TWILIO_AUTH_TOKEN="
set "TWILIO_FROM_NUMBER="
set "CORS_ORIGIN="
set "CLINIC_TIME_ZONE="
set "KAFKA_BROKERS="

if not exist "%ROOT%\.env.development" (
  echo Missing .env.development.
  echo Copy .env.development.example to .env.development and set local secrets first.
  pause
  exit /b 2
)

docker compose --project-directory "%ROOT%" --env-file "%ROOT%\.env.development" up --build -d
if errorlevel 1 (
  echo.
  echo Could not start Clinic Desk. Check that Docker Desktop is running.
  pause
  exit /b 1
)

echo.
echo Clinic Desk is running at http://localhost:5173
pause
