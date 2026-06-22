import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteFooter from '../ui/SiteFooter';
import SiteHeader from '../ui/SiteHeader';

const CATEGORY_META = [
  { key: 'all', value: 'All' },
  { key: 'engineering', value: 'Engineering' },
  { key: 'product', value: 'Product' },
  { key: 'design', value: 'Design' },
  { key: 'marketing', value: 'Marketing' },
  { key: 'operations', value: 'Operations' },
  { key: 'data', value: 'Data' },
];

const JOBS_PER_PAGE = 6;

export default function CareersPage() {
  const { t } = useTranslation();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(JOBS_PER_PAGE);
  const positionsRef = useRef(null);
  const categories = CATEGORY_META.map((cat) => ({
    ...cat,
    label: t(`careers.categories.${cat.key}`),
  }));
  const jobs = t('careers.jobs', { returnObjects: true });
  const filteredJobs = useMemo(() => {
    if (categoryFilter === 'all') return jobs;
    return jobs.filter((j) => j.departmentKey === categoryFilter);
  }, [categoryFilter, jobs]);
  const jobsToShow = useMemo(() => filteredJobs.slice(0, visibleCount), [filteredJobs, visibleCount]);
  const hasMore = visibleCount < filteredJobs.length;
  const handleCategoryChange = (cat) => {
    setCategoryFilter(cat);
    setVisibleCount(JOBS_PER_PAGE);
  };
  const categoryCounts = useMemo(() => {
    const counts = { all: jobs.length };
    CATEGORY_META.slice(1).forEach((cat) => {
      counts[cat.key] = jobs.filter((j) => j.departmentKey === cat.key).length;
    });
    return counts;
  }, [jobs]);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F172A]">
      <SiteHeader />

      {/* Hero / Join Our Mission */}
      <section className="bg-gradient-to-b from-[#f97316] via-[#f97316] to-[#ea580c] px-4 py-16 text-white sm:px-6 sm:py-20 md:py-24">
        <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
          <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">
            {t('careers.hero.title')}
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-white/90 sm:text-base">
            {t('careers.hero.subtitle')}
          </p>
          <button
            type="button"
            onClick={() => {
              if (positionsRef.current) {
                positionsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="mt-8 inline-flex items-center justify-center rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#ea580c] shadow-md transition hover:-translate-y-0.5 hover:bg-[#fef2e2] hover:shadow-lg sm:px-8 sm:text-base"
          >
            {t('careers.hero.cta')}
          </button>

          <div className="mt-10 grid w-full gap-4 sm:mt-12 sm:grid-cols-3 sm:gap-6 md:max-w-3xl">
            <div className="rounded-2xl bg-white/10 px-6 py-4 text-center backdrop-blur-sm sm:py-5">
              <p className="text-2xl font-bold">{t('careers.hero.stats.team.value')}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-white/80">
                {t('careers.hero.stats.team.label')}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-6 py-4 text-center backdrop-blur-sm sm:py-5">
              <p className="text-2xl font-bold">{t('careers.hero.stats.countries.value')}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-white/80">
                {t('careers.hero.stats.countries.label')}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-6 py-4 text-center backdrop-blur-sm sm:py-5">
              <p className="text-2xl font-bold">{t('careers.hero.stats.openRoles.value')}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-white/80">
                {t('careers.hero.stats.openRoles.label')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why ConnectMyTask */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <section className="grid items-center gap-10 md:grid-cols-2">
          <div className="overflow-hidden rounded-3xl bg-[#111827]/5 shadow-md">
            <img
              src="/images/work1.png"
              alt={t('careers.mission.imageAlt')}
              className="h-full w-full object-cover"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F97316]">
              {t('careers.mission.tagline')}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#0F172A] sm:text-3xl">
              {t('careers.mission.title')}
            </h2>
            <p className="mt-3 text-sm text-[#64748B] sm:text-base">
              {t('careers.mission.subtitle')}
            </p>

            <div className="mt-8 space-y-5 text-sm text-[#111827] sm:text-base">
              <div className="flex gap-3">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF7ED] text-[#EA580C]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 18V12" />
                    <path d="M12 18V8" />
                    <path d="M18 18V4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-[#0F172A]">{t('careers.mission.items.0.title')}</h3>
                  <p className="mt-1 text-[#64748B]">
                    {t('careers.mission.items.0.description')}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF7ED] text-[#EA580C]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="9" cy="8" r="3" />
                    <circle cx="17" cy="8" r="3" />
                    <path d="M4 19c0-2.5 2-4.5 4.5-4.5h1" />
                    <path d="M20 19c0-2.5-2-4.5-4.5-4.5h-1" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-[#0F172A]">{t('careers.mission.items.1.title')}</h3>
                  <p className="mt-1 text-[#64748B]">
                    {t('careers.mission.items.1.description')}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF7ED] text-[#EA580C]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-[#0F172A]">{t('careers.mission.items.2.title')}</h3>
                  <p className="mt-1 text-[#64748B]">
                    {t('careers.mission.items.2.description')}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#FFF7ED] text-[#EA580C]">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 21s-5-3.3-8-6.3C2.4 13.1 2 11.9 2 10.7 2 8.6 3.6 7 5.7 7c1.1 0 2.2.5 3 1.3L12 11l3.3-2.7C16.1 7.5 17.2 7 18.3 7 20.4 7 22 8.6 22 10.7c0 1.2-.4 2.4-2 4-3 3-8 6.3-8 6.3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-[#0F172A]">{t('careers.mission.items.3.title')}</h3>
                  <p className="mt-1 text-[#64748B]">
                    {t('careers.mission.items.3.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits & Perks */}
        <section className="mt-16 sm:mt-20">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#F97316]">
            {t('careers.benefits.tagline')}
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#0F172A] sm:text-3xl">
            {t('careers.benefits.title')}
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-[#64748B] sm:text-base">
            {t('careers.benefits.subtitle')}
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#FDBA74] bg-[#FFF7ED] text-[#EA580C]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-[#0F172A]">{t('careers.benefits.items.0.title')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                {t('careers.benefits.items.0.description')}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#FDBA74] bg-[#FFF7ED] text-[#EA580C]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M23 12a11 11 0 0 0-22 0 10 10 0 0 0 5 8.66V20h12v-1.34A10 10 0 0 0 23 12z" />
                  <path d="M12 12v9" />
                  <path d="M8 21h8" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-[#0F172A]">{t('careers.benefits.items.1.title')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                {t('careers.benefits.items.1.description')}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#FDBA74] bg-[#FFF7ED] text-[#EA580C]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8" />
                  <path d="M12 17v4" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-[#0F172A]">{t('careers.benefits.items.2.title')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                {t('careers.benefits.items.2.description')}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#FDBA74] bg-[#FFF7ED] text-[#EA580C]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-[#0F172A]">{t('careers.benefits.items.3.title')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                {t('careers.benefits.items.3.description')}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#FDBA74] bg-[#FFF7ED] text-[#EA580C]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  <path d="M8 7h8" />
                  <path d="M8 11h6" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-[#0F172A]">{t('careers.benefits.items.4.title')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                {t('careers.benefits.items.4.description')}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#FDBA74] bg-[#FFF7ED] text-[#EA580C]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-[#0F172A]">{t('careers.benefits.items.5.title')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                {t('careers.benefits.items.5.description')}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#FDBA74] bg-[#FFF7ED] text-[#EA580C]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="9" cy="8" r="3" />
                  <circle cx="15" cy="8" r="3" />
                  <path d="M5 20c0-2.5 2-4.5 4.5-4.5h1" />
                  <path d="M19 20c0-2.5-2-4.5-4.5-4.5h-1" />
                  <path d="M12 12v2" />
                  <path d="M10 14h4" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-[#0F172A]">{t('careers.benefits.items.6.title')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                {t('careers.benefits.items.6.description')}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#FDBA74] bg-[#FFF7ED] text-[#EA580C]">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 21s-5-3.3-8-6.3C2.4 13.1 2 11.9 2 10.7 2 8.6 3.6 7 5.7 7c1.1 0 2.2.5 3 1.3L12 11l3.3-2.7C16.1 7.5 17.2 7 18.3 7 20.4 7 22 8.6 22 10.7c0 1.2-.4 2.4-2 4-3 3-8 6.3-8 6.3z" />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-[#0F172A]">{t('careers.benefits.items.7.title')}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                {t('careers.benefits.items.7.description')}
              </p>
            </div>
          </div>
        </section>

        {/* Our Values */}
        <section className="mt-20 sm:mt-24">
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-[#F97316]">
            {t('careers.values.tagline')}
          </p>
          <h2 className="mt-2 text-center text-2xl font-bold text-[#0F172A] sm:text-3xl">
            {t('careers.values.title')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#64748B] sm:text-base">
            {t('careers.values.subtitle')}
          </p>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl bg-[#FFF7ED] px-5 py-4 shadow-sm sm:px-6 sm:py-5">
              <h3 className="text-sm font-semibold text-[#0F172A] sm:text-base">{t('careers.values.items.0.title')}</h3>
              <p className="mt-2 text-sm text-[#64748B]">
                {t('careers.values.items.0.description')}
              </p>
            </div>
            <div className="rounded-2xl bg-[#FFF7ED] px-5 py-4 shadow-sm sm:px-6 sm:py-5">
              <h3 className="text-sm font-semibold text-[#0F172A] sm:text-base">{t('careers.values.items.1.title')}</h3>
              <p className="mt-2 text-sm text-[#64748B]">
                {t('careers.values.items.1.description')}
              </p>
            </div>
            <div className="rounded-2xl bg-[#FFF7ED] px-5 py-4 shadow-sm sm:px-6 sm:py-5">
              <h3 className="text-sm font-semibold text-[#0F172A] sm:text-base">{t('careers.values.items.2.title')}</h3>
              <p className="mt-2 text-sm text-[#64748B]">
                {t('careers.values.items.2.description')}
              </p>
            </div>
            <div className="rounded-2xl bg-[#FFF7ED] px-5 py-4 shadow-sm sm:px-6 sm:py-5">
              <h3 className="text-sm font-semibold text-[#0F172A] sm:text-base">{t('careers.values.items.3.title')}</h3>
              <p className="mt-2 text-sm text-[#64748B]">
                {t('careers.values.items.3.description')}
              </p>
            </div>
            <div className="rounded-2xl bg-[#FFF7ED] px-5 py-4 shadow-sm sm:px-6 sm:py-5">
              <h3 className="text-sm font-semibold text-[#0F172A] sm:text-base">{t('careers.values.items.4.title')}</h3>
              <p className="mt-2 text-sm text-[#64748B]">
                {t('careers.values.items.4.description')}
              </p>
            </div>
            <div className="rounded-2xl bg-[#FFF7ED] px-5 py-4 shadow-sm sm:px-6 sm:py-5">
              <h3 className="text-sm font-semibold text-[#0F172A] sm:text-base">{t('careers.values.items.5.title')}</h3>
              <p className="mt-2 text-sm text-[#64748B]">
                {t('careers.values.items.5.description')}
              </p>
            </div>
          </div>
        </section>

        {/* Diversity & Inclusion */}
        <section className="mt-20 grid items-center gap-10 sm:mt-24 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F97316]">
              {t('careers.diversity.tagline')}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#0F172A] sm:text-3xl">
              {t('careers.diversity.title')}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#64748B] sm:text-base">
              {t('careers.diversity.subtitle')}
            </p>
            <ul className="mt-6 space-y-3">
              <li className="flex items-center gap-3 text-sm text-[#0F172A] sm:text-base">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F97316] text-white">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                {t('careers.diversity.points.0')}
              </li>
              <li className="flex items-center gap-3 text-sm text-[#0F172A] sm:text-base">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F97316] text-white">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                {t('careers.diversity.points.1')}
              </li>
              <li className="flex items-center gap-3 text-sm text-[#0F172A] sm:text-base">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F97316] text-white">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                {t('careers.diversity.points.2')}
              </li>
            </ul>
          </div>
          <div className="overflow-hidden rounded-2xl shadow-md">
            <img
              src="/images/team4.png"
              alt={t('careers.diversity.imageAlt')}
              className="h-full w-full object-cover"
            />
          </div>
        </section>

        {/* Open Positions */}
        <section
          ref={positionsRef}
          className="mt-20 sm:mt-24"
        >
          <p className="text-center text-xs font-semibold uppercase tracking-wide text-[#F97316]">
            {t('careers.positions.tagline')}
          </p>
          <h2 className="mt-2 text-center text-2xl font-bold text-[#0F172A] sm:text-3xl">
            {t('careers.positions.title')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-[#64748B] sm:text-base">
            {t('careers.positions.subtitle')}
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-2 sm:gap-3">
            {categories.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => handleCategoryChange(cat.key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition sm:px-5 ${
                  categoryFilter === cat.key
                    ? 'bg-[#F97316] text-white shadow-sm'
                    : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]'
                }`}
              >
                {cat.label} {cat.key === 'all' ? '' : `(${categoryCounts[cat.key]})`}
              </button>
            ))}
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {jobsToShow.map((job) => (
              <article
                key={job.id}
                className="flex flex-col rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:shadow-md sm:p-6"
              >
                <h3 className="text-lg font-bold text-[#0F172A]">{job.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#64748B]">
                  <span className="flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#94A3B8]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                    {t(`careers.categories.${job.departmentKey}`)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#94A3B8]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    {job.location}
                  </span>
                  <span className="rounded-full bg-[#F97316] px-2.5 py-0.5 text-xs font-medium text-white">
                    {t('careers.positions.fullTime')}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#64748B]">{job.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-[#F1F5F9] px-3 py-1 text-xs font-medium text-[#475569]">
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex-1" />
                <Link
                  to="/contact"
                  className="mt-4 block w-full rounded-xl bg-[#F97316] py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#EA580C]"
                >
                  {t('careers.positions.apply')}
                </Link>
              </article>
            ))}
          </div>

          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + JOBS_PER_PAGE)}
                className="rounded-xl border-2 border-[#F97316] bg-white px-6 py-2.5 text-sm font-semibold text-[#F97316] transition hover:bg-[#FFF7ED]"
              >
                {t('careers.positions.loadMore')}
              </button>
            </div>
          )}

          <div className="mt-14 rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] px-6 py-8 text-center sm:px-8 sm:py-10">
            <h3 className="text-xl font-bold text-[#0F172A]">{t('careers.positions.final.title')}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-[#64748B] sm:text-base">
              {t('careers.positions.final.subtitle')}
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-block rounded-xl bg-[#F97316] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#EA580C]"
            >
              {t('careers.positions.final.cta')}
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
