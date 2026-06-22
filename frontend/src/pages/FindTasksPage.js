import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteFooter from '../ui/SiteFooter';
import SiteHeader from '../ui/SiteHeader';
import { fetchActivePostedTasks, fetchBrowseProviders } from '../api/services';
import { formatCurrency, getLocaleForLanguage } from '../utils/currency';

const CATEGORY_META = [
  { key: 'all', value: 'All', icon: '🔍', count: '12,600+' },
  { key: 'homeServices', value: 'Home Services', icon: '🏠', count: '5,200+' },
  { key: 'digitalTech', value: 'Digital & Tech', icon: '💻', count: '3,800+' },
  { key: 'movingDelivery', value: 'Moving & Delivery', icon: '🚚', count: '2,100+' },
  { key: 'eventsPhoto', value: 'Events & Photo', icon: '📸', count: '1,500+' },
];

const RATING_OPTIONS = [
  { value: 'any', key: 'any' },
  { value: '4.5', key: '4.5' },
  { value: '4.7', key: '4.7' },
  { value: '4.9', key: '4.9' },
];

const PRICE_RANGES = [
  { value: 'any', key: 'any' },
  { value: 'under40', key: 'under40' },
  { value: '40-60', key: '40-60' },
  { value: '60-80', key: '60-80' },
  { value: '80plus', key: '80plus' },
];

const LOCATION_OPTIONS = [
  { value: 'any', key: 'any' },
  { value: 'Bangladesh', key: 'bangladesh' },
  { value: 'India', key: 'india' },
  { value: 'Pakistan', key: 'pakistan' },
];

const SORT_OPTIONS = [
  { value: 'recommended', key: 'recommended' },
  { value: 'highestRated', key: 'highestRated' },
  { value: 'mostJobs', key: 'mostJobs' },
  { value: 'priceLowHigh', key: 'priceLowHigh' },
  { value: 'priceHighLow', key: 'priceHighLow' },
];
const AVATAR_COLORS = ['#F97316', '#8B5CF6', '#10B981', '#3B82F6', '#EC4899', '#F59E0B', '#6366F1', '#14B8A6', '#EF4444', '#0EA5E9'];

