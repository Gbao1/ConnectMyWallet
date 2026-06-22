# SendGrid Email Verification Setup Guide

This guide explains how to set up SendGrid for:

- signup email verification link
- forgot-password reset code emails
- contact form confirmation/notification emails

It matches the current backend/frontend implementation in this repo.

---

## 1) Prerequisites

- A SendGrid account
- A verified sender email or authenticated domain in SendGrid
- Backend running from `server/`
- Frontend running from `web-connectmytask/`

---

## 2) Configure SendGrid

### A. Create API key

In SendGrid dashboard:

1. Go to **Settings -> API Keys**
2. Create API key with **Mail Send** permission
3. Copy the key (starts with `SG.`)

### B. Verify sender identity

In SendGrid dashboard:

1. Go to **Settings -> Sender Authentication**
2. Set up either:
   - **Single Sender Verification** (quick for testing), or
   - **Domain Authentication** (recommended for production)
3. Use that verified email as your `SENDGRID_FROM_EMAIL`

> If sender is not verified, SendGrid will reject outbound messages.

---

## 3) Set backend environment variables

Create/update `server/.env`:

```env
MONGO_URI=...
JWT_SECRET=...
PORT=4000

# Important for email verification links
APP_BASE_URL=http://localhost:3000

# CORS for frontend
CORS_ORIGIN=http://localhost:3000

# SendGrid
SENDGRID_API_KEY=SG.xxxxx
SENDGRID_FROM_EMAIL=verified_sender@example.com
SUPPORT_EMAIL=support@example.com

# Optional (if you use reCAPTCHA checks in auth)
RECAPTCHA_SECRET_KEY=...
RECAPTCHA_MIN_SCORE=0.5
```

Use `server/.env.example` as the template for all supported variables.

---

## 4) Set frontend environment variables

Create/update `web-connectmytask/.env`:

```env
REACT_APP_API_BASE_URL=http://localhost:4000
REACT_APP_RECAPTCHA_SITE_KEY=
REACT_APP_RECAPTCHA_VERIFY_ENABLED=false
REACT_APP_DISABLE_RECAPTCHA=false
REACT_APP_GOOGLE_CLIENT_ID=
REACT_APP_FACEBOOK_APP_ID=
```

Use `web-connectmytask/.env.example` as the template.

---

## 5) Install dependencies

Backend dependency used:

- `@sendgrid/mail`

Install in `server/`:

```bash
npm install
```

---

## 6) Start services

In two terminals:

```bash
# terminal 1
cd server
npm start
```

```bash
# terminal 2
cd web-connectmytask
npm start
```

---

## 7) Verify each email feature

## A) Signup verification link

1. Register a new account
2. Check inbox for "Verify your ConnectMyTask account"
3. Click link to `/verify-email?token=...`
4. Expect success message and then login should work

Backend endpoint:

- `GET /api/auth/verify-email?token=...`

---

## B) Forgot/reset password

1. Go to **Forgot Password** page
2. Enter email and request code
3. Receive 6-digit reset code by email
4. Submit email + code + new password
5. Login with updated password

Backend endpoints:

- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

---

## C) Contact form emails

Submitting contact form triggers:

- confirmation email to submitter
- notification email to `SUPPORT_EMAIL`

Backend route:

- `POST /api/contact`

---

## 8) Common issues and fixes

## "Invalid or expired verification link"

- Link already used, expired, or token mismatch
- Request resend endpoint to generate a new link:
  - `POST /api/auth/resend-verification`
  - body: `{ "email": "user@example.com" }`

## Stuck on "Verifying your email..."

- Usually frontend API base mismatch
- Ensure `REACT_APP_API_BASE_URL=http://localhost:4000` (or your deployed API)
- Restart frontend after `.env` changes

## 400/401/403 during auth

- Check backend terminal logs for exact error
- Verify `JWT_SECRET`, `MONGO_URI`, and SendGrid vars are loaded

## Emails not arriving

- Check Spam/Junk
- Verify sender identity in SendGrid
- Check SendGrid Activity Feed and suppression/bounce lists

---

## 9) Security checklist

- Never commit real `.env` secrets
- Keep `.env` local only
- Commit only `.env.example` placeholders
- Rotate exposed API keys immediately
- Prefer domain authentication over single sender for production

---

## 10) Production notes

- Set:
  - `APP_BASE_URL=https://your-frontend-domain`
  - `CORS_ORIGIN=https://your-frontend-domain`
  - `REACT_APP_API_BASE_URL=https://your-api-domain`
- Use a production-verified sender/domain in SendGrid
- Rotate dev/test keys before go-live

