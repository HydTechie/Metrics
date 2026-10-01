# Deployment design

## Local containers

`docker compose --env-file .env.development up --build` starts the React static site, NestJS API, authenticated MongoDB replica set, and single-node Kafka/Zookeeper. Copy `.env.development.example` to `.env.development` and set unique local passwords and a JWT secret first. Mongo root credentials are for administration; the API uses a separate `readWrite` account scoped to the `clinic` database. The API waits on Mongo and Kafka health checks. Mongo persists into the `mongo-data` volume. Demo seed doctors are inserted on first API startup. The local Kafka broker is single-node and has no production durability guarantees.

For one-click startup on Windows, double-click `scripts/start-dev.cmd`. On Unix, run `bash scripts/start-dev.sh`. For lifecycle actions, use `scripts/app.ps1 -Mode development -Action <up|down|logs|ps>` on PowerShell or `bash scripts/app.sh development <up|down|logs|ps>` on Unix. These use `.env.development`. The scripts intentionally reject production mode: the Compose stack contains local MongoDB/Kafka and is not the production deployment topology.

## Release selection

The backend selects configuration using `NODE_ENV`: `development` loads `.env.development`; `production` requires Twilio delivery and production secrets. Local development is started with the Compose command above. To build release images, open the repository's **Actions** tab, choose **Build and publish release images**, select **Run workflow**, choose the branch and `development` or `production`, then start the workflow. This choice selects the GitHub Environment, sets the API image's default `NODE_ENV`, and provides build settings such as the frontend GraphQL URL. The workflow tests/builds both apps and publishes images tagged `<environment>-<commit-sha>` to Artifact Registry; it does not deploy to a cluster. Deployment environment variables can override the image's `NODE_ENV`, and secrets are always supplied at runtime.

Create the Artifact Registry Docker repository named `clinic` first. Create GitHub Environments named `development` and `production`. In each, set the GitHub Environment variables `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, and `VITE_GRAPHQL_URL`; optionally set `CLINIC_TIME_ZONE`. Grant the service account Artifact Registry Writer and configure Workload Identity Federation with the repository as its principal. For a production rollout, replace `REGION`, `PROJECT`, and `RELEASE` in both Kubernetes manifests with the configured region/project and the exact `production-<commit-sha>` tag from the workflow summary. Configure `clinic-api-config` with non-secret runtime settings (including `STAFF_USERS`, `KAFKA_BROKERS`, and `CORS_ORIGIN`) and provide the referenced `clinic-api-secrets` keys from Secret Manager. Cluster credentials, GKE rollout, ConfigMaps, and Secret Manager integration are intentionally not automated by this workflow. The Kubernetes manifests are production examples; development runtime currently uses Docker Compose and `.env.development`.

## GCP / Kubernetes target

- Build and publish versioned container images with the GitHub Actions workflow above. Review the base images and runtime users before treating the current Dockerfiles as production-hardened non-root images.
- Run UI and API as separate GKE Deployments behind HTTPS Ingress; the API exposes `/health/live` and `/health/ready` probes.
- Inject non-sensitive environment configuration via ConfigMaps and sensitive values (including the authenticated `MONGODB_URI`, JWT secret, Twilio credentials, and TOTP seeds) via Secret Manager / Workload Identity. The API deployment references `clinic-api-secrets`; create that Kubernetes Secret through the Secret Manager integration, not a committed manifest.
- Add HPA based on CPU and request metrics, resource requests/limits, pod disruption budgets, and rolling updates after the outbox publisher uses an atomic lease or is split into a single worker. Scale the notification consumer independently when extracted.
- Use a managed MongoDB replica set with backups and transaction support. Use a managed Kafka-compatible service or a separately operated Kafka cluster with replication, retention, and ACLs.
- Emit JSON logs to Cloud Logging; monitor HTTP errors/latency, Mongo health, outbox age, publish failures, Kafka lag, and notification processing errors in Cloud Monitoring.
- Roll back by pinning/redeploying a prior image digest and manifest revision. Use backward-compatible database and event changes during rolling deployments.

The provided Kubernetes manifests are a starting point and do not provision GCP services, secrets, ingress certificates, storage, or a managed Kafka cluster.
