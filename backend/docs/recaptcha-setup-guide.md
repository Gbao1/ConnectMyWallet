# reCAPTCHA v3 setup guide (ConnectMyTask)

This project uses **Google reCAPTCHA v3** on **email/password signup and login**. The browser runs reCAPTCHA, then the **backend** verifies the token with Google and applies **rate limiting** on the verify endpoint.

---

## 1. Create keys in Google reCAPTCHA Admin

1. Open [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin).
2. Register a new site (or use an existing one).
3. Choose **reCAPTCHA v3**.
4. Under **Domains**, add every host that will load your React app, for example:
   - `localhost`
   - Your production domain (e.g. `connectmytask.xyz`, `www.connectmytask.xyz`)
5. Accept the terms and submit.
6. Copy:
   - **Site key** (public — used in the React app)
   - **Secret key** (private — used only on the server; never commit it to git)

> **Important:** The site key and secret key are a **matched pair** from the **same** reCAPTCHA registration. Mixing keys from different sites will fail verification.

---

## 2. Frontend (Create React App) — `web-connectmytask`

Edit **`web-connectmytask/.env`** (create it from `env.example` if needed):

| Variable | Purpose |
|----------|---------|
| `REACT_APP_RECAPTCHA_SITE_KEY` | Public site key from reCAPTCHA Admin |
| `REACT_APP_RECAPTCHA_VERIFY_ENABLED` | Set to `true` to enforce reCAPTCHA before login/register |
| `REACT_APP_API_BASE_URL` | Base URL of your API (no trailing `/api` path), e.g. `http://localhost:4000` |

Example:

```env
REACT_APP_API_BASE_URL=http://localhost:4000
REACT_APP_RECAPTCHA_SITE_KEY=your_site_key_here
REACT_APP_RECAPTCHA_VERIFY_ENABLED=true
```

Optional for local debugging only:

```env
REACT_APP_DISABLE_RECAPTCHA=true
```

After any `.env` change, **restart** the dev server (`npm start`).

### Copy/paste checklist (site key)

reCAPTCHA keys are **case-sensitive**. Common mistakes:

- Letter **I** vs lowercase **l** (e.g. `AIwI` mis-typed as `Alwl`)
- Letter **O** vs digit **0**

Always **paste** the site key from reCAPTCHA Admin instead of retyping it.

---

## 3. Backend (Express) — `server`

Edit **`server/.env`** (never commit real secrets; use `server/env.example` as a template):

| Variable | Purpose |
|----------|---------|
| `RECAPTCHA_SECRET_KEY` | Secret key from reCAPTCHA Admin |
| `RECAPTCHA_MIN_SCORE` | Optional. Minimum score to accept (default `0.5` if unset). Lower scores are treated as suspicious. |
| `CORS_ORIGIN` | Must include your React origin, e.g. `http://localhost:3000` |

Rate limits for verify (optional overrides):

| Variable | Typical default (see `server/index.js`) |
|----------|----------------------------------------|
| `RATE_LIMIT_VERIFY_WINDOW_MS` | e.g. 15 minutes |
| `RATE_LIMIT_VERIFY_MAX` | Max verify requests per window per IP |

Restart the API after changing `.env`.

---

## 4. How the flow works

1. User submits **signup** or **login**.
2. `AuthContext` calls `assertRecaptchaBeforeAuth('register' | 'login')` in `web-connectmytask/src/utils/recaptcha.js`.
3. The app loads `https://www.google.com/recaptcha/api.js?render=<SITE_KEY>`, runs `grecaptcha.execute`, and receives a **token**.
4. The app sends `POST {REACT_APP_API_BASE_URL}/api/recaptcha/verify` with `{ token, action }`.
5. The server calls Google’s **siteverify** API with `RECAPTCHA_SECRET_KEY`, checks **success**, optional **action** match, and **score** vs `RECAPTCHA_MIN_SCORE`.
6. If verification passes, login/register continues; otherwise the user sees an error.

---

## 5. Troubleshooting

| Symptom | What to check |
|---------|----------------|
| **Invalid site key or not loaded in api.js** | Site key in `REACT_APP_RECAPTCHA_SITE_KEY` must match Admin **exactly**. Add `localhost` (and your domain) under reCAPTCHA **Domains**. Restart React after `.env` changes. |
| **reCAPTCHA verification failed (invalid-input-secret)** | `RECAPTCHA_SECRET_KEY` wrong or from a different reCAPTCHA site than the site key. |
| **Token expired / invalid-input-response** | Token is single-use and short-lived; retry. Also ensure site key + secret are a **pair**. |
| **Request blocked (suspicious activity)** | Score below `RECAPTCHA_MIN_SCORE`. Adjust threshold carefully (higher = stricter). |
| **CORS errors** | `CORS_ORIGIN` on the server must include the exact origin of the React app (scheme + host + port). |

---

## 6. Tests

- **Backend:** `cd server && npm test -- --runTestsByPath __tests__/recaptcha.test.js`
- **Frontend (reCAPTCHA helpers):** `cd web-connectmytask && npm test -- --watch=false --runTestsByPath src/utils/recaptcha.test.js`

---

## 7. Security reminders

- Do **not** commit `server/.env` or `web-connectmytask/.env` with real secrets.
- The **secret key** must only exist on the server.
- Rotate keys in reCAPTCHA Admin if a secret is ever exposed.
