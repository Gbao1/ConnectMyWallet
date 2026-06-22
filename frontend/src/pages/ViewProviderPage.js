import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useTranslation } from 'react-i18next';
import SiteHeader from '../ui/SiteHeader';
import SiteFooter from '../ui/SiteFooter';
import { PROVIDERS } from '../data/providers';
import { formatCurrency, formatCurrencyWithCode, getLocaleForLanguage } from '../utils/currency';
import { api } from '../api/client';
import TrustScoreBadge from '../ui/TrustScoreBadge';
import { API_BASE_URL } from '../config';

const LANGUAGE_KEY_MAP = {
  English: 'english',
  Spanish: 'spanish',
  Mandarin: 'mandarin',
  Korean: 'korean',
  Urdu: 'urdu',
  Hindi: 'hindi',
  Vietnamese: 'vietnamese',
  Gujarati: 'gujarati',
  Cantonese: 'cantonese',
};

const RESPONSE_TIME_KEY_MAP = {
  'Under 30 mins': 'under30Mins',
  'Under 1 hour': 'under1Hour',
  'Under 2 hours': 'under2Hours',
  'Under 3 hours': 'under3Hours',
};

const CATEGORY_KEY_MAP = {
  'Home Services': 'homeServices',
  'Digital & Tech': 'digitalTech',
  'Moving & Delivery': 'movingDelivery',
  'Events & Photo': 'eventsPhoto',
};
const COUNTRY_LANGUAGE_MAP = {
  Bangladesh: ['Bengali', 'English'],
  India: ['Hindi', 'English'],
  Pakistan: ['Urdu', 'English'],
};

const COUNTRY_CURRENCY_MAP = {
  Bangladesh: 'BDT',
  India: 'INR',
  Pakistan: 'PKR',
};

function StarRating({ rating, size = 'h-4 w-4' }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`${size} ${i < Math.round(rating) ? 'text-amber-400' : 'text-gray-200'}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function currencyForCountry(country) {
  return COUNTRY_CURRENCY_MAP[String(country || '').trim()] || 'USD';
}

function toAbsoluteAssetUrl(path) {
  if (!path || typeof path !== 'string') return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = API_BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\/+/, '')}`;
}

