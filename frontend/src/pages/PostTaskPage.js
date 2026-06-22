import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { apiForm } from '../api/client';
import { getRecaptchaToken } from '../utils/recaptcha';
import LocationPicker from '../components/LocationPicker';
import SiteFooter from '../ui/SiteFooter';
import SiteHeader from '../ui/SiteHeader';
import { formatCurrencyRange, getCurrencyForLanguage, getLocaleForLanguage } from '../utils/currency';

const CATEGORY_META = [
  { key: 'homeRepairs', value: 'Home Repairs', icon: '🔧' },
  { key: 'cleaning', value: 'Cleaning', icon: '🧹' },
  { key: 'moving', value: 'Moving', icon: '📦' },
  { key: 'electrical', value: 'Electrical', icon: '⚡' },
  { key: 'plumbing', value: 'Plumbing', icon: '🚿' },
  { key: 'painting', value: 'Other', icon: '🎨' },
  { key: 'gardening', value: 'Gardening', icon: '🌿' },
  { key: 'delivery', value: 'Delivery', icon: '🚚' },
  { key: 'techSupport', value: 'Tech Support', icon: '💻' },
  { key: 'tutoring', value: 'Tutoring', icon: '📚' },
];

const TEMPLATE_META = [
  { key: 'leakyFaucet', category: 'Plumbing', budget: 120 },
  { key: 'deepClean', category: 'Cleaning', budget: 200 },
  { key: 'mountTv', category: 'Home Repairs', budget: 80 },
  { key: 'helpMoving', category: 'Moving', budget: 300 },
  { key: 'gardenMaintenance', category: 'Gardening', budget: 150 },
  { key: 'installFan', category: 'Electrical', budget: 100 },
];

const CATEGORY_TO_API = {
  'Home Repairs': 'Handyman',
};

