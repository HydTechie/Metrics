#!/usr/bin/env bash
set -euo pipefail

mode="${1:-development}"
action="${2:-up}"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/.." && pwd)"

# Make the selected development env file authoritative over inherited shell values.
unset NODE_ENV OTP_DELIVERY STAFF_USERS JWT_SECRET \
  MONGO_ROOT_USERNAME MONGO_ROOT_PASSWORD MONGO_APP_USERNAME MONGO_APP_PASSWORD \
  MONGODB_URI TOTP_SECRETS TWILIO_ACCOUNT_SID TWILIO_AUTH_TOKEN TWILIO_FROM_NUMBER \
  CORS_ORIGIN CLINIC_TIME_ZONE KAFKA_BROKERS

case "$mode" in
  development|dev) ;;
  production|prod)
    echo "Production is not run with the local Compose stack. Publish images with the GitHub Actions 'Build and publish release images' workflow, then deploy through Kubernetes. See docs/deployment.md." >&2
    exit 2
    ;;
  *)
    echo "Usage: $0 [development|production] [up|down|logs|ps]" >&2
    exit 2
    ;;
esac

env_file="$repo_root/.env.development"
if [[ ! -f "$env_file" ]]; then
  echo "Missing .env.development. Create it from .env.development.example and set unique local secrets." >&2
  exit 2
fi

case "$action" in
  up)   set -- up --build -d ;;
  down) set -- down ;;
  logs) set -- logs -f ;;
  ps)   set -- ps ;;
  *)
    echo "Usage: $0 [development|production] [up|down|logs|ps]" >&2
    exit 2
    ;;
esac

docker compose --project-directory "$repo_root" --env-file "$env_file" "$@"

if [[ "$action" == "up" ]]; then
  echo "Clinic Desk is running at http://localhost:5173"
fi
