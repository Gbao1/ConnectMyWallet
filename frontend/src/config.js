const envApiBase = process.env.REACT_APP_API_BASE_URL;
const isLocalHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL =
  envApiBase ?? (isLocalHost ? 'http://localhost:4000' : 'https://api.connectmytask.xyz');

/** Google reCAPTCHA v3 site key (public). Pair with RECAPTCHA_SECRET_KEY on the server. */
export const RECAPTCHA_SITE_KEY = process.env.REACT_APP_RECAPTCHA_SITE_KEY ?? '';

/** When true, login/register call POST /api/recaptcha/verify on API_BASE_URL before Firebase auth. */
export const RECAPTCHA_VERIFY_ENABLED =
  process.env.REACT_APP_RECAPTCHA_VERIFY_ENABLED === 'true';

export const GOOGLE_CLIENT_ID =
  process.env.REACT_APP_GOOGLE_CLIENT_ID ??
  '118111555714-ijc1akqrl4u300732il86njehvom476v.apps.googleusercontent.com';

export const FACEBOOK_APP_ID = process.env.REACT_APP_FACEBOOK_APP_ID ?? '';