export default function PostTaskPage() {
  const { t, i18n } = useTranslation();
  const { user, initializing } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (initializing) return;
    if (user?.role === 'provider') {
      navigate('/provider-dashboard', { replace: true });
    }
  }, [initializing, user, navigate]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState(() => getCurrencyForLanguage(i18n.language));
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [urgency, setUrgency] = useState('normal');
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [savedDraft, setSavedDraft] = useState(false);
  const [locationType, setLocationType] = useState('remote');
  const [physicalLocation, setPhysicalLocation] = useState(null);

  useEffect(() => {
    if (!currency) {
      setCurrency(getCurrencyForLanguage(i18n.language));
    }
  }, [currency, i18n.language]);

  const displayName = user?.firstName || user?.displayName || t('postTask.fallbackName');
  const categories = CATEGORY_META.map((item) => ({
    ...item,
    label: t(`postTask.categories.${item.key}`),
  }));
  const templates = TEMPLATE_META.map((tpl) => ({
    ...tpl,
    label: t(`postTask.templates.${tpl.key}.label`),
    description: t(`postTask.templates.${tpl.key}.description`),
  }));
  const currencyOptions = ['USD', 'BDT', 'INR', 'PKR'].map((code) => ({
    value: code,
    label: t(`currency.options.${code}`),
  }));
  const trustIndicators = t('postTask.trustIndicators', { returnObjects: true });
  const urgencyOptions = t('postTask.urgencyOptions', { returnObjects: true });
  const howItWorksSteps = t('postTask.howItWorks', { returnObjects: true });
  const stats = t('postTask.stats', { returnObjects: true });
  const budgetGuideItems = t('postTask.budgetGuide.items', { returnObjects: true });
  const features = t('postTask.features', { returnObjects: true });
  const budgetPlaceholder = new Intl.NumberFormat(getLocaleForLanguage(i18n.language), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(100);

  const applyTemplate = (tpl) => {
    setTitle(tpl.label);
    setCategory(tpl.category);
    setBudget(String(tpl.budget));
    setDescription(tpl.description);
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected.slice(0, 5));
  };

  const saveDraft = () => {
    const draft = { title, description, budget, currency, dueDate, category, urgency };
    localStorage.setItem('taskDraft', JSON.stringify(draft));
    setSavedDraft(true);
    setTimeout(() => setSavedDraft(false), 2000);
  };

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem('taskDraft');
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.title) setTitle(draft.title);
      if (draft.description) setDescription(draft.description);
      if (draft.budget) setBudget(draft.budget);
      if (draft.currency) setCurrency(draft.currency);
      if (draft.dueDate) setDueDate(draft.dueDate);
      if (draft.category) setCategory(draft.category);
      if (draft.urgency) setUrgency(draft.urgency);
    } catch { /* ignore corrupt draft */ }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !category || !budget) return;
    setSubmitting(true);
    setError(null);
    try {
      const categoryForApi = CATEGORY_TO_API[category] || category;
      const locationPayload =
        locationType === 'physical' && physicalLocation
          ? {
              type: 'physical',
              address: physicalLocation.address || physicalLocation.suburb || '',
              lat: physicalLocation.lat ?? -33.8688,
              lng: physicalLocation.lng ?? 151.2093,
              country: 'Australia',
            }
          : { type: 'remote', country: user?.location?.country || 'Bangladesh' };

      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('budget', String(Number(budget)));
      formData.append('category', categoryForApi);
      if (dueDate) formData.append('deadline', new Date(dueDate).toISOString());
      formData.append('location', JSON.stringify(locationPayload));
      files.forEach((file) => formData.append('images', file));
      const recaptchaToken = await getRecaptchaToken('createTask');
      if (recaptchaToken) formData.append('recaptchaToken', recaptchaToken);

      await apiForm('/api/tasks', formData, { method: 'POST' });
      localStorage.removeItem('taskDraft');
      setSuccess(true);
    } catch (err) {
      console.error('Failed to post task', err);
      setError(err.message || t('postTask.errors.postFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputBase =
    'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20';

  if (success) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FFF7ED]">
        <SiteHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-[#0F172A]">{t('postTask.success.title')}</h1>
        <p className="max-w-md text-gray-600">{t('postTask.success.subtitle')}</p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/dashboard')} className="rounded-full bg-[#F97316] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ea580c]">
            {t('postTask.success.dashboard')}
          </button>
          <button onClick={() => { setSuccess(false); setTitle(''); setDescription(''); setBudget(''); setDueDate(''); setCategory(''); setUrgency('normal'); setFiles([]); }} className="rounded-full border border-gray-300 px-6 py-3 text-sm font-semibold text-[#0F172A] transition hover:border-[#F97316] hover:text-[#F97316]">
            {t('postTask.success.postAnother')}
          </button>
        </div>
      </div>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
      <SiteHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#EA580C] via-[#F97316] to-[#FB923C]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
        <div className="relative mx-auto max-w-6xl px-6 py-16 text-center md:py-20">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            {t('postTask.hero.badge')}
          </span>
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl lg:text-6xl">{t('postTask.hero.title')}</h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90">
            {t('postTask.hero.subtitle')}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="#post-form" className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#F97316] shadow-lg transition hover:shadow-xl">
              {t('postTask.hero.primaryCta')} <span aria-hidden>→</span>
            </a>
            <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10">
              {t('postTask.hero.secondaryCta')}
            </a>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto grid max-w-5xl gap-6 px-6 py-12 md:grid-cols-3">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF7ED] text-2xl">⚡</span>
            <h3 className="font-bold text-[#0F172A]">{trustIndicators[0].title}</h3>
            <p className="text-sm text-gray-500">{trustIndicators[0].description}</p>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF7ED] text-2xl">🛡️</span>
            <h3 className="font-bold text-[#0F172A]">{trustIndicators[1].title}</h3>
            <p className="text-sm text-gray-500">{trustIndicators[1].description}</p>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF7ED] text-2xl">👥</span>
            <h3 className="font-bold text-[#0F172A]">{trustIndicators[2].title}</h3>
            <p className="text-sm text-gray-500">{trustIndicators[2].description}</p>
          </div>
        </div>
      </section>

      {/* Main Content: Form + Sidebar */}
      <section className="mx-auto w-full max-w-6xl px-6 py-12" id="post-form">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#0F172A]">{t('postTask.welcome', { name: displayName })}</h2>
          <p className="mt-1 text-gray-500">{t('postTask.welcomeSubtitle')}</p>
        </div>

        <div className="grid gap-10 lg:grid-cols-5">
          {/* Left Column – Form */}
          <div className="lg:col-span-3">
            {/* Quick Templates */}
            <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#0F172A]">{t('postTask.templatesTitle')}</h3>
                <button type="button" onClick={loadDraft} className="text-xs font-medium text-[#F97316] hover:underline">
                  {t('postTask.loadDraft')}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {templates.map((tpl) => (
                  <button key={tpl.label} type="button" onClick={() => applyTemplate(tpl)} className="rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition hover:border-[#F97316] hover:text-[#F97316]">
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
              <h3 className="text-xl font-bold text-[#0F172A]">{t('postTask.form.title')}</h3>
              <p className="text-sm text-gray-500">{t('postTask.form.subtitle')}</p>

              {error && (
                <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('postTask.form.fields.title')}</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('postTask.form.placeholders.title')} className={inputBase} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">{t('postTask.form.fields.category')}</label>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {categories.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                        category === cat.value
                          ? 'border-[#F97316] bg-[#FFF7ED] text-[#F97316]'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Task location</label>
                <div className="mb-3 flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="locationType" checked={locationType === 'remote'} onChange={() => setLocationType('remote')} />
                    Remote
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="locationType" checked={locationType === 'physical'} onChange={() => setLocationType('physical')} />
                    On-site (Australia)
                  </label>
                </div>
                {locationType === 'physical' ? (
                  <LocationPicker value={physicalLocation} onChange={setPhysicalLocation} />
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('postTask.form.fields.description')}</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder={t('postTask.form.placeholders.description')} className={inputBase} />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    <span className="mr-1.5 inline-block">🗓</span>{t('postTask.form.fields.dueDate')}
                  </label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputBase} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    <span className="mr-1.5 inline-block">💲</span>{t('postTask.form.fields.budget')} ({currency})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder={t('postTask.form.placeholders.budget', {
                      amount: budgetPlaceholder,
                    })}
                    className={inputBase}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  {t('postTask.form.fields.currency')}
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={inputBase}
                >
                  {currencyOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">{t('postTask.form.help.currencyNote')}</p>
              </div>

              {/* Urgency Toggle */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">{t('postTask.form.fields.urgency')}</label>
                <div className="flex gap-2">
                  {urgencyOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setUrgency(opt.value)}
                      className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition ${
                        urgency === opt.value
                          ? opt.value === 'urgent'
                            ? 'border-red-400 bg-red-50 text-red-600'
                            : opt.value === 'soon'
                              ? 'border-amber-400 bg-amber-50 text-amber-600'
                              : 'border-[#F97316] bg-[#FFF7ED] text-[#F97316]'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm">{opt.label}</span>
                      <span className="font-normal opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('postTask.form.fields.photos')}</label>
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 px-4 py-6 transition hover:border-[#F97316]/40 hover:bg-[#FFF7ED]/30">
                  <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <span className="text-sm text-gray-500">
                    {files.length > 0
                      ? t('postTask.form.upload.selected', { count: files.length })
                      : t('postTask.form.upload.cta')}
                  </span>
                  <span className="text-xs text-gray-400">{t('postTask.form.upload.hint')}</span>
                  <input type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button type="submit" disabled={submitting || !title.trim() || !description.trim() || !category} className="flex-1 rounded-xl bg-[#F97316] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:opacity-60">
                  {submitting ? t('postTask.form.submitting') : t('postTask.form.submit')}
                </button>
                <button type="button" onClick={saveDraft} className="rounded-xl border border-gray-200 px-6 py-3.5 text-sm font-medium text-gray-600 transition hover:border-[#F97316] hover:text-[#F97316]">
                  {savedDraft ? t('postTask.form.saved') : t('postTask.form.saveDraft')}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column – Sidebar */}
          <aside className="space-y-6 lg:col-span-2" id="how-it-works">
            {/* How It Works */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h3 className="mb-5 text-lg font-bold text-[#F97316]">{t('postTask.sidebar.howItWorksTitle')}</h3>
              <ol className="space-y-5">
                {howItWorksSteps.map((item) => (
                  <li key={item.step} className="flex gap-4">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#F97316] text-sm font-bold text-white">{item.step}</span>
                    <div>
                      <h4 className="text-sm font-semibold text-[#0F172A]">{item.title}</h4>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Testimonial */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-3 flex gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                ))}
              </div>
              <p className="mb-4 text-sm italic text-gray-600">
                “{t('postTask.sidebar.testimonial.quote')}”
              </p>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F97316] text-sm font-bold text-white">{t('postTask.sidebar.testimonial.initials')}</span>
                <div>
                  <p className="text-sm font-semibold text-[#0F172A]">{t('postTask.sidebar.testimonial.name')}</p>
                  <p className="text-xs text-gray-500">{t('postTask.sidebar.testimonial.location')}</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h4 className="mb-4 text-sm font-bold text-[#0F172A]">{t('postTask.sidebar.statsTitle')}</h4>
              <div className="space-y-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{stat.label}</span>
                    <span className="text-sm font-bold text-[#F97316]">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Budget Estimator */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h4 className="mb-3 text-sm font-bold text-[#0F172A]">💡 {t('postTask.sidebar.budgetGuide.title')}</h4>
              <p className="mb-3 text-xs text-gray-500">{t('postTask.sidebar.budgetGuide.subtitle')}</p>
              <div className="space-y-2">
                {budgetGuideItems.map((item) => (
                  <div key={item.task} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <span className="text-xs text-gray-600">{item.task}</span>
                    <span className="text-xs font-semibold text-[#0F172A]">
                      {formatCurrencyRange(item.min, item.max, i18n.language, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="mb-2 text-center text-2xl font-bold text-[#0F172A]">{t('postTask.featuresTitle')}</h2>
          <p className="mx-auto mb-10 max-w-xl text-center text-sm text-gray-500">{t('postTask.featuresSubtitle')}</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-gray-100 p-5 transition hover:border-[#F97316]/30 hover:shadow-md">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF7ED] text-xl">{feature.icon}</span>
                <h3 className="mb-1 text-sm font-bold text-[#0F172A]">{feature.title}</h3>
                <p className="text-xs text-gray-500">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
