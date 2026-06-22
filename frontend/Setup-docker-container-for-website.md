# Setup Docker container for website

This guide covers **frontend hosting**, **CI/CD**, and **container runtime** for the ConnectMyTask web app ([Web-connectmytask](https://github.com/SyncMyTask/Web-connectmytask)).

The web Docker image serves the **React SPA with Nginx** only. The main API, MongoDB, Traefik, and SSL run in the **ConnectMyTask backend** stack—not in this repo.

---

## Overview

| Layer | Technology | Where it lives |
|--------|------------|----------------|
| Frontend hosting | React build + **Nginx** (Docker image) | `Dockerfile`, `nginx.conf` |
| CI/CD | **GitHub Actions** + **Docker Compose** | `.github/workflows/ci.yml`, `docker-compose.yml` |
| Container runtime | **Docker** | Your PC (Docker Desktop) or VPS |

### Files in this repo

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: Node builds React → Nginx serves `build/` |
| `nginx.conf` | SPA routing (`try_files` → `index.html`) |
| `docker-compose.yml` | Local build and run on port 8080 |
| `.dockerignore` | Keeps the image small |
| `.env.production.example` | Production `REACT_APP_*` values for builds |
| `.github/workflows/ci.yml` | Test, build image, push to GHCR |

---

## Prerequisites

1. [Docker Desktop](https://www.docker.com/products/docker-deskt  op/) (Windows/Mac) or Docker Engine (Linux)
2. **ConnectMyTask backend** running for login, tasks, and API calls (default `http://localhost:4000`)
3. For production builds: API URL and OAuth/reCAPTCHA keys (see [Environment variables](#environment-variables))

Verify Docker:

```bash
docker --version
docker compose version
```

---

## Container runtime (Docker)

Docker is the **container runtime**: it runs the frontend image on your machine or server.

### Local run (recommended first test)

From the `web` folder:

```bash
cd web
docker compose up --build
```

Open: **http://localhost:8080**

Stop:

```bash
docker compose down
```

### Build without Compose

```bash
docker build \
  --build-arg REACT_APP_API_BASE_URL=http://localhost:4000 \
  -t connectmytask-frontend .

docker run -p 8080:80 connectmytask-frontend
```

### Custom port

```bash
FRONTEND_PORT=3000 docker compose up --build
```

---

## Frontend hosting

### How the image works

1. **Build stage** (`node:20-alpine`): `npm ci` → `npm run build` → static files in `build/`
2. **Run stage** (`nginx:alpine`): copies `build/` to `/usr/share/nginx/html`, listens on **port 80**

`REACT_APP_*` variables must be set **at build time** (Docker build args or GitHub Actions). They are embedded in the JavaScript bundle—not read at container start.

### Environment variables

Copy `.env.production.example` and set values before `docker compose build`, or pass them in a `web/.env` file used by Compose:

```env
REACT_APP_API_BASE_URL=http://localhost:4000
REACT_APP_GOOGLE_CLIENT_ID=your_google_web_client_id
REACT_APP_FACEBOOK_APP_ID=your_facebook_app_id
REACT_APP_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
REACT_APP_RECAPTCHA_VERIFY_ENABLED=true
REACT_APP_ADMIN_EMAILS=admin@example.com
```

| Variable | Required | Notes |
|----------|----------|--------|
| `REACT_APP_API_BASE_URL` | Yes | Main API (same as mobile), e.g. `https://connectmytask-api.onrender.com` |
| `REACT_APP_GOOGLE_CLIENT_ID` | For Google login | Must match backend `GOOGLE_CLIENT_ID` |
| `REACT_APP_FACEBOOK_APP_ID` | For Facebook login | Must match backend `FACEBOOK_APP_ID` |
| `REACT_APP_RECAPTCHA_SITE_KEY` | For login/register | Site key only; secret stays on backend |
| `REACT_APP_ADMIN_EMAILS` | For admin routes | Comma-separated emails |

Never put secrets (JWT, SendGrid, reCAPTCHA **secret**) in `REACT_APP_*`—they are public in the browser.

### What is not in this container

- Main Node API (`:4000`) → **backend** repo (contact, fraud admin, auth, tasks)
- MongoDB → **backend** `docker-compose.yml`

---

## CI/CD (GitHub Actions)

Workflow: **Frontend CI/CD** (`.github/workflows/ci.yml`)

Triggers: push and pull request to `main`.

### Pipeline jobs

| Job | When | What it does |
|-----|------|----------------|
| **Tests** | Always | `npm test` (React) |
| **Compose check** | After tests | `docker compose config` |
| **Docker build (pull request)** | PR only | Builds image, does not push |
| **Publish Docker image** | Push to `main` | Builds and pushes to GHCR |
| **Deploy to VPS** | Push to `main`, only if enabled | SSH + `docker compose pull frontend` |

Published image:

```text
ghcr.io/<github-owner>/connectmytask-frontend:latest
```

### GitHub configuration

**Settings → Secrets and variables → Actions**

#### Variables (plain text)

| Name | Example |
|------|---------|
| `REACT_APP_API_BASE_URL` | `https://connectmytask-api.onrender.com` |
| `REACT_APP_RECAPTCHA_VERIFY_ENABLED` | `true` |
| `REACT_APP_ADMIN_EMAILS` | `admin@example.com` |
| `DEPLOY_VPS_ENABLED` | `true` only when VPS deploy is ready |

#### Secrets

| Name | Purpose |
|------|---------|
| `REACT_APP_GOOGLE_CLIENT_ID` | OAuth |
| `REACT_APP_FACEBOOK_APP_ID` | OAuth |
| `REACT_APP_RECAPTCHA_SITE_KEY` | reCAPTCHA |
| `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_PORT`, `VPS_STACK_DIR` | VPS deploy |
| `GHCR_PAT` | VPS pull from GHCR |

**Deploy to VPS** is **skipped** unless `DEPLOY_VPS_ENABLED=true` and VPS secrets are set.

### Watch a run

1. Open the repo on GitHub → **Actions**
2. Select **Frontend CI/CD**
3. Open the latest workflow run on `main`

---

## Production (VPS + backend stack)

The frontend image is deployed with the **backend** Docker Compose stack (Traefik, API, MongoDB).

On the VPS `.env` (in the backend stack directory):

```env
FRONTEND_IMAGE=ghcr.io/syncmytask/connectmytask-frontend
FRONTEND_IMAGE_TAG=latest
```

Traefik routes your domain to the frontend container; the API uses a separate host (e.g. `api.yourdomain.com`).

Ensure `REACT_APP_API_BASE_URL` in GitHub **Variables** matches that public API URL before the image is built.

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| `docker: command not found` | Install Docker Desktop; restart terminal |
| `missing server host` (Actions) | Do not enable VPS deploy until secrets exist; leave `DEPLOY_VPS_ENABLED` unset |
| Workflow run **canceled** | A newer push cancelled it—open the **latest** run |
| Blank page or API errors | Rebuild with correct `REACT_APP_API_BASE_URL`; backend must be running |
| Login/OAuth fails in prod | Add production domains in Google/Facebook/reCAPTCHA consoles |
| Port 8080 in use | `FRONTEND_PORT=8090 docker compose up` |

---

## Quick reference

```bash
# Local
cd web
docker compose up --build          # http://localhost:8080
docker compose down

# Tests (without Docker)
npm test -- --watchAll=false
```

For full local development (React + backend), see the main [README.md](./README.md) and `npm run start:full`.
