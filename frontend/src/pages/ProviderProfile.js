import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import BackButton from '../ui/BackButton';
import SiteFooter from '../ui/SiteFooter';
import { api } from '../api/client';
import TrustScoreBadge from '../ui/TrustScoreBadge';

const SPECIALIZATION_OPTIONS = [
  { value: 'home_services', label: 'Home Services' },
  { value: 'digital_tech', label: 'Digital & Tech' },
  { value: 'moving_delivery', label: 'Moving & Delivery' },
  { value: 'events_photo', label: 'Events & Photo' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'handyman', label: 'Handyman' },
  { value: 'gardening', label: 'Gardening' },
  { value: 'tutoring', label: 'Tutoring' },
  { value: 'other', label: 'Other' },
];

const COUNTRY_OPTIONS = [
  { value: 'Bangladesh', label: 'Bangladesh', currency: 'BDT' },
  { value: 'India', label: 'India', currency: 'INR' },
  { value: 'Pakistan', label: 'Pakistan', currency: 'PKR' },
];

export default function ProviderProfile() {
  const { t } = useTranslation();
  const { user, initializing, updateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { show } = useToast();
  const [editingDetails, setEditingDetails] = useState(false);
  const [editingJob, setEditingJob] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [trust, setTrust] = useState(null);
  const [reviewsData, setReviewsData] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [kycLoading, setKycLoading] = useState(false);
  const [kycStarting, setKycStarting] = useState(false);

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    if ((user.role ?? '').toLowerCase() !== 'provider') {
      navigate('/dashboard', { replace: true });
    }
  }, [initializing, user, navigate]);

  const role = (user?.role ?? '').toLowerCase();
  const profileReady = Boolean(user && role === 'provider');
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
    'Job provider';

  const initialForm = useMemo(
    () => ({
      firstName,
      lastName,
      preferredName,
      specialization: user?.specialization || 'other',
      hourlyRate: user?.hourlyRate != null ? String(user.hourlyRate) : '',
      location: typeof user?.location?.country === 'string' ? user.location.country : '',
      about: typeof user?.about === 'string' ? user.about : '',
    }),
    [firstName, lastName, preferredName, user?.specialization, user?.hourlyRate, user?.location?.country, user?.about]
  );
  const [form, setForm] = useState(initialForm);

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
    if (!editingDetails && !editingJob && !editingAbout) {
      setForm(initialForm);
      setFormErrors({});
    }
  }, [editingDetails, editingJob, editingAbout, initialForm]);

  useEffect(() => {
    if (!profileReady) return;
    loadKyc();
  }, [profileReady, loadKyc]);

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

  const validateDetails = () => {
    const next = {};
    if (!form.firstName || !form.firstName.trim()) {
      next.firstName = 'First name is required';
    }
    if (!form.lastName || !form.lastName.trim()) {
      next.lastName = 'Last name is required';
    }
    if (!form.location || !form.location.trim()) {
      next.location = 'Location is required';
    }
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const validateJob = () => {
    const next = {};
    if (!form.specialization) {
      next.specialization = 'Specialization is required';
    }
    if (!form.hourlyRate || Number(form.hourlyRate) < 0) {
      next.hourlyRate = 'Hourly rate must be 0 or higher';
    }
    setFormErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmitDetails = async (event) => {
    event.preventDefault();
    if (!validateDetails()) return;
    try {
      setSaving(true);
      await updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        preferredName: form.preferredName.trim(),
        location: form.location.trim(),
      });
      show('Profile updated', { variant: 'success' });
      setEditingDetails(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      show(message, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitJob = async (event) => {
    event.preventDefault();
    if (!validateJob()) return;
    try {
      setSaving(true);
      await updateProfile({
        specialization: form.specialization,
        hourlyRate: Number(form.hourlyRate),
      });
      show('Job specifics updated', { variant: 'success' });
      setEditingJob(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update job specifics';
      show(message, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitAbout = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      await updateProfile({
        about: form.about.trim(),
      });
      show('About updated', { variant: 'success' });
      setEditingAbout(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update about';
      show(message, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const providerReviews = await api(`/api/reviews/provider/${user.id}`);
        if (!cancelled) {
          setTrust({
            trustScore: providerReviews.trustScore,
            averageRating: providerReviews.averageRating,
            totalReviews: providerReviews.totalReviews,
          });
          setReviewsData(providerReviews);
        }
      } catch {
        if (!cancelled) {
          setTrust(null);
          setReviewsData(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!profileReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-secondary">
        {t('common.loading', { defaultValue: 'Loading profile…' })}
      </div>
    );
  }

  const kycStatus = kyc?.status || 'not_started';
  const kycIsVerified = kycStatus === 'verified';
  const kycStarted = kycStatus === 'pending' || kycIsVerified || kycStatus === 'failed';
  const kycStatusText = kycLoading ? 'Loading…' : kycStatus;
  const currentCurrency =
    COUNTRY_OPTIONS.find((c) => c.value === form.location)?.currency ||
    COUNTRY_OPTIONS.find((c) => c.value === (user.location?.country || ''))?.currency ||
    'USD';
  const specializationLabel =
    SPECIALIZATION_OPTIONS.find((opt) => opt.value === (user.specialization || 'other'))?.label || t('common.other', { defaultValue: 'Other' });
  const publicSkills = Array.isArray(user.skills) && user.skills.length > 0
    ? user.skills
    : [specializationLabel];
  const averageRating = Number(reviewsData?.averageRating || 0);
  const totalReviews = Number(reviewsData?.totalReviews || 0);
  const recentReviews = Array.isArray(reviewsData?.reviews) ? reviewsData.reviews.slice(0, 5) : [];
  const renderStars = (value) => {
    const rounded = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
    return '★★★★★'.slice(0, rounded) + '☆☆☆☆☆'.slice(0, 5 - rounded);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4">
        <header className="rounded-3xl bg-gradient-to-r from-secondary to-primary p-8 text-white shadow-lg">
          <div className="mb-4 flex items-center">
            <BackButton className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white" />
          </div>
          <p className="text-sm uppercase tracking-widest text-white/70">{t('providerProfile.title', { defaultValue: 'Job provider profile' })}</p>
          <h1 className="mt-3 text-3xl font-semibold md:text-4xl">{displayName}</h1>
          <p className="mt-2 text-sm text-white/80">
            {t('providerProfile.subtitle', { defaultValue: 'Keep your business information current so professionals know who they are working with and how to reach you.' })}
          </p>
          <div className="mt-4">
            <TrustScoreBadge score={trust?.trust?.score || 0} />
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-secondary">{t('providerProfile.userDetails', { defaultValue: 'User details' })}</h2>
              {!editingDetails ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingDetails(true);
                    setFormErrors({});
                  }}
                  className="rounded-full border border-primary/40 px-4 py-2 text-xs font-medium text-primary transition hover:bg-primary hover:text-white"
                >
                  {t('providerProfile.editDetails', { defaultValue: 'Edit details' })}
                </button>
              ) : null}
            </div>
            {editingDetails ? (
              <form onSubmit={handleSubmitDetails} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label={t('providerProfile.firstName', { defaultValue: 'First name' })}
                    name="firstName"
                    type="text"
                    value={form.firstName}
                    onChange={handleChange('firstName')}
                    placeholder={t('providerProfile.firstName', { defaultValue: 'First name' })}
                    error={formErrors.firstName}
                    required
                    autoComplete="given-name"
                  />
                  <Input
                    label={t('providerProfile.lastName', { defaultValue: 'Last name' })}
                    name="lastName"
                    type="text"
                    value={form.lastName}
                    onChange={handleChange('lastName')}
                    placeholder={t('providerProfile.lastName', { defaultValue: 'Last name' })}
                    error={formErrors.lastName}
                    required
                    autoComplete="family-name"
                  />
                </div>
                <Input
                  label={t('providerProfile.preferredName', { defaultValue: 'Preferred name' })}
                  name="preferredName"
                  type="text"
                  value={form.preferredName}
                  onChange={handleChange('preferredName')}
                  placeholder={t('providerProfile.preferredNameOptional', { defaultValue: 'Preferred name (optional)' })}
                  error={formErrors.preferredName}
                  autoComplete="nickname"
                />
                <div className="space-y-1">
                  <label htmlFor="location" className="block text-xs font-semibold text-gray-600">
                    {t('providerProfile.country', { defaultValue: 'Country' })}
                  </label>
                  <select
                    id="location"
                    name="location"
                    value={form.location}
                    onChange={handleChange('location')}
                    className="w-full rounded-lg bg-white border border-gray-200 px-6 py-4 text-sm text-emerald-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-colors"
                  >
                    <option value="">{t('providerProfile.selectCountry', { defaultValue: 'Select country' })}</option>
                    {COUNTRY_OPTIONS.map((country) => (
                      <option key={country.value} value={country.value}>
                        {country.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.location ? (
                    <p className="text-sm text-red-600">{formErrors.location}</p>
                  ) : null}
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDetails(false);
                      setForm(initialForm);
                      setFormErrors({});
                    }}
                    className="rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-800"
                    disabled={saving}
                  >
                    {t('common.cancel', { defaultValue: 'Cancel' })}
                  </button>
                  <Button type="submit" className="px-5" disabled={saving}>
                    {saving ? t('common.saving', { defaultValue: 'Saving…' }) : t('common.saveChanges', { defaultValue: 'Save changes' })}
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-start justify-between">
                  <dt className="font-medium text-gray-500">{t('providerProfile.firstName', { defaultValue: 'First name' })}</dt>
                  <dd className="text-right text-secondary">{firstName || t('common.notProvided', { defaultValue: 'Not provided' })}</dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="font-medium text-gray-500">{t('providerProfile.lastName', { defaultValue: 'Last name' })}</dt>
                  <dd className="text-right text-secondary">{lastName || t('common.notProvided', { defaultValue: 'Not provided' })}</dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="font-medium text-gray-500">{t('providerProfile.preferredName', { defaultValue: 'Preferred name' })}</dt>
                  <dd className="text-right text-secondary">{preferredName || firstName || t('common.notProvided', { defaultValue: 'Not provided' })}</dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="font-medium text-gray-500">{t('providerProfile.email', { defaultValue: 'Email' })}</dt>
                  <dd className="text-right text-secondary">{user.email}</dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="font-medium text-gray-500">{t('providerProfile.location', { defaultValue: 'Location' })}</dt>
                  <dd className="text-right text-secondary">
                    {typeof user.location?.country === 'string' && user.location.country.trim()
                      ? user.location.country
                      : t('common.notProvided', { defaultValue: 'Not provided' })}
                  </dd>
                </div>
              </dl>
            )}
          </article>

          <article className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-secondary">{t('providerProfile.jobSpecifics', { defaultValue: 'Job specifics' })}</h2>
              {!editingJob ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditingJob(true);
                    setFormErrors({});
                  }}
                  className="rounded-full border border-primary/40 px-4 py-2 text-xs font-medium text-primary transition hover:bg-primary hover:text-white"
                >
                  {t('providerProfile.editJobSpecifics', { defaultValue: 'Edit job specifics' })}
                </button>
              ) : null}
            </div>
            {editingJob ? (
              <form onSubmit={handleSubmitJob} className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="specialization" className="block text-xs font-semibold text-gray-600">
                      {t('providerProfile.specialization', { defaultValue: 'Specialization' })}
                    </label>
                    <select
                      id="specialization"
                      name="specialization"
                      value={form.specialization}
                      onChange={handleChange('specialization')}
                      className="w-full rounded-lg bg-white border border-gray-200 px-6 py-4 text-sm text-emerald-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-colors"
                    >
                      {SPECIALIZATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {formErrors.specialization ? (
                      <p className="text-sm text-red-600">{formErrors.specialization}</p>
                    ) : null}
                  </div>
                  <Input
                    label={t('providerProfile.hourlyRateCurrency', { currency: currentCurrency, defaultValue: `Hourly rate (${currentCurrency})` })}
                    name="hourlyRate"
                    type="number"
                    value={form.hourlyRate}
                    onChange={handleChange('hourlyRate')}
                    placeholder={t('providerProfile.enterAmount', { defaultValue: 'Enter amount' })}
                    error={formErrors.hourlyRate}
                  />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingJob(false);
                      setForm(initialForm);
                      setFormErrors({});
                    }}
                    className="rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-800"
                    disabled={saving}
                  >
                    {t('common.cancel', { defaultValue: 'Cancel' })}
                  </button>
                  <Button type="submit" className="px-5" disabled={saving}>
                    {saving ? t('common.saving', { defaultValue: 'Saving…' }) : t('common.saveChanges', { defaultValue: 'Save changes' })}
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-start justify-between">
                  <dt className="font-medium text-gray-500">{t('providerProfile.specialization', { defaultValue: 'Specialization' })}</dt>
                  <dd className="text-right text-secondary">
                    {SPECIALIZATION_OPTIONS.find((opt) => opt.value === (user.specialization || 'other'))?.label || 'Other'}
                  </dd>
                </div>
                <div className="flex items-start justify-between">
                  <dt className="font-medium text-gray-500">{t('providerProfile.hourlyRate', { defaultValue: 'Hourly rate' })}</dt>
                  <dd className="text-right text-secondary">
                    {user.hourlyRate != null ? `${user.hourlyRate} ${currentCurrency}` : t('common.notProvided', { defaultValue: 'Not provided' })}
                  </dd>
                </div>
              </dl>
            )}
          </article>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-secondary">{t('providerProfile.about', { defaultValue: 'About' })}</h2>
            {!editingAbout ? (
              <button
                type="button"
                onClick={() => {
                  setEditingAbout(true);
                  setFormErrors({});
                }}
                className="rounded-full border border-primary/40 px-4 py-2 text-xs font-medium text-primary transition hover:bg-primary hover:text-white"
              >
                {t('providerProfile.editAbout', { defaultValue: 'Edit about' })}
              </button>
            ) : null}
          </div>
          {editingAbout ? (
            <form onSubmit={handleSubmitAbout} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label htmlFor="about" className="block text-xs font-semibold text-gray-600">
                  {t('providerProfile.publicBio', { defaultValue: 'Public bio' })}
                </label>
                <textarea
                  id="about"
                  name="about"
                  rows={5}
                  value={form.about}
                  onChange={handleChange('about')}
                  placeholder={t('providerProfile.publicBioPlaceholder', { defaultValue: 'Describe your experience, service style, and what clients can expect.' })}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-emerald-800 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingAbout(false);
                    setForm(initialForm);
                    setFormErrors({});
                  }}
                  className="rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-400 hover:text-gray-800"
                  disabled={saving}
                >
                  {t('common.cancel', { defaultValue: 'Cancel' })}
                </button>
                <Button type="submit" className="px-5" disabled={saving}>
                  {saving ? t('common.saving', { defaultValue: 'Saving…' }) : t('common.saveChanges', { defaultValue: 'Save changes' })}
                </Button>
              </div>
            </form>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-gray-600">
              {user.about?.trim() || t('providerProfile.noAbout', { defaultValue: 'No about description added yet.' })}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-secondary">{t('providerProfile.publicPreview', { defaultValue: 'Public profile preview' })}</h2>
          <p className="mt-1 text-sm text-gray-500">
            {t('providerProfile.publicPreviewSub', { defaultValue: 'This is how your core profile details appear to other users browsing providers.' })}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('providerProfile.displayedName', { defaultValue: 'Displayed name' })}</p>
              <p className="mt-1 text-sm font-semibold text-secondary">{displayName}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('providerProfile.location', { defaultValue: 'Location' })}</p>
              <p className="mt-1 text-sm font-semibold text-secondary">{user.location?.country || t('common.notProvided', { defaultValue: 'Not provided' })}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('providerProfile.specialization', { defaultValue: 'Specialization' })}</p>
              <p className="mt-1 text-sm font-semibold text-secondary">{specializationLabel}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('providerProfile.hourlyRate', { defaultValue: 'Hourly rate' })}</p>
              <p className="mt-1 text-sm font-semibold text-secondary">
                {user.hourlyRate != null ? `${user.hourlyRate} ${currentCurrency}/hr` : t('common.notProvided', { defaultValue: 'Not provided' })}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('providerProfile.skillsShown', { defaultValue: 'Skills shown publicly' })}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {publicSkills.map((skill) => (
                <span key={skill} className="rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-medium text-[#F97316]">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-secondary">{t('providerProfile.ratingsReviews', { defaultValue: 'Ratings & reviews' })}</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('providerProfile.averageRating', { defaultValue: 'Average rating' })}</p>
              <p className="mt-1 text-xl font-semibold text-secondary">{averageRating.toFixed(1)} / 5</p>
              <p className="mt-1 text-sm text-amber-500">{renderStars(averageRating)}</p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('providerProfile.totalReviews', { defaultValue: 'Total reviews' })}</p>
              <p className="mt-1 text-xl font-semibold text-secondary">{totalReviews}</p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {recentReviews.length === 0 ? (
              <p className="text-sm text-gray-500">{t('providerProfile.noReviews', { defaultValue: 'No reviews yet.' })}</p>
            ) : (
              recentReviews.map((review) => (
                <div key={review?._id || `${review?.createdAt}-${review?.reviewer?._id || ''}`} className="rounded-xl border border-gray-100 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-secondary">{review?.reviewer?.name || t('common.user', { defaultValue: 'User' })}</p>
                    <p className="text-xs text-amber-500">{renderStars(review?.overallRating || review?.rating || 0)}</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">{review?.comment?.trim() || t('providerProfile.noComment', { defaultValue: 'No comment provided.' })}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-secondary">{t('providerProfile.identityVerification', { defaultValue: 'Identity verification' })}</h2>
          <div className="mt-4 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.704 5.29a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4A1 1 0 114.704 9.29L8 12.586l7.296-7.296a1 1 0 011.408 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-secondary">{t('providerProfile.kycStatus', { defaultValue: 'KYC Status' })}</p>
                <p className={`text-sm font-semibold ${kycIsVerified ? 'text-green-600' : 'text-gray-600'}`}>
                  {kycIsVerified ? t('common.verified', { defaultValue: 'Verified' }) : kycStatusText}
                </p>
              </div>
            </div>
          </div>
          {!kycIsVerified ? (
            <div className="mt-4 rounded-2xl border border-gray-100 p-4">
              <h3 className="text-base font-semibold text-secondary">{t('providerProfile.howItWorks', { defaultValue: 'How it works' })}</h3>
              <p className="mt-2 text-sm text-gray-600">
                {t('providerProfile.kycHowItWorks', { defaultValue: 'Complete DIDIT verification to increase trust and unlock trust-sensitive platform features.' })}
              </p>
              {kyc?.diditWorkflowUrl ? (
                <p className="mt-2 text-xs text-gray-500">
                  {t('providerProfile.kycHint', { defaultValue: 'If DIDIT shows QR first, use "Open verification link" to resume this session.' })}
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
                    ? t('providerProfile.starting', { defaultValue: 'Starting…' })
                    : kycStarted
                      ? t('providerProfile.continueVerification', { defaultValue: 'Continue verification' })
                      : t('providerProfile.startVerification', { defaultValue: 'Start verification' })}
                </button>
                <button
                  type="button"
                  onClick={loadKyc}
                  disabled={kycLoading}
                  className="rounded-full border border-green-300 px-5 py-2.5 text-sm font-semibold text-green-600 transition hover:border-green-400 disabled:opacity-60"
                >
                  {kycLoading ? t('providerProfile.refreshing', { defaultValue: 'Refreshing…' }) : t('providerProfile.refreshStatus', { defaultValue: 'Refresh status' })}
                </button>
                {kyc?.diditWorkflowUrl ? (
                  <button
                    type="button"
                    onClick={handleOpenExistingKyc}
                    className="rounded-full border border-primary/40 px-5 py-2.5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white"
                  >
                    {t('providerProfile.openVerificationLink', { defaultValue: 'Open verification link' })}
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
