/** Prefer registered name over full email in header/dashboard. */
export function getDisplayName(user, fallback = 'Member') {
  if (!user) return fallback;

  const preferred = (user.preferredName ?? '').trim();
  const first = (user.firstName ?? '').trim();
  const last = (user.lastName ?? '').trim();
  const full = (user.name ?? '').trim();
  const fromApi = (user.displayName ?? '').trim();

  if (fromApi && !fromApi.includes('@')) return fromApi;
  if (preferred) return preferred;
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (full && !full.includes('@')) return full.split(/\s+/)[0];

  const email = (user.email ?? '').trim();
  if (email) return email.split('@')[0];

  return fallback;
}
