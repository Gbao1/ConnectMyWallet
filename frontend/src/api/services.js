import { api, apiForm } from './client';
import { getRecaptchaToken } from '../utils/recaptcha';

// ——— Locations ———
export async function fetchLocations() {
  return api('/api/locations');
}

// ——— Messages ———
export async function fetchChatSummaries() {
  return api('/api/messages/summary/me');
}

export async function fetchMessagesWithUser(otherUserId) {
  return api(`/api/messages/${otherUserId}`);
}

export async function sendMessage({ receiverId, text, imageFile }) {
  const formData = new FormData();
  formData.append('receiver', receiverId);
  if (text?.trim()) formData.append('text', text.trim());
  if (imageFile) formData.append('image', imageFile);
  const recaptchaToken = await getRecaptchaToken('message');
  if (recaptchaToken) formData.append('recaptchaToken', recaptchaToken);
  return apiForm('/api/messages', formData, { method: 'POST' });
}

// ——— Tasks (comments & detail) ———
export async function fetchTaskData(taskId) {
  return api(`/api/tasks/${taskId}/data`);
}

export async function postTaskComment(taskId, text) {
  const recaptchaToken = await getRecaptchaToken('comment');
  return api(`/api/tasks/${taskId}/comment`, {
    method: 'POST',
    body: JSON.stringify({ text, ...(recaptchaToken ? { recaptchaToken } : {}) }),
  });
}

export async function postCommentReply(taskId, commentId, text) {
  const recaptchaToken = await getRecaptchaToken('reply');
  return api(`/api/tasks/${taskId}/comment/${commentId}/reply`, {
    method: 'POST',
    body: JSON.stringify({ text, ...(recaptchaToken ? { recaptchaToken } : {}) }),
  });
}

// ——— Auth extras ———
export async function resendVerificationEmail() {
  return api('/api/auth/resend-verification', { method: 'POST', body: '{}' });
}

export async function updateProfileWithPhoto(userId, { name, skills, location, profilePhotoFile }) {
  const formData = new FormData();
  if (name) formData.append('name', name);
  if (skills != null) formData.append('skills', Array.isArray(skills) ? skills.join(',') : skills);
  if (location) formData.append('location', JSON.stringify(location));
  if (profilePhotoFile) formData.append('profilePhoto', profilePhotoFile);
  return apiForm(`/api/auth/profile/${userId}`, formData, { method: 'PUT' });
}

// ——— Browse helpers (no dedicated public list on backend) ———
export async function fetchBrowseProviders() {
  const tasks = await api('/api/tasks/alltasks/web');
  const items = Array.isArray(tasks) ? tasks : [];
  const providerIds = new Set();
  items.forEach((task) => {
    (task.bids || []).forEach((bid) => {
      const id = bid.provider?._id || bid.provider;
      if (id) providerIds.add(String(id));
    });
    const assigned = task.assignedProvider?._id || task.assignedProvider;
    if (assigned) providerIds.add(String(assigned));
  });
  const ids = [...providerIds].slice(0, 40);
  const profiles = await Promise.all(
    ids.map((id) => api(`/api/auth/profile/${id}`).catch(() => null))
  );
  return profiles
    .filter((p) => p && (p.role === 'provider' || !p.role))
    .map((p) => ({
      ...p,
      id: p._id || p.id,
      providers: true,
    }));
}

export async function fetchActivePostedTasks(limit = 20) {
  const tasks = await api('/api/tasks/alltasks/web');
  const items = (Array.isArray(tasks) ? tasks : []).filter((t) => t.status === 'Active');
  items.sort((a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0));
  return { tasks: items.slice(0, limit) };
}

// ——— Admin ———
export const adminApi = {
  users: () => api('/api/admin/users'),
  providers: () => api('/api/admin/providers'),
  user: (id) => api(`/api/admin/users/${id}`),
  deleteUser: (id) => api(`/api/admin/user/${id}`, { method: 'DELETE' }),
  verifyUser: (id) => api(`/api/admin/users/${id}/verify`, { method: 'PUT', body: '{}' }),
  changeRole: (id, role) =>
    api(`/api/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  tasks: () => api('/api/admin/tasks'),
  deleteTask: (id) => api(`/api/admin/task/${id}`, { method: 'DELETE' }),
  flaggedAccounts: () => api('/api/admin/fraud/flagged-accounts'),
  deviceNetwork: (minShared = 2) =>
    api(`/api/admin/fraud/device-network?minSharedAccounts=${minShared}`),
  flaggedReviews: () => api('/api/admin/reviews/flagged'),
};

// ——— Payments ———
export function paymentPspForCurrency(currency) {
  const c = String(currency || 'BDT').toUpperCase();
  if (c === 'PKR') return 'payfast';
  return 'sslcommerz';
}

export async function initiateTaskPayment({ taskId, amount, currency }) {
  const psp = paymentPspForCurrency(currency);
  return api(`/api/payments/${psp}/initiate`, {
    method: 'POST',
    body: JSON.stringify({ taskId, amount, currency: psp === 'payfast' ? 'PKR' : currency || 'BDT' }),
  });
}
