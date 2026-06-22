# Deployment Guide — ConnectMyTask Backend

This document covers how to deploy the ConnectMyTask backend on a VPS (Hostinger) using Docker and Traefik as a reverse proxy with automatic HTTPS.

---

## Stack Overview

| Component | Technology |
|---|---|
| Backend API | Node.js 20 + Express |
| Database | MongoDB 7 (containerized) |
| Reverse proxy | Traefik v3 (handles HTTPS automatically) |
| Container runtime | Docker + Docker Compose |
| SSL certificates | Let's Encrypt (auto-managed by Traefik) |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Image registry | GitHub Container Registry (GHCR) |

---

## Repository Structure (Docker-related files)

```
ConnectMyTask/
├── docker-compose.yml          # Main stack definition (Traefik + Backend + MongoDB)
├── .env.example                # Template for all required environment variables
├── traefik/
│   ├── traefik.yml             # Traefik static configuration
│   └── acme.json               # Let's Encrypt certificate storage (must be chmod 600)
└── server/
    └── Dockerfile              # Backend image build instructions
```

---

## How It Works

```
Internet
    │
    ▼
Traefik :80 / :443
    ├── HTTP :80  ──► auto-redirects to HTTPS
    └── HTTPS :443
          └── api.yourdomain.com ──► backend container :3300

Internal network only (not exposed to internet):
    └── mongodb container :27017
```

- **Traefik** is the only service with public ports (80, 443). It handles SSL termination and routes traffic to the backend.
- **MongoDB** is only accessible inside the Docker network — never exposed publicly.
- **The backend** connects to MongoDB using the Docker service name `mongodb` as the hostname.

---

## Prerequisites

### 1. VPS Requirements
- Ubuntu 22.04+ (or Debian 12+)
- Minimum 1 vCPU, 1 GB RAM
- Ports 80 and 443 open in the firewall

### 2. Domain DNS
Point an A record for your API subdomain to your VPS IP **before** starting the stack. Let's Encrypt needs to reach your domain to issue an SSL certificate.

```
A record:  api.yourdomain.com  →  YOUR_VPS_IP
```

### 3. Docker Installation
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

---

## First-Time Setup

### Step 1 — Clone the repository
```bash
git clone https://github.com/SyncMyTask/ConnectMyTask.git
cd ConnectMyTask
```

### Step 2 — Create the environment file
```bash
cp .env.example .env
nano .env
```

Fill in all `CHANGE_ME` values. The most critical ones are listed below — see `.env.example` for the full list with descriptions.

| Variable | Description |
|---|---|
| `MONGO_URI` | `mongodb://admin:YOUR_PASS@mongodb:27017/connectmytask?authSource=admin` |
| `MONGO_INITDB_ROOT_USERNAME` | MongoDB root username (e.g. `admin`) |
| `MONGO_INITDB_ROOT_PASSWORD` | MongoDB root password — must match the password in `MONGO_URI` |
| `JWT_SECRET` | Long random string for signing JWT tokens. Generate with: `openssl rand -hex 64` |
| `API_DOMAIN` | Your API subdomain, e.g. `api.yourdomain.com` |
| `LETSENCRYPT_EMAIL` | Email address for Let's Encrypt certificate notifications |
| `BACKEND_IMAGE` | `ghcr.io/syncmytask/connectmytask-backend` |
| `BACKEND_IMAGE_TAG` | `latest` |

> **Important:** `PORT` must be set to `3300` in the `.env` file. Traefik is configured to route traffic to port 3300.

### Step 3 — Upload the Firebase service account key

The Firebase key is never stored in the Docker image. Copy it from the development machine to the VPS:

```bash
# Run this from your LOCAL machine
scp server/config/serviceAccountKey.json YOUR_USER@YOUR_VPS_IP:~/ConnectMyTask/server/config/serviceAccountKey.json
```

If push notifications are not required yet, skip this step and set `FIREBASE_DISABLED=true` in `.env` instead.

### Step 4 — Fix Traefik certificate file permissions
```bash
chmod 600 traefik/acme.json
```

Traefik will refuse to start if this file has incorrect permissions.

