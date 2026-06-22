import { RECAPTCHA_SITE_KEY, RECAPTCHA_VERIFY_ENABLED } from '../config';

function loadRecaptchaScript(siteKey) {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.grecaptcha?.execute) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-recaptcha-v3]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    s.async = true;
    s.defer = true;
    s.dataset.recaptchaV3 = '1';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load reCAPTCHA'));
    document.head.appendChild(s);
  });
}

/**
 * Executes Google reCAPTCHA v3 and returns a token for server verification.
 */
export async function executeRecaptcha(siteKey, action) {
  await loadRecaptchaScript(siteKey);
  return new Promise((resolve, reject) => {
    window.grecaptcha.ready(async () => {
      try {
        const token = await window.grecaptcha.execute(siteKey, { action });
        resolve(token);
      } catch (e) {
        reject(e instanceof Error ? e : new Error('reCAPTCHA execution failed'));
      }
    });
  });
}

/** Returns a reCAPTCHA v3 token for the ConnectMyTask backend (recaptchaToken field). */
export async function getRecaptchaToken(action) {
  if (process.env.REACT_APP_DISABLE_RECAPTCHA === 'true') return undefined;
  if (!RECAPTCHA_VERIFY_ENABLED || !RECAPTCHA_SITE_KEY) return undefined;
  return executeRecaptcha(RECAPTCHA_SITE_KEY, action);
}

/**
 * Ensures reCAPTCHA can run before auth; backend validates recaptchaToken on each route.
 */
export async function assertRecaptchaBeforeAuth(action) {
  if (process.env.REACT_APP_DISABLE_RECAPTCHA === 'true') return;
  if (!RECAPTCHA_VERIFY_ENABLED) return;
  if (!RECAPTCHA_SITE_KEY) {
    throw new Error('reCAPTCHA is not configured');
  }
  await executeRecaptcha(RECAPTCHA_SITE_KEY, action);
}
