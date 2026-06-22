import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteFooter from '../ui/SiteFooter';
import SiteHeader from '../ui/SiteHeader';
import { formatCurrency } from '../utils/currency';

const SECTION_IDS = ['hero', 'stats', 'howWeKeepYouSafe', 'rigorousScreening', 'staySafe', 'comprehensiveCoverage', 'needHelp'];

const SAFETY_FEATURE_ICONS = [
  (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M12 8v4l2 2" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
];

const STAY_SAFE_ICONS = [
  (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18A2 2 0 0 0 3.53 21h16.94A2 2 0 0 0 22.18 18L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v16M6 12l6 6 6-6" />
    </svg>
  ),
];

export default function TrustSafetyPage() {
  const { t, i18n } = useTranslation();
  const [visibleSections, setVisibleSections] = useState(() => new Set());
  const sectionRefs = useRef({});
  const stats = t('trustSafety.stats', { returnObjects: true });
  const safetyFeatures = t('trustSafety.safetyFeatures', { returnObjects: true });
  const screeningSteps = t('trustSafety.verification.steps', { returnObjects: true });
  const staySafeItems = t('trustSafety.bestPractices.items', { returnObjects: true });
  const coverageItems = t('trustSafety.coverage.items', { returnObjects: true });

  useEffect(() => {
    const refs = sectionRefs.current;
    const observers = [];
    SECTION_IDS.forEach((id) => {
      const el = refs[id];
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setVisibleSections((prev) => new Set(prev).add(id));
        },
        { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const animate = (id) =>
    `transition-all duration-700 ease-out ${
      visibleSections.has(id) ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F172A]">
      <SiteHeader />

      {/* Hero - Orange banner */}
      <section ref={(el) => (sectionRefs.current.hero = el)} className="bg-[#F97316] px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <div className={`mx-auto max-w-6xl ${animate('hero')}`}>
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl">
            {t('trustSafety.hero.title')}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white sm:text-lg">
            {t('trustSafety.hero.subtitle')}
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section ref={(el) => (sectionRefs.current.stats = el)} className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-8 sm:px-6 sm:py-10">
        <div className={`mx-auto grid max-w-6xl grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-6 ${animate('stats')}`}>
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-sm font-medium text-[#64748B]">{stat.label}</p>
              <p className="mt-1 text-2xl font-bold text-[#F97316] sm:text-3xl">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How We Keep You Safe */}
      <section ref={(el) => (sectionRefs.current.howWeKeepYouSafe = el)} className="bg-white px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <div className={`mx-auto max-w-6xl ${animate('howWeKeepYouSafe')}`}>
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">
              {t('trustSafety.safetyFirst.tagline')}
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#0F172A] sm:text-4xl">
              {t('trustSafety.safetyFirst.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[#64748B] sm:text-lg">
              {t('trustSafety.safetyFirst.subtitle')}
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 sm:gap-10">
            {safetyFeatures.map((feature, index) => (
              <div
                key={feature.title}
                className="flex gap-4 rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-[#F97316] text-[#F97316]">
                  {SAFETY_FEATURE_ICONS[index]}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-[#64748B] leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rigorous Provider Screening */}
      <section ref={(el) => (sectionRefs.current.rigorousScreening = el)} className="border-t border-[#E2E8F0] bg-[#F8FAFC] px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <div className={`mx-auto max-w-4xl ${animate('rigorousScreening')}`}>
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">
              {t('trustSafety.verification.tagline')}
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#0F172A] sm:text-4xl">
              {t('trustSafety.verification.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-[#64748B] leading-relaxed">
              {t('trustSafety.verification.subtitle')}
            </p>
          </div>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 sm:gap-8">
            {screeningSteps.map((item) => (
              <li key={item.step} className="flex gap-4 rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F97316] text-lg font-bold text-white">
                  {item.step}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-[#0F172A]">{item.title}</h3>
                  <p className="mt-1 text-sm text-[#64748B] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Stay Safe on the Platform */}
      <section ref={(el) => (sectionRefs.current.staySafe = el)} className="bg-white px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <div className={`mx-auto max-w-6xl ${animate('staySafe')}`}>
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">
              {t('trustSafety.bestPractices.tagline')}
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#0F172A] sm:text-4xl">
              {t('trustSafety.bestPractices.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[#64748B] sm:text-lg">
              {t('trustSafety.bestPractices.subtitle')}
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {staySafeItems.map((item, index) => (
              <div
                key={item.title}
                className="rounded-xl border border-[#E2E8F0] bg-white p-6 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[#F97316]">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FFF7ED] text-[#F97316]">
                    {STAY_SAFE_ICONS[index]}
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#0F172A]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-[#64748B] leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comprehensive Coverage */}
      <section ref={(el) => (sectionRefs.current.comprehensiveCoverage = el)} className="border-t border-[#E2E8F0] bg-[#FAFAF9] px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <div className={`mx-auto max-w-6xl ${animate('comprehensiveCoverage')}`}>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
            <div className="overflow-hidden rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.1)]">
              <img
                src="/images/security.png"
                alt={t('trustSafety.coverage.imageAlt')}
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">
                {t('trustSafety.coverage.tagline')}
              </p>
              <h2 className="mt-2 text-3xl font-bold text-[#0F172A] sm:text-4xl">
                {t('trustSafety.coverage.title')}
              </h2>
              <p className="mt-4 text-[#64748B] leading-relaxed">
                {t('trustSafety.coverage.subtitle')}
              </p>
              <ul className="mt-8 space-y-5">
                {coverageItems.map((item) => {
                  const title = item.amount
                    ? t('trustSafety.coverage.amountTitle', {
                      amount: formatCurrency(item.amount, i18n.language, { maximumFractionDigits: 0 }),
                    })
                    : item.title;
                  return (
                  <li key={item.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#F97316] bg-transparent text-[#F97316]">
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <div>
                      <h3 className="font-bold text-[#0F172A]">{title}</h3>
                      <p className="mt-0.5 text-sm text-[#64748B] leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </li>
                );
                })}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Need Help - CTA */}
      <section ref={(el) => (sectionRefs.current.needHelp = el)} className="bg-[#192036] px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <div className={`mx-auto max-w-3xl text-center ${animate('needHelp')}`}>
          <h2 className="text-2xl font-bold text-white sm:text-3xl md:text-4xl">
            {t('trustSafety.cta.title')}
          </h2>
          <p className="mt-3 text-white/90 sm:text-lg">
            {t('trustSafety.cta.subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/contact"
              className="inline-flex items-center justify-center rounded-lg bg-[#F97316] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#EA580C]"
            >
              {t('trustSafety.cta.contact')}
            </Link>
            <a
              href="tel:+18005550199"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white bg-transparent px-6 py-3 font-semibold text-white transition hover:bg-white hover:text-[#192036]"
            >
              {t('trustSafety.cta.emergency')}
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