### Step 5 — Log in to GitHub Container Registry
The backend Docker image is hosted on GHCR. Authenticate with a GitHub Personal Access Token that has `read:packages` scope.

```bash
echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

### Step 6 — Start the stack
```bash
docker compose -f docker-compose.yml up -d
```

> Use `-f docker-compose.yml` explicitly to ensure the local development override file is not loaded if it happens to be present.

### Step 7 — Verify
```bash
# Watch Traefik request the SSL certificate (takes ~30 seconds on first run)
docker compose logs -f traefik

# Once running, test the API
curl https://api.yourdomain.com/api-docs.json
```

A successful response is a JSON object containing the Swagger API spec.

---

## Updating the Backend (Redeployment)

When a new version is pushed to the `main` branch, the GitHub Actions pipeline automatically:
1. Runs tests
2. Builds and pushes the new image to GHCR
3. SSHes into the VPS and pulls + restarts only the backend container

To manually redeploy:
```bash
cd ~/ConnectMyTask
docker compose -f docker-compose.yml pull backend
docker compose -f docker-compose.yml up -d backend
```

MongoDB and Traefik do not need to be restarted on backend updates.

---

## GitHub Actions CI/CD — Required Secrets

Configure these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Description |
|---|---|
| `MONGO_URI_TEST` | MongoDB connection URI used during automated tests (can be Atlas free tier) |
| `VPS_HOST` | VPS IP address or hostname |
| `VPS_USER` | SSH username (e.g. `ubuntu`) |
| `VPS_SSH_KEY` | Full private SSH key content (PEM format, including header/footer lines) |
| `VPS_PORT` | SSH port (usually `22`) |
| `VPS_STACK_DIR` | Absolute path to the project on the VPS (e.g. `/home/ubuntu/ConnectMyTask`) |
| `GHCR_PAT` | GitHub Personal Access Token with `read:packages` scope — used by the VPS to pull the image |

`GITHUB_TOKEN` is provided automatically by GitHub Actions and does not need to be created.

---

## Useful Commands

```bash
# View logs for all services
docker compose logs -f

# View logs for a specific service
docker compose logs -f backend
docker compose logs -f mongodb
docker compose logs -f traefik

# Check container status and health
docker compose ps

# Restart a single service
docker compose -f docker-compose.yml restart backend

# Stop the entire stack
docker compose -f docker-compose.yml down

# Stop and remove all data (destructive — deletes MongoDB data)
docker compose -f docker-compose.yml down -v
```

---

## Environment Variables Reference

See `.env.example` in the project root for the complete list of all environment variables with descriptions. Key groups:

- **Core**: `PORT`, `NODE_ENV`, `JWT_SECRET`, `MONGO_URI`
- **Auth**: `GOOGLE_CLIENT_ID`, `FACEBOOK_APP_ID/SECRET`
- **Email**: `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`
- **Storage**: `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET`
- **Payments**: `SSLCOMMERZ_*`, `PAYFAST_*`
- **KYC**: `DIDIT_*`
- **Infrastructure**: `API_DOMAIN`, `LETSENCRYPT_EMAIL`, `BACKEND_IMAGE`, `BACKEND_IMAGE_TAG`

---

## Troubleshooting

**Traefik fails to start**
- Check `traefik/acme.json` has `chmod 600` permissions
- Ensure ports 80 and 443 are not already in use on the VPS

**SSL certificate not issued**
- Confirm the DNS A record for `API_DOMAIN` points to your VPS IP
- Allow up to 5 minutes for DNS propagation before starting the stack
- Check `docker compose logs traefik` for ACME challenge errors

**Backend fails to connect to MongoDB**
- Verify `MONGO_URI` uses `mongodb` as the hostname (not `localhost`)
- Verify `MONGO_INITDB_ROOT_USERNAME/PASSWORD` in `.env` matches the credentials in `MONGO_URI`
- If changing MongoDB credentials after the volume already exists, run `docker compose down -v` to reset the volume and reinitialize

**Push notifications not working**
- Ensure `serviceAccountKey.json` was uploaded to `server/config/` on the VPS
- Ensure `FIREBASE_DISABLED` is not set to `true` in `.env`
- Check backend logs for Firebase initialization errors
