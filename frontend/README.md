# ConnectMyTask – Web Frontend

A React web application for outsourcing tasks, connecting users who post jobs with service providers who bid and complete work.

This README covers cloning the web repo, environment setup, MongoDB, third-party integrations, and running locally. This repo is **frontend-only**. The web app uses the **same backend API as the mobile app** — clone **[ConnectMyTask](https://github.com/SyncMyTask/ConnectMyTask)** and run `ConnectMyTask/server` on port **4000**.

For **Docker** (frontend container, CI/CD, production image), see **[Setup-docker-container-for-website.md](./Setup-docker-container-for-website.md)**.

---

## Features

- User and provider registration and login (email/password)
- Email verification before first login (SendGrid via backend)
- Google and Facebook sign-in with role selection on sign-up
- Multi-step task posting and task marketplace
- Submit and manage bids; payments and escrow flows
- Real-time messaging (Socket.IO)
- User and provider dashboards and profiles
- Admin panel and fraud review
- Contact form with email notifications (main API on port 4000)
- Multi-language support (English, Lao, Thai)

---

## Prerequisites

Ensure the following are installed:

- [Node.js](https://nodejs.org/) 18+ (LTS recommended) and npm 9+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (optional — for containerized frontend; see [Setup-docker-container-for-website.md](./Setup-docker-container-for-website.md))
- A modern browser (Chrome, Edge, or Firefox)
- [MongoDB Community Server](https://www.mongodb.com/try/download/community) running locally **or** MongoDB Atlas
- [MongoDB Compass](https://www.mongodb.com/products/tools/compass) (GUI to view your database)
- The **ConnectMyTask** backend repo cloned separately ([ConnectMyTask](https://github.com/SyncMyTask/ConnectMyTask))

---

## Clone the repository

Clone the **web** and **backend** repos as **sibling folders** (same parent directory). Do **not** clone `ConnectMyTask` inside `Web-connectmytask`.

```txt
your-folder/
  Web-connectmytask/    ← this repo (React app, port 3000)
  ConnectMyTask/        ← backend repo (clone separately)
    server/             ← API — run from here (port 4000)
```

**Web (this repo)**

```bash
cd your-folder
git clone https://github.com/SyncMyTask/Web-connectmytask.git
```

**Backend** — separate GitHub repo (required)

```bash
cd your-folder
git clone https://github.com/SyncMyTask/ConnectMyTask.git
cd ConnectMyTask/server
npm install
```

---

## Run locally

You need **MongoDB**, the **ConnectMyTask backend** (`:4000`), and this **React app** (`:3000`).

After [.env files](#required-env-values) are configured, install dependencies in **both** repos (`npm install` in `Web-connectmytask` and `ConnectMyTask/server`).

Use the [sibling folder layout](#clone-the-repository) from the clone step — backend and web must stay separate.

### Recommended — two terminals

Use **two terminal windows** (or two tabs). Start the **API first**, then the **web app**.

| Process | URL | Role |
|---------|-----|------|
| **API** | [http://localhost:4000](http://localhost:4000) | Main backend — auth, tasks, contact, fraud admin, messages (same as mobile) |
| **WEB** | [http://localhost:3000](http://localhost:3000) | React dev server |

**Terminal 1 — API**

```powershell
cd path\to\ConnectMyTask\server
npm start
```

Wait until you see `Server running on port 4000` and `Connected to MongoDB`.

**Terminal 2 — React**

```powershell
cd path\to\Web-connectmytask
npm start
```

Opens [http://localhost:3000](http://localhost:3000). Stop each process with **Ctrl+C** in its own terminal.

For **admin panel** access, register a user (or use an existing account) and list its email in `REACT_APP_ADMIN_EMAILS` in `web/.env`.

### Optional — one command (`start:full`)

If you prefer a single script that spawns both processes:

```bash
cd Web-connectmytask
npm run start:full
```

The script looks for the backend at `../backend/server` or `../ConnectMyTask/server`. If it is elsewhere:

```powershell
$env:BACKEND_SERVER_PATH="C:\path\to\ConnectMyTask\server"
npm run start:full
```

If the backend folder is not found, only the React app starts — use the two-terminal flow above.

### Run with Docker (frontend container)

Serves the production build with **Nginx** on port **8080**. The main API must still run separately (backend repo).

```bash
cd Web-connectmytask
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080). Set `REACT_APP_*` in `.env` or see `.env.production.example` before building.

Full details: **[Setup-docker-container-for-website.md](./Setup-docker-container-for-website.md)** (frontend hosting, GitHub Actions CI/CD, Docker runtime).

Manual QA checklist: **[docs/WEB_TEST_CASES.md](./docs/WEB_TEST_CASES.md)**.

---

## Project structure

| Path | Description |
|------|-------------|
| `src/pages/` | Routes: dashboards, auth, tasks, messages, admin |
| `src/store/AuthContext.js` | Auth state — calls backend `:4000` |
| `src/api/client.js` | API helpers and Bearer token |
| `src/ui/` | Shared UI (header, forms, social buttons) |
| `docs/WEB_TEST_CASES.md` | Manual UAT test cases for deployment / QA |
| `Dockerfile`, `nginx.conf`, `docker-compose.yml` | Frontend Docker image (React + Nginx) |
| `.github/workflows/ci.yml` | Frontend CI/CD — tests, GHCR image publish |
| `Setup-docker-container-for-website.md` | Docker setup and run guide |

---

## Common scripts

| Command | Description |
|---------|-------------|
| `npm start` | React dev server at :3000 (start backend in another terminal first) |
| `npm run start:full` | Optional — spawns React (:3000) + backend (:4000) in one terminal when sibling repo exists |
| `npm run build` | Production build in `build/` |
| `npm test` | Run tests |
| `docker compose up --build` | Frontend in Docker at :8080 (see [Setup-docker-container-for-website.md](./Setup-docker-container-for-website.md)) |

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| Sign-up works but no email | `SENDGRID_API_KEY` and verified `SENDGRID_FROM_EMAIL` in **backend** `.env`; restart backend |
| Login says verify email | Open link from email; or use **Resend verification** on login |
| Google login fails | Same `GOOGLE_CLIENT_ID` on web and backend; `http://localhost:3000` in OAuth origins |
| reCAPTCHA errors | Site key in `web/.env`, secret in backend `.env`; `localhost` in reCAPTCHA admin |
| Empty database in Compass | Connection string `mongodb://127.0.0.1:27017/connectMyTask`; click **Refresh** on `users` |
| API errors / CORS | Backend running on :4000; `CORS_ORIGIN=http://localhost:3000` in backend `.env` |
| Only cloned web repo | Also clone [ConnectMyTask](https://github.com/SyncMyTask/ConnectMyTask); run `npm start` in `ConnectMyTask/server` |
| Contact form fails | `SENDGRID_*` and `SUPPORT_EMAIL` in **backend** `.env`; backend on `dev` with `/api/contact` |
| Admin / fraud errors | Backend running; user email in `REACT_APP_ADMIN_EMAILS`; fraud routes on main API |
| Docker API errors | Rebuild image with correct `REACT_APP_API_BASE_URL`; ensure backend is on :4000 |
| GitHub Actions failed deploy | Leave `DEPLOY_VPS_ENABLED` unset until VPS secrets exist — see setup guide |

---

## Required `.env` values

Configure environment files **before** running the app. Use `.env.example` in this repo and the backend `.env.example` as reference (do not commit real `.env` files with secrets).

| File | Purpose |
|------|---------|
| `web/.env` | React app (`src/`) — public `REACT_APP_*` keys only |
| `ConnectMyTask/server/.env` | **Backend API** — auth, tasks, contact, fraud admin, SendGrid, reCAPTCHA secret |

### React app — `web/.env`

See `.env.example` for the full list. Minimum for local dev:

```env
REACT_APP_API_BASE_URL=http://localhost:4000
REACT_APP_GOOGLE_CLIENT_ID=your_google_web_client_id
REACT_APP_FACEBOOK_APP_ID=your_facebook_app_id
REACT_APP_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
REACT_APP_RECAPTCHA_VERIFY_ENABLED=true
REACT_APP_ADMIN_EMAILS=admin1@example.com
PORT=3000
```

### Backend API — `ConnectMyTask/server/.env`

All API features (same as mobile), including contact form and fraud admin. See the backend repo `.env.example`. Minimum for local dev:

```env
MONGO_URI=mongodb://127.0.0.1:27017/connectMyTask
JWT_SECRET=your_secret_here
PORT=4000
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=verified_sender@example.com
SUPPORT_EMAIL=support@example.com
GOOGLE_CLIENT_ID=your_google_web_client_id
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret
RECAPTCHA_SECRET_KEY=your_recaptcha_secret
```

---

## Database

### 1. Install MongoDB and Compass

1. Install [MongoDB Community Server](https://www.mongodb.com/try/download/community) and start the service.
2. Download and install [MongoDB Compass](https://www.mongodb.com/products/tools/compass).

### 2. Connect in Compass

Open Compass → **New connection** → use this URL:

```txt
mongodb://127.0.0.1:27017/connectMyTask
```

Click **Connect**. You should see database **`connectMyTask`** and collections such as `users`, `tasks`, `messages` after you use the app.

Use the same `MONGO_URI` in `ConnectMyTask/server/.env`.

---

## JWT

Use a long random string for local development:

```env
JWT_SECRET=your_secret_here
```

Set in `ConnectMyTask/server/.env` (required for the API).

---

## Google login setup

Used for **Sign in with Google** on `/auth`. The web client ID must match the backend.

1. Open [Google Cloud Console](https://console.cloud.google.com/) → your project.
2. **APIs & Services → OAuth consent screen** — configure app name, support email, and test users (while in Testing).
3. **APIs & Services → Credentials** → **Create credentials** → **OAuth 2.0 Client ID** → type **Web application**.
4. Configure:
   - **Authorized JavaScript origins:** `http://localhost:3000`
   - **Authorized redirect URIs:** add production/staging URLs when you deploy
5. Copy the **Client ID** into:
   - `web/.env` → `REACT_APP_GOOGLE_CLIENT_ID`
   - `ConnectMyTask/server/.env` → `GOOGLE_CLIENT_ID`
6. Restart the backend and the React app.

---

## Facebook login setup

1. Go to [Meta for Developers](https://developers.facebook.com/) → your app → add **Facebook Login** (Web).
2. **Settings → Basic** — copy **App ID** and **App Secret**:
   - `web/.env` → `REACT_APP_FACEBOOK_APP_ID`
   - `ConnectMyTask/server/.env` → `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`
3. **Facebook Login → Settings**:
   - **Allowed Domains for the JavaScript SDK:** `localhost`
   - **Valid OAuth Redirect URIs:** your deployed callbacks (local dev uses the JS SDK from `http://localhost:3000`)
4. Restart the backend and the React app after changing `.env`.

---

## Google reCAPTCHA setup

Protects login and register on the **backend** (v3).

1. [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin) → register a **reCAPTCHA v3** site.
2. Domains: add `localhost` (and production domains later).
3. Copy keys:
   - **Site key** → `web/.env` → `REACT_APP_RECAPTCHA_SITE_KEY`
   - **Secret key** → `ConnectMyTask/server/.env` → `RECAPTCHA_SECRET_KEY`
4. Set `REACT_APP_RECAPTCHA_VERIFY_ENABLED=true` in `web/.env`.
5. Optional on backend: `RECAPTCHA_MIN_SCORE=0.5`
6. Restart the backend and the React app.

Never put the secret key in `web/.env` — only `REACT_APP_*` public values belong in the React env file.

---

## SendGrid setup (sign-up verification email)

Verification and password-reset emails are sent from the **ConnectMyTask backend** (same as mobile).

1. Create an account at [SendGrid](https://sendgrid.com/).
2. Verify a sender (**Settings → Sender Authentication** — single sender or domain).
3. **Settings → API Keys** → create a key with **Mail Send** permission.
4. Add to `ConnectMyTask/server/.env`:

```env
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=verified_sender@example.com
FRONTEND_URL=http://localhost:3000
SUPPORT_EMAIL=support@example.com
```

5. Restart the backend.
6. Test: register on [http://localhost:3000/auth](http://localhost:3000/auth) → check inbox for verify link → open link → log in.

Contact form emails use the same `SENDGRID_*` and `SUPPORT_EMAIL` on the **backend** (`POST /api/contact`).

---

## Related repositories

- **Backend (API + mobile):** [ConnectMyTask](https://github.com/SyncMyTask/ConnectMyTask)
- **Mobile (Flutter):** ConnectMyTask Flutter frontend (same backend)
