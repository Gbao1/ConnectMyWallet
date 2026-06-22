import { API_BASE_URL } from '../config';

const TOKEN_KEY = 'cmt_auth_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function resolveBase(baseUrl) {
  return String(baseUrl || API_BASE_URL).replace(/\/$/, '');
}

/**
 * JSON API helper; sends Bearer token when present.
 */
export async function apiAt(baseUrl, path, options = {}) {
  const base = resolveBase(baseUrl);
  const headers = { ...options.headers };
  if (!headers['Content-Type'] && options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.msg || data.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data.code;
    err.data = data;
    throw err;
  }
  return data;
}

/**
 * Default API helper using API_BASE_URL.
 */
export async function api(path, options = {}) {
  return apiAt(API_BASE_URL, path, options);
}

/** Multipart uploads (profile photo, messages, task images). */
export async function apiForm(path, formData, options = {}) {
  const base = resolveBase(API_BASE_URL);
  const headers = { ...(options.headers || {}) };
  const token = getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method: options.method || 'POST',
    ...options,
    headers,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.msg || data.message || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = data.code;
    err.data = data;
    throw err;
  }
  return data;
}