function VerifiedModal({ provider, onClose, t, locale }) {
  if (!provider) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg animate-lift-in rounded-3xl bg-white p-0 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-emerald-500 to-teal-600 px-8 py-10 text-white">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative flex flex-col items-center gap-4 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg">
              <svg className="h-10 w-10 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{t('findTasks.verifiedModal.title')}</h2>
              <p className="mt-1 text-sm text-white/80">{t('findTasks.verifiedModal.subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white" style={{ backgroundColor: provider.color }}>{provider.initials}</span>
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">{provider.name}</h3>
              <p className="text-sm text-gray-500">{provider.title}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800">{t('findTasks.verifiedModal.identity.title')}</p>
                <p className="text-xs text-emerald-600">{t('findTasks.verifiedModal.identity.description')}</p>
              </div>
              {provider.idVerified && <span className="text-xs font-bold text-emerald-600">{t('findTasks.verifiedModal.identity.status')}</span>}
            </div>

            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100">
                <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800">{t('findTasks.verifiedModal.background.title')}</p>
                <p className="text-xs text-emerald-600">{t('findTasks.verifiedModal.background.description')}</p>
              </div>
              {provider.bgCheck && <span className="text-xs font-bold text-emerald-600">{t('findTasks.verifiedModal.background.status')}</span>}
            </div>

            <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${provider.licenseVerified ? 'bg-emerald-50' : 'bg-gray-50'}`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${provider.licenseVerified ? 'bg-emerald-100' : 'bg-gray-200'}`}>
                <svg className={`h-4 w-4 ${provider.licenseVerified ? 'text-emerald-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${provider.licenseVerified ? 'text-emerald-800' : 'text-gray-600'}`}>{t('findTasks.verifiedModal.license.title')}</p>
                <p className={`text-xs ${provider.licenseVerified ? 'text-emerald-600' : 'text-gray-400'}`}>{provider.licenseVerified ? t('findTasks.verifiedModal.license.verifiedDescription') : t('findTasks.verifiedModal.license.notApplicable')}</p>
              </div>
              <span className={`text-xs font-bold ${provider.licenseVerified ? 'text-emerald-600' : 'text-gray-400'}`}>{provider.licenseVerified ? t('findTasks.verifiedModal.license.statusVerified') : t('findTasks.verifiedModal.license.statusNa')}</span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">{t('findTasks.verifiedModal.verifiedOn')}</span> {new Date(provider.verifiedDate).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">{t('findTasks.verifiedModal.verifiedBy')}</span> {provider.verifiedBy}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-gray-100 px-8 py-4">
          <button onClick={onClose} className="rounded-full bg-[#0F172A] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1E293B]">
            {t('findTasks.verifiedModal.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

const formatTimeAgo = (val, t) => {
  if (!val) return '';
  const date = val.toDate ? val.toDate() : new Date(val);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return t('findTasks.time.justNow');
  if (diff < 3600) return t('findTasks.time.minutesAgo', { count: Math.floor(diff / 60) });
  if (diff < 86400) return t('findTasks.time.hoursAgo', { count: Math.floor(diff / 3600) });
  return t('findTasks.time.daysAgo', { count: Math.floor(diff / 86400) });
};

const formatBudget = (v, lang, baseCurrency = 'USD') => {
  if (v == null) return null;
  return formatCurrency(v, lang, { maximumFractionDigits: 0, baseCurrency });
};

const currencyForCountry = (country) => {
  const c = String(country || '').trim().toLowerCase();
  if (c === 'bangladesh') return 'BDT';
  if (c === 'india') return 'INR';
  if (c === 'pakistan') return 'PKR';
  return 'USD';
};

const normalizeLocation = (raw) => {
  if (!raw) return 'Bangladesh';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    const country = typeof raw.country === 'string' ? raw.country.trim() : '';
    return country || 'Bangladesh';
  }
  return 'Bangladesh';
};

const normalizeSkills = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((s) => {
      if (typeof s === 'string') return s.trim();
      if (s == null) return '';
      return String(s).trim();
    })
    .filter(Boolean);
};

export default function FindTasksPage() {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('any');
  const [priceFilter, setPriceFilter] = useState('any');
  const [locationFilter, setLocationFilter] = useState('any');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState('recommended');
  const [showFilters, setShowFilters] = useState(false);
  const [verifiedProvider, setVerifiedProvider] = useState(null);
  const [postedTasks, setPostedTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providers, setProviders] = useState([]);
  const perHour = t('findTasks.provider.perHour');
  const locale = getLocaleForLanguage(i18n.language);
  const categories = CATEGORY_META.map((cat) => ({
    ...cat,
    label: t(`findTasks.categories.${cat.key}`),
  }));
  const ratingOptions = RATING_OPTIONS.map((opt) => ({
    ...opt,
    label: opt.key === 'any' ? t('findTasks.filters.rating.any') : `${opt.key}+`,
  }));
  const priceOptions = PRICE_RANGES.map((opt) => {
    if (opt.key === 'any') {
      return { ...opt, label: t('findTasks.filters.price.any') };
    }
    if (opt.key === 'under40') {
      return {
        ...opt,
        label: t('findTasks.filters.price.under', {
          amount: formatCurrency(40, i18n.language, { maximumFractionDigits: 0 }),
          perHour,
        }),
      };
    }
    if (opt.key === '80plus') {
      return {
        ...opt,
        label: t('findTasks.filters.price.over', {
          amount: formatCurrency(80, i18n.language, { maximumFractionDigits: 0 }),
          perHour,
        }),
      };
    }
    const [min, max] = opt.key.split('-').map((v) => Number(v));
    return {
      ...opt,
      label: t('findTasks.filters.price.range', {
        min: formatCurrency(min, i18n.language, { maximumFractionDigits: 0 }),
        max: formatCurrency(max, i18n.language, { maximumFractionDigits: 0 }),
        perHour,
      }),
    };
  });
  const sortOptions = SORT_OPTIONS.map((opt) => ({
    ...opt,
    label: t(`findTasks.filters.sort.${opt.key}`),
  }));
  const locationOptions = LOCATION_OPTIONS.map((opt) => ({
    ...opt,
    label: opt.key === 'any' ? 'Any location' : opt.value,
  }));
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const items = await fetchBrowseProviders();
        const normalized = items.map((provider, idx) => {
          const name = provider.name || provider.email || 'Provider';
          const words = String(name).trim().split(/\s+/).filter(Boolean);
          const initials = words.slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'PR';
          const skills = normalizeSkills(provider.skills);
          return {
            ...provider,
            id: provider.id || provider._id || String(idx),
            name: String(name),
            initials,
            color: AVATAR_COLORS[idx % AVATAR_COLORS.length],
            title: typeof provider.title === 'string' && provider.title.trim() ? provider.title : 'Provider',
            location: normalizeLocation(provider.location),
            skills,
            category: provider.category || 'All',
            rate: Number.isFinite(Number(provider.rate)) ? Number(provider.rate) : null,
            rating: Number(provider.rating || 0),
            reviews: Number(provider.reviews || 0),
            jobs: Number(provider.jobs || 0),
            available: provider.available !== false,
            verifiedDate: provider.verifiedDate || provider.memberSince || new Date().toISOString(),
            verifiedBy: provider.verifiedBy || 'ConnectMyTask',
            bgCheck: provider.bgCheck ?? true,
            idVerified: provider.idVerified ?? true,
            licenseVerified: provider.licenseVerified ?? false,
          };
        });
        if (!cancelled) setProviders(normalized);
      } catch (err) {
        console.error('Failed to load providers:', err);
        if (!cancelled) setProviders([]);
      } finally {
        if (!cancelled) setProvidersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { tasks: items } = await fetchActivePostedTasks(20);
        const sorted = [...items].sort((a, b) => {
          const ta = new Date(a.createdAt ?? 0);
          const tb = new Date(b.createdAt ?? 0);
          return tb - ta;
        });
        if (!cancelled) {
          setPostedTasks(sorted.slice(0, 6));
          setTasksLoading(false);
        }
      } catch (err) {
        console.error('Failed to load tasks:', err);
        if (!cancelled) setTasksLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = [...providers];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.skills.some((s) => s.toLowerCase().includes(q)) ||
        p.location.toLowerCase().includes(q)
      );
    }

    if (selectedCategory !== 'All') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    if (ratingFilter !== 'any') {
      const min = parseFloat(ratingFilter);
      list = list.filter((p) => p.rating >= min);
    }

    if (priceFilter !== 'any') {
      list = list.filter((p) => {
        switch (priceFilter) {
          case 'under40': return p.rate < 40;
          case '40-60': return p.rate >= 40 && p.rate <= 60;
          case '60-80': return p.rate > 60 && p.rate <= 80;
          case '80plus': return p.rate > 80;
          default: return true;
        }
      });
    }

    if (locationFilter !== 'any') {
      list = list.filter((p) => String(p.location || '').trim() === locationFilter);
    }

    if (availableOnly) {
      list = list.filter((p) => p.available);
    }

    switch (sortBy) {
      case 'highestRated': list.sort((a, b) => b.rating - a.rating); break;
      case 'mostJobs': list.sort((a, b) => b.jobs - a.jobs); break;
      case 'priceLowHigh': list.sort((a, b) => a.rate - b.rate); break;
      case 'priceHighLow': list.sort((a, b) => b.rate - a.rate); break;
      default: list.sort((a, b) => b.rating * b.reviews - a.rating * a.reviews); break;
    }

    return list;
  }, [providers, search, selectedCategory, ratingFilter, priceFilter, locationFilter, availableOnly, sortBy]);

  const activeFilterCount = [
    selectedCategory !== 'All',
    ratingFilter !== 'any',
    priceFilter !== 'any',
    locationFilter !== 'any',
    availableOnly,
  ].filter(Boolean).length;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#EA580C] via-[#F97316] to-[#FB923C]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-40" />
        <div className="relative mx-auto max-w-6xl px-6 py-14 text-center md:py-20">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
            {t('findTasks.hero.badge')}
          </span>
          <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl lg:text-6xl">{t('findTasks.hero.title')}</h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-white/90">
            {t('findTasks.hero.subtitle')}
          </p>

          {/* Search */}
          <div className="mx-auto flex max-w-xl items-center gap-2 rounded-full bg-white p-1.5 shadow-lg">
            <div className="flex flex-1 items-center gap-2 pl-4">
              <svg className="h-5 w-5 flex-shrink-0 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('findTasks.hero.searchPlaceholder')} className="w-full bg-transparent py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none" />
            </div>
            <button className="flex items-center gap-1.5 rounded-full bg-[#0F172A] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1E293B]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              {t('findTasks.hero.searchButton')}
            </button>
          </div>

          {/* Stats */}
          <div className="mx-auto mt-10 flex max-w-md justify-center gap-10 md:gap-16">
            {t('findTasks.hero.stats', { returnObjects: true }).map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-white md:text-3xl">{s.value}</p>
                <p className="text-xs text-white/70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-b border-gray-100 bg-white">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 py-10 sm:grid-cols-2 md:grid-cols-5">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-5 transition hover:shadow-md ${
                selectedCategory === cat.value ? 'border-[#F97316] bg-[#FFF7ED] shadow-sm' : 'border-gray-100 bg-[#FAFAFA]'
              }`}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-sm font-semibold text-[#0F172A]">{cat.label}</span>
              <span className="text-xs text-gray-500">{t('findTasks.categoriesCount', { count: cat.count })}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Recently Posted Tasks */}
      {!tasksLoading && postedTasks.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-6 pt-12 pb-4">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#0F172A]">{t('findTasks.recent.title')}</h2>
              <p className="text-sm text-gray-500">{t('findTasks.recent.subtitle')}</p>
            </div>
            <Link to="/tasks/new" className="hidden items-center gap-1 rounded-full bg-[#F97316] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#ea580c] sm:inline-flex">
              {t('findTasks.recent.cta')}
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {postedTasks.map((task) => (
              <div key={task.id} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="mb-3 flex items-start justify-between">
                  <span className="rounded-full bg-[#FFF7ED] px-2.5 py-1 text-xs font-medium text-[#F97316]">{task.category}</span>
                  <div className="flex items-center gap-2">
                    {task.urgency === 'urgent' && <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">🔥 {t('findTasks.recent.urgency.urgent')}</span>}
                    {task.urgency === 'soon' && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-600">⏰ {t('findTasks.recent.urgency.soon')}</span>}
                    <span className="text-[10px] text-gray-400">{formatTimeAgo(task.createdAt, t)}</span>
                  </div>
                </div>
                <h3 className="mb-1 text-sm font-bold text-[#0F172A]">{task.title}</h3>
                <p className="mb-3 text-xs text-gray-500 line-clamp-2">{task.description}</p>
                <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-3">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {task.budget != null && <span className="font-semibold text-[#0F172A]">{formatBudget(task.budget, i18n.language, task.currency || 'USD')}</span>}
                    {task.dueDate && (
                      <span>{t('findTasks.recent.due', { date: new Intl.DateTimeFormat(locale).format(new Date(task.dueDate)) })}</span>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-gray-400">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-500">{(task.userName || t('findTasks.recent.userFallback'))[0].toUpperCase()}</span>
                    {task.userName?.split(' ')[0] || t('findTasks.recent.userFallback')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Providers */}
      <section className="mx-auto w-full max-w-6xl px-6 py-12">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#0F172A]">{t('findTasks.featured.title')}</h2>
            <p className="text-sm text-gray-500">{t('findTasks.featured.subtitle')}</p>
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 self-start rounded-full border border-[#F97316] px-4 py-2 text-sm font-medium text-[#F97316] transition hover:bg-[#FFF7ED]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            {showFilters ? t('findTasks.filters.hide') : t('findTasks.filters.show')}{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mb-8 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">{t('findTasks.filters.rating.label')}</label>
                <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20">
                  {ratingOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">{t('findTasks.filters.price.label')}</label>
                <select value={priceFilter} onChange={(e) => setPriceFilter(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20">
                  {priceOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">{t('findTasks.filters.sort.label')}</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20">
                  {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">Location</label>
                <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20">
                  {locationOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm transition hover:border-[#F97316]/40">
                  <input type="checkbox" checked={availableOnly} onChange={(e) => setAvailableOnly(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-[#F97316] focus:ring-[#F97316]/40" />
                  <span className="font-medium text-gray-700">{t('findTasks.filters.available')}</span>
                </label>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button onClick={() => { setRatingFilter('any'); setPriceFilter('any'); setLocationFilter('any'); setAvailableOnly(false); setSelectedCategory('All'); }} className="mt-4 text-xs font-medium text-[#F97316] hover:underline">
                {t('findTasks.filters.clear')}
              </button>
            )}
          </div>
        )}

        {/* Results count */}
        <p className="mb-4 text-sm text-gray-500">{t('findTasks.resultsCount', { count: filtered.length })}</p>

        {/* Provider Cards */}
        {providersLoading ? (
          <div className="flex min-h-[160px] items-center justify-center rounded-2xl border border-gray-100 bg-white text-sm text-gray-500">
            Loading providers...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center">
            <span className="text-4xl">🔍</span>
            <h3 className="text-lg font-semibold text-[#0F172A]">{t('findTasks.empty.title')}</h3>
            <p className="text-sm text-gray-500">{t('findTasks.empty.subtitle')}</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((provider) => (
              <article key={provider.id} className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="mb-4 flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white" style={{ backgroundColor: provider.color }}>
                    {provider.initials}
                  </span>
                  <button
                    onClick={() => setVerifiedProvider(provider)}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600 transition hover:bg-emerald-100"
                  >
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    {t('findTasks.provider.verified')}
                  </button>
                </div>

                <h3 className="text-base font-bold text-[#0F172A]">{provider.name}</h3>
                <p className="mb-3 text-xs text-gray-500">{provider.title}</p>

                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    <span className="font-semibold text-[#0F172A]">{provider.rating}</span> ({provider.reviews})
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    {t('findTasks.provider.jobs', { count: provider.jobs })}
                  </span>
                </div>

                <div className="mb-3 flex items-center gap-1 text-xs text-gray-500">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {provider.location}
                </div>

                <div className="mb-4 flex flex-wrap gap-1.5">
                  {provider.skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-[#FFF7ED] px-2.5 py-1 text-xs font-medium text-[#F97316]">{skill}</span>
                  ))}
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-[#0F172A]">
                      {provider.rate != null
                        ? `${formatBudget(provider.rate, i18n.language, currencyForCountry(provider.location))}${t('findTasks.provider.perHour')}`
                        : 'Rate on request'}
                    </span>
                    {!provider.available && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">{t('findTasks.provider.busy')}</span>}
                  </div>
                  <Link to={`/providers/${provider.id}`} className="inline-flex items-center gap-1 rounded-full border border-[#F97316] px-4 py-2 text-xs font-semibold text-[#F97316] transition hover:bg-[#F97316] hover:text-white">
                    {t('findTasks.provider.viewProfile')} <span>→</span>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Why Choose Our Providers */}
      <section className="border-t border-gray-100 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="mb-2 text-2xl font-bold text-[#0F172A]">{t('findTasks.why.title')}</h2>
          <p className="mx-auto mb-10 max-w-xl text-sm text-gray-500">{t('findTasks.why.subtitle')}</p>
          <div className="grid gap-8 sm:grid-cols-3">
            {t('findTasks.why.items', { returnObjects: true }).map((item) => (
              <div key={item.title} className="flex flex-col items-center gap-3">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF7ED] text-2xl">{item.icon}</span>
                <h3 className="font-bold text-[#0F172A]">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />

      {verifiedProvider && <VerifiedModal provider={verifiedProvider} onClose={() => setVerifiedProvider(null)} t={t} locale={locale} />}
    </div>
  );
}
