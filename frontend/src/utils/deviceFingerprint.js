import { api } from '../api/client';

const STORAGE_KEY = 'cmt_device_fingerprint';

/** Stable browser id for backend device-fingerprint sync. */
export function getDeviceFingerprintId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? `web_${crypto.randomUUID()}`
          : `web_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `web_session_${Date.now()}`;
  }
}

/** POST /api/auth/device-fingerprint — best-effort after login. */
export async function syncDeviceFingerprint() {
  try {
    await api('/api/auth/device-fingerprint', {
      method: 'POST',
      body: JSON.stringify({
        deviceFingerprint: getDeviceFingerprintId(),
        platform: 'web',
        deviceSource: `web-${navigator.platform || 'unknown'}`,
      }),
    });
  } catch {
    /* non-blocking */
  }
}