export default function ViewProviderPage() {
  const { t, i18n } = useTranslation();
  const { user: authUser } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('about');
  const [liveData, setLiveData] = useState(null);
  const [liveProvider, setLiveProvider] = useState(null);
  const [liveLoading, setLiveLoading] = useState(true);

  const provider = PROVIDERS.find((p) => String(p.id) === String(id));
  const locale = getLocaleForLanguage(i18n.language);

  useEffect(() => {
    let cancelled = false;
    setLiveLoading(true);
    (async () => {
      try {
        const [reviewsRes, profileRes] = await Promise.allSettled([
          api(`/api/reviews/provider/${id}`),
          api(`/api/auth/profile/${id}`),
        ]);
        if (cancelled) return;
        setLiveData(reviewsRes.status === 'fulfilled' ? reviewsRes.value : null);
        setLiveProvider(profileRes.status === 'fulfilled' ? profileRes.value : null);
      } catch {
        if (!cancelled) {
          setLiveData(null);
          setLiveProvider(null);
        }
      } finally {
        if (!cancelled) setLiveLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const normalizedLiveProvider = useMemo(() => {
    if (!liveProvider || liveProvider.role !== 'provider') return null;
    const fullName = String(liveProvider.name || liveProvider.email || 'Provider').trim();
    const words = fullName.split(/\s+/).filter(Boolean);
    const initials = words.slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'PR';
    const safeSkills = Array.isArray(liveProvider.skills)
      ? liveProvider.skills.map((s) => String(s || '').trim()).filter(Boolean)
      : [];
    const specialization = liveProvider.specialization
      ? String(liveProvider.specialization).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : '';
    const location = liveProvider.location?.country || 'Bangladesh';
    const reviewsList = Array.isArray(liveData?.reviews)
      ? liveData.reviews.map((review) => ({
          name: review?.reviewer?.name || 'User',
          rating: Number(review?.overallRating || 0),
          text: review?.comment || 'No comment provided.',
          date: review?.createdAt || new Date().toISOString(),
        }))
      : [];
    const fallbackSkills = safeSkills.length ? safeSkills : (specialization ? [specialization] : ['General Services']);
    const derivedLanguages = COUNTRY_LANGUAGE_MAP[location] || ['English'];
    const aboutText = typeof liveProvider.about === 'string' ? liveProvider.about.trim() : '';
    return {
      id: String(liveProvider._id || id),
      name: fullName,
      initials,
      profilePhoto: liveProvider.profilePhoto ? toAbsoluteAssetUrl(liveProvider.profilePhoto) : '',
      color: '#F97316',
      title: specialization || 'Provider',
      location,
      skills: fallbackSkills,
      bio: aboutText || `${fullName} provides ${fallbackSkills.join(', ')} in ${location}.`,
      responseTime: 'Under 2 hours',
      category: specialization || 'All',
      languages: derivedLanguages,
      portfolio: [],
      reviewsList,
      rating: Number(liveData?.averageRating || 0),
      reviews: Number(liveData?.totalReviews || 0),
      jobs: Number(liveProvider.completedTasks || 0),
      completionRate: 100,
      repeatClients: 0,
      rate: Number.isFinite(Number(liveProvider.hourlyRate)) ? Number(liveProvider.hourlyRate) : 0,
      verified: liveProvider.kyc?.status === 'verified' || !!liveProvider.isVerified,
      available: true,
      memberSince: liveProvider.createdAt || new Date().toISOString(),
      idVerified: liveProvider.kyc?.status === 'verified' || !!liveProvider.isVerified,
      bgCheck: true,
      licenseVerified: false,
    };
  }, [id, liveData, liveProvider]);

  const localizedProvider = useMemo(() => {
    const sourceProvider = provider || normalizedLiveProvider;
    if (!sourceProvider) return null;
    const translatedSkills = provider
      ? t(`findTasks.providerCards.${sourceProvider.id}.skills`, { returnObjects: true })
      : sourceProvider.skills;
    const safeSkills = Array.isArray(translatedSkills) ? translatedSkills : sourceProvider.skills;
    const translatedLocation = provider
      ? t(`findTasks.providerCards.${sourceProvider.id}.location`, { defaultValue: sourceProvider.location })
      : sourceProvider.location;
    const fallbackBio = t('findTasks.providerProfile.bioFallback', {
      location: translatedLocation,
      skills: safeSkills.join(', '),
    });
    const translatedLanguages = sourceProvider.languages.map((lang) => {
      const key = LANGUAGE_KEY_MAP[lang];
      return key ? t(`findTasks.providerProfile.languageNames.${key}`) : lang;
    });
    const responseKey = RESPONSE_TIME_KEY_MAP[sourceProvider.responseTime];
    const translatedResponseTime = responseKey
      ? t(`findTasks.providerProfile.responseTimes.${responseKey}`)
      : sourceProvider.responseTime;
    const categoryKey = CATEGORY_KEY_MAP[sourceProvider.category];
    return {
      ...sourceProvider,
      title: provider ? t(`findTasks.providerCards.${sourceProvider.id}.title`, { defaultValue: sourceProvider.title }) : sourceProvider.title,
      location: translatedLocation,
      skills: safeSkills,
      bio: provider ? t(`findTasks.providerCards.${sourceProvider.id}.bio`, { defaultValue: fallbackBio }) : sourceProvider.bio,
      responseTime: translatedResponseTime,
      category: categoryKey ? t(`findTasks.categories.${categoryKey}`) : sourceProvider.category,
      languages: translatedLanguages,
      portfolio: sourceProvider.portfolio.map((item, idx) => ({
        title: provider ? t(`findTasks.providerCards.${sourceProvider.id}.portfolio.${idx}.title`, { defaultValue: item.title }) : item.title,
        desc: provider ? t(`findTasks.providerCards.${sourceProvider.id}.portfolio.${idx}.desc`, { defaultValue: item.desc }) : item.desc,
      })),
      reviewsList: sourceProvider.reviewsList.map((review, idx) => ({
        ...review,
        text: provider ? t(`findTasks.providerCards.${sourceProvider.id}.reviews.${idx}.text`, { defaultValue: review.text }) : review.text,
      })),
    };
  }, [normalizedLiveProvider, provider, t]);

  if ((!provider || !localizedProvider) && liveLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] text-gray-500">
        Loading provider...
      </div>
    );
  }

  if (!localizedProvider) {
    return (
      <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
        <SiteHeader />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
          <span className="text-5xl">🔍</span>
          <h1 className="text-2xl font-bold text-[#0F172A]">{t('findTasks.providerProfile.notFoundTitle')}</h1>
          <p className="text-gray-500">{t('findTasks.providerProfile.notFoundSubtitle')}</p>
          <Link to="/find-tasks" className="mt-2 rounded-full bg-[#F97316] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#ea580c]">{t('findTasks.providerProfile.browseProviders')}</Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const memberDate = new Date(localizedProvider.memberSince).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  const memberFullDate = new Date(localizedProvider.memberSince).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' });
  const providerCurrency = currencyForCountry(localizedProvider.location);
  const formattedRate = localizedProvider.rate != null
    ? formatCurrencyWithCode(localizedProvider.rate, i18n.language, providerCurrency, { maximumFractionDigits: 0 })
    : null;
  const showProfilePhoto = typeof localizedProvider.profilePhoto === 'string' && localizedProvider.profilePhoto.trim();

  const tabs = [
    { key: 'about', label: t('findTasks.providerProfile.tabs.about') },
    { key: 'portfolio', label: t('findTasks.providerProfile.tabs.portfolio') },
    { key: 'reviews', label: t('findTasks.providerProfile.tabs.reviews', { count: localizedProvider.reviews }) },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
      <SiteHeader />

      {/* Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] to-[#334155]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE0YzAtMi4yMS0xLjc5LTQtNC00cy00IDEuNzktNCA0IDEuNzkgNCA0IDQgNC0xLjc5IDQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
        <div className="relative mx-auto max-w-6xl px-6 pb-24 pt-8">
          <button onClick={() => navigate(-1)} className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-sm transition hover:bg-white/20 hover:text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            {t('findTasks.providerProfile.back')}
          </button>

          <div className="flex flex-col gap-6 md:flex-row md:items-end md:gap-8">
            {showProfilePhoto ? (
              <img
                src={localizedProvider.profilePhoto}
                alt={localizedProvider.name}
                className="h-24 w-24 rounded-2xl object-cover shadow-lg ring-4 ring-white/20"
              />
            ) : (
              <span className="flex h-24 w-24 items-center justify-center rounded-2xl text-3xl font-bold text-white shadow-lg ring-4 ring-white/20" style={{ backgroundColor: localizedProvider.color }}>
                {localizedProvider.initials}
              </span>
            )}
            <div className="flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-white md:text-4xl">{localizedProvider.name}</h1>
                {liveData?.trustScore?.score != null ? <TrustScoreBadge score={liveData.trustScore.score} size="sm" /> : null}
                {localizedProvider.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-sm">
                    <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    {t('findTasks.providerProfile.verified')}
                  </span>
                )}
                {localizedProvider.available ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {t('findTasks.providerProfile.available')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/50">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/40" /> {t('findTasks.providerProfile.currentlyBusy')}
                  </span>
                )}
              </div>
              <p className="text-lg text-white/70">{localizedProvider.title}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/60">
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {localizedProvider.location}
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                  {localizedProvider.languages.join(', ')}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="text-right">
                <p className="text-3xl font-bold text-white">
                  {formattedRate || formatCurrency(localizedProvider.rate, i18n.language, { maximumFractionDigits: 0 })}
                  <span className="text-base font-normal text-white/50">{t('findTasks.provider.perHour')}</span>
                </p>
              </div>
              <button className="rounded-full bg-[#F97316] px-8 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-[#ea580c] hover:shadow-xl">
                {t('findTasks.providerProfile.hire', { name: localizedProvider.name.split(' ')[0] })}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="relative -mt-8">
        <div className="mx-auto grid max-w-6xl gap-4 px-6 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Member Since</p>
            <p className="mt-1 text-sm font-semibold text-[#0F172A]">{memberFullDate}</p>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Completed Jobs</p>
            <p className="mt-1 text-sm font-semibold text-[#0F172A]">{localizedProvider.jobs}</p>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative mt-6">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 px-6 md:grid-cols-3">
          {[
            { label: t('findTasks.providerProfile.stats.rating'), value: localizedProvider.rating, sub: t('findTasks.providerProfile.stats.reviews', { count: localizedProvider.reviews }) },
            { label: t('findTasks.providerProfile.stats.responseTime'), value: localizedProvider.responseTime, sub: t('findTasks.providerProfile.stats.average') },
            { label: t('findTasks.providerProfile.stats.repeatClients'), value: `${localizedProvider.repeatClients}%`, sub: t('findTasks.providerProfile.stats.comeBackAgain') },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 rounded-2xl border border-gray-100 bg-white px-4 py-5 shadow-sm">
              <p className="text-lg font-bold text-[#0F172A]">{stat.value}</p>
              <p className="text-[11px] text-gray-500">{stat.sub}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Column */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                    activeTab === tab.key ? 'bg-white text-[#0F172A] shadow-sm' : 'text-gray-500 hover:text-[#0F172A]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-3 text-lg font-bold text-[#0F172A]">{t('findTasks.providerProfile.tabs.about')}</h3>
                  <p className="leading-relaxed text-gray-600">{localizedProvider.bio}</p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-bold text-[#0F172A]">{t('findTasks.providerProfile.skillsTitle')}</h3>
                  <div className="flex flex-wrap gap-2">
                  {localizedProvider.skills.map((skill) => (
                      <span key={skill} className="rounded-full bg-[#FFF7ED] px-4 py-2 text-sm font-medium text-[#F97316]">{skill}</span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-bold text-[#0F172A]">{t('findTasks.providerProfile.verificationTitle')}</h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { label: t('findTasks.providerProfile.verification.identity'), passed: localizedProvider.idVerified },
                      { label: t('findTasks.providerProfile.verification.background'), passed: localizedProvider.bgCheck },
                      { label: t('findTasks.providerProfile.verification.license'), passed: localizedProvider.licenseVerified },
                    ].map((check) => (
                      <div key={check.label} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${check.passed ? 'bg-emerald-50' : 'bg-gray-50'}`}>
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${check.passed ? 'bg-emerald-100' : 'bg-gray-200'}`}>
                          {check.passed ? (
                            <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          ) : (
                            <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${check.passed ? 'text-emerald-800' : 'text-gray-500'}`}>{check.label}</p>
                          <p className={`text-xs ${check.passed ? 'text-emerald-600' : 'text-gray-400'}`}>{check.passed ? t('findTasks.providerProfile.verified') : t('findTasks.providerProfile.notApplicable')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Portfolio Tab */}
            {activeTab === 'portfolio' && (
              <div className="space-y-4">
                {localizedProvider.portfolio.map((item, idx) => (
                  <div key={idx} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF7ED] text-lg font-bold text-[#F97316]">{idx + 1}</span>
                      <h4 className="text-base font-bold text-[#0F172A]">{item.title}</h4>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reviews Tab */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex items-center gap-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                  <div className="text-center">
                    <p className="text-4xl font-bold text-[#0F172A]">{localizedProvider.rating}</p>
                    <StarRating rating={localizedProvider.rating} size="h-5 w-5" />
                    <p className="mt-1 text-xs text-gray-500">{t('findTasks.providerProfile.stats.reviews', { count: localizedProvider.reviews })}</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = localizedProvider.reviewsList.filter((r) => Math.round(r.rating) === star).length;
                      const pct = localizedProvider.reviewsList.length > 0 ? (count / localizedProvider.reviewsList.length) * 100 : 0;
                      return (
                        <div key={star} className="flex items-center gap-2">
                          <span className="w-6 text-right text-xs font-medium text-gray-500">{star}★</span>
                          <div className="h-2 flex-1 rounded-full bg-gray-100">
                            <div className="h-2 rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="w-6 text-xs text-gray-400">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Individual Reviews */}
                {localizedProvider.reviewsList.map((review, idx) => (
                  <div key={idx} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">{review.name[0]}</span>
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A]">{review.name}</p>
                          <p className="text-xs text-gray-400">{new Date(review.date).toLocaleDateString(locale, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <StarRating rating={review.rating} />
                    </div>
                    <p className="text-sm leading-relaxed text-gray-600">{review.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Hire Card */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <button className="mb-3 w-full rounded-xl bg-[#F97316] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#ea580c]">
                {t('findTasks.providerProfile.hireArrow', { name: localizedProvider.name.split(' ')[0] })}
              </button>
              {authUser ? (
                <Link
                  to={`/messages/${id}`}
                  className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-center text-sm font-semibold text-[#0F172A] transition hover:border-[#F97316] hover:text-[#F97316]"
                >
                  {t('findTasks.providerProfile.sendMessage')}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/auth?mode=login')}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-[#0F172A] transition hover:border-[#F97316] hover:text-[#F97316]"
                >
                  {t('findTasks.providerProfile.sendMessage')}
                </button>
              )}
              <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 text-xs text-gray-500">
                <div className="flex items-center justify-between">
                  <span>{t('findTasks.providerProfile.responseTime')}</span>
                  <span className="font-semibold text-[#0F172A]">{localizedProvider.responseTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('findTasks.providerProfile.completionRate')}</span>
                  <span className="font-semibold text-[#0F172A]">{localizedProvider.completionRate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t('findTasks.providerProfile.repeatClients')}</span>
                  <span className="font-semibold text-[#0F172A]">{localizedProvider.repeatClients}%</span>
                </div>
              </div>
            </div>

            {/* Quick Info */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h4 className="mb-3 text-sm font-bold text-[#0F172A]">{t('findTasks.providerProfile.quickInfo')}</h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="text-gray-600">{localizedProvider.location}</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                  <span className="text-gray-600">{localizedProvider.category}</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 1.343-3 3m6 0a3 3 0 11-6 0m6 0c0 1.657-1.343 3-3 3m3-3H9" /></svg>
                  <span className="text-gray-600">Billing currency: {providerCurrency}</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" /></svg>
                  <span className="text-gray-600">{localizedProvider.languages.join(', ')}</span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <span className="text-gray-600">{t('findTasks.providerProfile.memberSince', { date: memberDate })}</span>
                </div>
              </div>
            </div>

            {/* Share */}
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h4 className="mb-3 text-sm font-bold text-[#0F172A]">{t('findTasks.providerProfile.shareTitle')}</h4>
              <div className="flex gap-2">
                {[t('findTasks.providerProfile.copyLink'), t('findTasks.providerProfile.email')].map((action) => (
                  <button key={action} className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-[#F97316] hover:text-[#F97316]">
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
