import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { api } from '../api/client';
import { updateProfileWithPhoto } from '../api/services';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import BackButton from '../ui/BackButton';
import SiteFooter from '../ui/SiteFooter';

const COUNTRY_OPTIONS = [
  { value: 'Bangladesh', label: 'Bangladesh' },
  { value: 'India', label: 'India' },
  { value: 'Pakistan', label: 'Pakistan' },
];

export default function UserProfile() {
  const { user, initializing, updateProfile, resendVerification } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { show } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [kyc, setKyc] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycStarting, setKycStarting] = useState(false);
  const [tasksSummary, setTasksSummary] = useState({
    total: 0,
    active: 0,
    inProgress: 0,
    completed: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    if ((user.role ?? '').toLowerCase() !== 'user') {
      navigate('/provider/profile', { replace: true });
    }
  }, [initializing, user, navigate]);

  const role = (user?.role ?? '').toLowerCase();
  const profileReady = Boolean(user && role === 'user');
  const userId = user?.id || user?._id || null;

  const rawName = typeof (user?.name) === 'string' ? user.name : '';
  const nameSegments = rawName.trim().split(/\s+/).filter(Boolean);
  const derivedFirst = nameSegments[0] ?? '';
  const derivedLast = nameSegments.length > 1 ? nameSegments.slice(1).join(' ') : '';
  const firstName = (user?.firstName ?? '').trim() || derivedFirst;
  const lastName = (user?.lastName ?? '').trim() || derivedLast;
  const preferredName = (user?.preferredName ?? '').trim();
  const displayName =
    (user?.displayName ?? '').trim() ||
    preferredName ||
    firstName ||
    rawName ||
    user?.email ||
    'Member';

  const initialForm = useMemo(
    () => ({
      firstName,
      lastName,
      preferredName,
      location: typeof user?.location?.country === 'string' ? user.location.country : '',
      about: typeof user?.about === 'string' ? user.about : '',
    }),
    [firstName, lastName, preferredName, user?.location?.country, user?.about]
  );
  const [form, setForm] = useState(initialForm);
  const [photoFile, setPhotoFile] = useState(null);
  const [resendingEmail, setResendingEmail] = useState(false);

  const loadKyc = useCallback(async () => {
    if (!userId) return;
    try {
      setKycLoading(true);
      const data = await api(`/api/kyc/settings/${userId}`);
      setKyc(data?.kyc ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load KYC status';
      show(message, { variant: 'error' });
    } finally {
      setKycLoading(false);
    }
  }, [userId, show]);

  const handleStartKyc = async () => {
    if (!userId) {
      show('Unable to start verification: missing user id', { variant: 'error' });
      return;
    }
    const confirmed = window.confirm(
      'This will open DIDIT verification in a new page. Continue?'
    );
    if (!confirmed) return;
    try {
      setKycStarting(true);
      const data = await api(`/api/kyc/didit/start/${userId}`, { method: 'POST' });
      if (!data?.redirectUrl) throw new Error('Missing DIDIT redirect URL');
      // Keep the app session in the current tab so users don't get "stuck" on the DIDIT page.
      const diditWindow = window.open(data.redirectUrl, '_blank', 'noopener,noreferrer');
      if (!diditWindow) {
        window.location.assign(data.redirectUrl);
      }
      setKycStarting(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start verification';
      show(message, { variant: 'error' });
      setKycStarting(false);
    }
  };

  const handleOpenExistingKyc = () => {
    if (!kyc?.diditWorkflowUrl) {
      show('No active verification link found. Start verification first.', { variant: 'error' });
      return;
    }
    const diditWindow = window.open(kyc.diditWorkflowUrl, '_blank', 'noopener,noreferrer');
    if (!diditWindow) {
      window.location.assign(kyc.diditWorkflowUrl);
    }
  };

  useEffect(() => {
    if (!editing) {
      setForm(initialForm);
      setFormErrors({});
    }
  }, [editing, initialForm]);

  useEffect(() => {
    if (!profileReady) return;
    loadKyc();
  }, [profileReady, loadKyc]);

  useEffect(() => {
    if (!profileReady || !userId) return;
    let cancelled = false;
    (async () => {
      try {
        setSummaryLoading(true);
        const response = await api('/api/tasks');
        const allTasks = Array.isArray(response) ? response : response?.tasks || [];
        const mine = allTasks.filter((task) => {
          const ownerId = task?.user?._id || task?.user?.id || task?.userId || task?.user;
          return String(ownerId) === String(userId);
        });
        const next = {
          total: mine.length,
          active: mine.filter((t) => t.status === 'Active').length,
          inProgress: mine.filter((t) => t.status === 'In Progress').length,
          completed: mine.filter((t) => t.status === 'Completed').length,
        };
        if (!cancelled) setTasksSummary(next);
      } catch {
        if (!cancelled) {
          setTasksSummary({ total: 0, active: 0, inProgress: 0, completed: 0 });
        }
      } finally {
        if (!cancelled) setSummaryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profileReady, userId]);

  useEffect(() => {
    if (!profileReady) return;
    const params = new URLSearchParams(location.search);
    const status = params.get('kyc_status');
    if (!status) return;
    show(`KYC status: ${status}`, { variant: status === 'verified' ? 'success' : 'error' });
    loadKyc();
    const clean = new URLSearchParams(location.search);
    clean.delete('kyc_status');
    const nextSearch = clean.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' },
      { replace: true }
    );
  }, [profileReady, location.pathname, location.search, navigate, show, loadKyc]);

  const handleChange = (key) => (event) => {
    setForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const validate = () => {
    const next = {};
    if (!form.firstName || !form.firstName.trim()) {
      next.firstName = 'First name is required';
    }
    if (!form.lastName || !form.lastName.trim()) {
      next.lastName = 'Last name is required';
    }
    if (!form.location || !form.location.trim()) {
      next.location = 'Country is required';
    }
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;
    try {
      setSaving(true);
      const fullName = [form.firstName, form.lastName].filter(Boolean).join(' ').trim();
      if (photoFile && userId) {
        await updateProfileWithPhoto(userId, {
          name: fullName,
          location: { country: form.location.trim() },
          profilePhotoFile: photoFile,
        });
        setPhotoFile(null);
      }
      await updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        preferredName: form.preferredName.trim(),
        location: form.location.trim(),
        about: form.about.trim(),
      });
      show('Profile updated', { variant: 'success' });
      setEditing(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      show(message, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!profileReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-secondary">
        Loading profile…
      </div>
    );
  }

  const kycStatus = kyc?.status || 'not_started';
  const kycIsVerified = kycStatus === 'verified';
  const kycStarted = kycStatus === 'pending' || kycIsVerified || kycStatus === 'failed';
  const kycStatusText = kycLoading ? 'Loading…' : kycStatus;

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4">
        <header className="rounded-3xl bg-gradient-to-r from-primary to-secondary p-8 text-white shadow-lg">
          <div className="mb-4 flex items-center">
            <BackButton className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white" />
          </div>
          <p className="text-sm uppercase tracking-widest text-white/70">Account profile</p>
          <h1 className="mt-3 text-3xl font-semibold md:text-4xl">{displayName}</h1>
          <p className="mt-2 text-sm text-white/80">
            Manage your account details so providers can contact you and complete your posted tasks smoothly.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-secondary">User details</h2>
              {!editing ? (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-full border border-primary/40 px-4 py-2 text-xs font-medium text-primary transition hover:bg-primary hover:text-white"
                >
                  Edit details
                </button>
              ) : null}
            </div>
            {editing ? (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    name="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={handleChange('firstName')}
                    placeholder="First name"
                    error={formErrors.firstName}
                    required
                    autoComplete="given-name"
                  />
                  <Input
                    name="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={handleChange('lastName')}
                    placeholder="Last name"
                    error={formErrors.lastName}
                    required
                    autoComplete="family-name"
                  />
                </div>
                <Input
                  name="preferredName"
                  type="text"
                  value={form.preferredName}
                  onChange={handleChange('preferredName')}
                  placeholder="Preferred name (optional)"
                  error={formErrors.preferredName}
                  autoComplete="nickname"
                />
                <div className="space-y-1">
                  <label htmlFor="about" className="block text-xs font-semibold text-gray-600">
                    About your requests
                  </label>
                  <textarea
                    id="about"
                    name="about"
                    rows={4}
                    value={form.about}
                    onChange={handleChange('about')}
                    placeholder="Tell providers what kinds of help you usually request."
                    className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-emerald-800 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="location" className="block text-xs font-semibold text-gray-600">
                    Country
                  </label>
                  <select
                    id="location"
                    name="location"
                    value={form.location}
                    onChange={handleChange('location')}
                    className="w-full rounded-lg border border-gray-200 bg-white px-6 py-4 text-sm text-emerald-800 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    <option value="">Select country</option>
                    {COUNTRY_OPTIONS.map((country) => (
                      <option key={country.value} value={country.value}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.location ? <p className="text-sm text-red-600">{formErrors.location}</p> : null}
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-600">Profile photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                    className="w-full text-sm"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setForm(initialForm);
                      setFormErrors({});
                    }}
                    className="rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-800"
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <Button type="submit" className="px-5" disabled={saving}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-start justify-between">
                  <dt className="font-medium text-gray-500">First name</dt>
                  <dd className="text-right text-secondary">{firstName || 'Not provided'}</dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="font-medium text-gray-500">Last name</dt>
                  <dd className="text-right text-secondary">{lastName || 'Not provided'}</dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="font-medium text-gray-500">Preferred name</dt>
                  <dd className="text-right text-secondary">{preferredName || firstName || 'Not provided'}</dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="font-medium text-gray-500">Email</dt>
                  <dd className="text-right text-secondary">{user.email}</dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="font-medium text-gray-500">Country</dt>
                  <dd className="text-right text-secondary">
                    {typeof user.location?.country === 'string' && user.location.country.trim()
                      ? user.location.country
                      : 'Not provided'}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="font-medium text-gray-500">About your requests</dt>
                  <dd className="max-w-[60%] text-right text-secondary">{user.about?.trim() || 'Not provided'}</dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="font-medium text-gray-500">Email verified</dt>
                  <dd className="text-right text-secondary">
                    {user.isVerified ? (
                      'Yes'
                    ) : (
                      <button
                        type="button"
                        disabled={resendingEmail}
                        onClick={async () => {
                          try {
                            setResendingEmail(true);
                            await resendVerification();
                            show('Verification email sent.', { variant: 'success' });
                          } catch (err) {
                            show(err.message || 'Failed to resend', { variant: 'error' });
                          } finally {
                            setResendingEmail(false);
                          }
                        }}
                        className="text-[#F97316] hover:underline disabled:opacity-50"
                      >
                        {resendingEmail ? 'Sending…' : 'Resend verification'}
                      </button>
                    )}
                  </dd>
                </div>
              </dl>
            )}
          </article>

          <article className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-secondary">Task activity</h2>
            <p className="mt-1 text-sm text-gray-500">Overview of your posted tasks.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: 'Total posted', value: tasksSummary.total },
                { label: 'Active', value: tasksSummary.active },
                { label: 'In progress', value: tasksSummary.inProgress },
                { label: 'Completed', value: tasksSummary.completed },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
                  <p className="mt-1 text-xl font-bold text-[#0F172A]">{summaryLoading ? '…' : card.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
              Keep your details current so providers can quote accurately and complete tasks faster.
            </div>
          </article>

        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-secondary">Identity verification</h2>
          <div className="mt-4 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4A1 1 0 114.704 9.29L8 12.586l7.296-7.296a1 1 0 011.408 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-secondary">KYC Status</p>
                <p className={`text-sm font-semibold ${kycIsVerified ? 'text-green-600' : 'text-gray-600'}`}>
                  {kycIsVerified ? 'Verified' : kycStatusText}
                </p>
              </div>
            </div>
          </div>
          {!kycIsVerified ? (
            <div className="mt-4 rounded-2xl border border-gray-100 p-4">
              <h3 className="text-base font-semibold text-secondary">How it works</h3>
              <p className="mt-2 text-sm text-gray-600">
                Complete DIDIT verification to unlock trust-sensitive platform features.
              </p>
              {kyc?.diditWorkflowUrl ? (
                <p className="mt-2 text-xs text-gray-500">
                  If DIDIT shows QR first, use "Open verification link" to resume this session.
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleStartKyc}
                  disabled={kycStarting}
                  className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {kycStarting
                    ? 'Starting…'
                    : kycStarted
                      ? 'Continue verification'
                      : 'Start verification'}
                </button>
                <button
                  type="button"
                  onClick={loadKyc}
                  disabled={kycLoading}
                  className="rounded-full border border-green-300 px-5 py-2.5 text-sm font-semibold text-green-600 transition hover:border-green-400 disabled:opacity-60"
                >
                  {kycLoading ? 'Refreshing…' : 'Refresh status'}
                </button>
                {kyc?.diditWorkflowUrl ? (
                  <button
                    type="button"
                    onClick={handleOpenExistingKyc}
                    className="rounded-full border border-primary/40 px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                  >
                    Open verification link
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>

      </div>
      <SiteFooter />
    </div>
  );
}
