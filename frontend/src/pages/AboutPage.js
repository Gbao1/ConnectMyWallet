import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteFooter from '../ui/SiteFooter';
import SiteHeader from '../ui/SiteHeader';

const heroStatsMeta = [
  { key: 'founded', end: 2021, format: (n) => Math.round(n).toString() },
  { key: 'employees', end: 50, format: (n) => Math.round(n) + '+' },
  { key: 'activeUsers', end: 100, format: (n) => Math.round(n) + 'k+' },
  { key: 'countries', end: 12, format: (n) => Math.round(n).toString() },
];

const DURATION_MS = 1800;
const START_DELAY_MS = 300;

const timelineMeta = [
  { year: '2021', side: 'left' },
  { year: '2022', side: 'right' },
  { year: '2023', side: 'left' },
  { year: '2024', side: 'right' },
  { year: '2025', side: 'left' },
  { year: '2026', side: 'right' },
];

export default function AboutPage() {
  const { t } = useTranslation();
  const [contentVisible, setContentVisible] = useState(false);
  const [animatedValues, setAnimatedValues] = useState(heroStatsMeta.map(() => 0));
  const [visibleTimelineItems, setVisibleTimelineItems] = useState(() => new Set());
  const [valuesSectionVisible, setValuesSectionVisible] = useState(false);
  const [leadershipSectionVisible, setLeadershipSectionVisible] = useState(false);
  const [testimonialsSectionVisible, setTestimonialsSectionVisible] = useState(false);
  const [cultureSectionVisible, setCultureSectionVisible] = useState(false);
  const animationRef = useRef(null);
  const timelineItemRefs = useRef([]);
  const valuesSectionRef = useRef(null);
  const leadershipSectionRef = useRef(null);
  const testimonialsSectionRef = useRef(null);
  const cultureSectionRef = useRef(null);
  const timelineItems = t('about.timeline.items', { returnObjects: true });
  const valuesItems = t('about.values.items', { returnObjects: true });
  const leadershipMembers = t('about.leadership.members', { returnObjects: true });
  const testimonialItems = t('about.testimonials.items', { returnObjects: true });
  const culturePoints = t('about.culture.points', { returnObjects: true });
  const numbersStats = t('about.numbers.stats', { returnObjects: true });
  const valuesIcons = [
    (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M12 8v4" />
        <path d="M12 16h.01" />
      </svg>
    ),
    (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3l2.1 4.3 4.7.7-3.4 3.3.8 4.7L12 14.9l-4.2 2.2.8-4.7L3 8.5l4.7-.7L12 3z" />
      </svg>
    ),
    (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
    ),
  ];
  const leadershipImages = ['/images/1.png', '/images/3.png', '/images/2.png', '/images/man3.png'];
  const cultureImages = [
    { src: '/images/team1.png', key: 'team1' },
    { src: '/images/team2.png', key: 'team2' },
    { src: '/images/team3.png', key: 'team3' },
  ];

  useEffect(() => {
    const t = setTimeout(() => setContentVisible(true), 150);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const observers = [];
    timelineItemRefs.current.forEach((el, i) => {
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleTimelineItems((prev) => new Set(prev).add(i));
          }
        },
        { threshold: 0.2, rootMargin: '0px 0px -40px 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  useEffect(() => {
    const el = valuesSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setValuesSectionVisible(true);
      },
      { threshold: 0.15, rootMargin: '0px 0px -30px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = leadershipSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setLeadershipSectionVisible(true);
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = testimonialsSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setTestimonialsSectionVisible(true);
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = cultureSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setCultureSectionVisible(true);
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!contentVisible) return;
    const startTime = performance.now();
    const run = (now) => {
      const elapsed = now - startTime - START_DELAY_MS;
      if (elapsed < 0) {
        animationRef.current = requestAnimationFrame(run);
        return;
      }
      const progress = Math.min(1, elapsed / DURATION_MS);
      const eased = 1 - (1 - progress) ** 2;
      setAnimatedValues(
        heroStatsMeta.map((stat) => stat.end * eased)
      );
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(run);
      }
    };
    animationRef.current = requestAnimationFrame(run);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [contentVisible]);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Hero with team image and transparent navbar */}
      <section className="relative min-h-[85vh] w-full overflow-x-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/images/team.png)' }}
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/90 via-[#1E293B]/75 to-[#78350F]/60"
          aria-hidden="true"
        />
        <div className="relative z-30">
          <SiteHeader />
        </div>
        <div className="relative z-10 mx-auto flex min-h-[calc(85vh-4rem)] w-full max-w-6xl flex-col justify-end px-4 pb-16 pt-12 sm:px-6 sm:pb-20 md:justify-center md:pb-24">
          <h1
            className={`max-w-2xl text-3xl font-bold leading-tight text-white transition-all duration-700 ease-out sm:text-4xl md:text-5xl lg:text-6xl ${
              contentVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            {t('about.hero.title')}
          </h1>
          <p
            className={`mt-4 max-w-xl text-base leading-relaxed text-white/95 transition-all duration-700 ease-out delay-150 sm:text-lg ${
              contentVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            {t('about.hero.subtitle')}
          </p>
          <div
            className={`mt-10 flex flex-wrap gap-x-16 gap-y-6 transition-all duration-700 ease-out delay-300 sm:gap-x-20 md:gap-x-24 ${
              contentVisible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
            }`}
          >
            {heroStatsMeta.map((stat, i) => (
              <div key={stat.key}>
                <p className="text-2xl font-bold text-white sm:text-3xl md:text-4xl tabular-nums">
                  {stat.format(animatedValues[i])}
                </p>
                <p className="mt-1 text-sm font-medium text-white/90 sm:text-base">
                  {t(`about.hero.stats.${stat.key}`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Mission - two columns with work.png */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 sm:px-6 md:grid-cols-2 md:items-center">
          <div
            className={`transition-all duration-700 ease-out ${
              contentVisible ? 'translate-x-0 opacity-100' : '-translate-x-6 opacity-0'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF7ED] text-[#F97316]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </span>
              <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">
                {t('about.mission.tagline')}
              </p>
            </div>
            <h2 className="mt-4 text-3xl font-bold text-[#0F172A] sm:text-4xl">
              {t('about.mission.title')}
            </h2>
            <p className="mt-4 text-[#64748B] leading-relaxed">
              {t('about.mission.paragraph1')}
            </p>
            <p className="mt-4 text-[#64748B] leading-relaxed">
              {t('about.mission.paragraph2')}
            </p>
          </div>
          <div
            className={`relative transition-all duration-700 ease-out delay-150 ${
              contentVisible ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'
            }`}
          >
            <div className="overflow-hidden rounded-2xl shadow-lg">
              <img
                src="/images/work.png"
                alt={t('about.mission.imageAlt')}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-3 right-4 flex items-center gap-2 rounded-xl bg-[#F97316] px-4 py-3 text-white shadow-lg sm:right-6 sm:-bottom-4 sm:px-5 sm:py-4">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              <div>
                <p className="text-xl font-bold leading-tight sm:text-2xl">{t('about.mission.satisfactionValue')}</p>
                <p className="text-xs font-medium text-white/95 sm:text-sm">{t('about.mission.satisfactionLabel')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Timeline - Our Journey */}
      <section className="bg-[#F8FAFC] py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <p className="text-center text-sm font-semibold uppercase tracking-wide text-[#F97316]">
            {t('about.timeline.tagline')}
          </p>
          <h2 className="mt-2 text-center text-3xl font-bold text-[#0F172A] sm:text-4xl">
            {t('about.timeline.title')}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[#64748B]">
            {t('about.timeline.subtitle')}
          </p>

          <div className="relative mt-14 sm:mt-16">
            {/* Vertical line - thin, muted orange, centered */}
            <div
              className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-[#EA580C]/70"
              aria-hidden="true"
            />

            <ul className="space-y-12 sm:space-y-14">
              {timelineMeta.map((item, index) => {
                const isVisible = visibleTimelineItems.has(index);
                const content = timelineItems[index] || {};
                return (
                <li
                  key={item.year}
                  ref={(el) => { timelineItemRefs.current[index] = el; }}
                  className={`relative flex flex-col gap-3 sm:grid sm:grid-cols-[1fr_auto_1fr] sm:grid-rows-[auto_1fr] sm:gap-x-0 sm:gap-y-2 transition-all duration-700 ease-out ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                  }`}
                >
                  {/* Row 1: year pill + connector + dot (centered on line) */}
                  <div className={`flex items-center justify-center sm:col-span-3 transition-transform duration-500 delay-150 ease-out ${isVisible ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
                    <div className="flex items-center">
                      {item.side === 'left' ? (
                        <>
                          <span className="rounded-full bg-[#F97316] px-3 py-1.5 text-sm font-semibold text-white">
                            {item.year}
                          </span>
                          <div
                            className="h-px w-4 flex-shrink-0 bg-[#F97316] sm:w-5"
                            aria-hidden="true"
                          />
                        </>
                      ) : null}
                      <div
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#F97316] ring-4 ring-[#F8FAFC]"
                        aria-hidden="true"
                      />
                      {item.side === 'right' ? (
                        <>
                          <div
                            className="h-px w-4 flex-shrink-0 bg-[#F97316] sm:w-5"
                            aria-hidden="true"
                          />
                          <span className="rounded-full bg-[#F97316] px-3 py-1.5 text-sm font-semibold text-white">
                            {item.year}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {/* Row 2: title + description (below year, left or right) */}
                  <div
                    className={`min-w-0 px-2 sm:col-start-1 sm:row-start-2 sm:pr-6 transition-all duration-600 ease-out delay-200 ${
                      item.side === 'left' ? 'sm:text-right' : ''
                    } ${item.side === 'left' ? (isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6') : ''}`}
                  >
                    {item.side === 'left' && (
                      <div className="sm:ml-auto sm:max-w-sm">
                        <h3 className="text-lg font-bold text-[#0F172A] sm:text-xl">
                          {content.title}
                        </h3>
                        <p className="mt-1.5 text-[#64748B] leading-relaxed sm:mt-2">
                          {content.description}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="hidden sm:block sm:col-start-2 sm:row-start-2" />
                  <div
                    className={`min-w-0 px-2 sm:col-start-3 sm:row-start-2 sm:pl-6 transition-all duration-600 ease-out delay-200 ${
                      item.side === 'right' ? 'sm:text-left' : ''
                    } ${item.side === 'right' ? (isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6') : ''}`}
                  >
                    {item.side === 'right' && (
                      <div className="sm:max-w-sm">
                        <h3 className="text-lg font-bold text-[#0F172A] sm:text-xl">
                          {content.title}
                        </h3>
                        <p className="mt-1.5 text-[#64748B] leading-relaxed sm:mt-2">
                          {content.description}
                        </p>
                      </div>
                    )}
                  </div>
                </li>
              ); })}
            </ul>
          </div>
        </div>
      </section>

      {/* Our Values - What Drives Us */}
      <section ref={valuesSectionRef} className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div
            className={`transition-all duration-700 ease-out ${
              valuesSectionVisible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-6 opacity-0'
            }`}
          >
            <p className="text-center text-sm font-semibold uppercase tracking-wide text-[#F97316]">
              {t('about.values.tagline')}
            </p>
            <h2 className="mt-2 text-center text-3xl font-bold text-[#0F172A] sm:text-4xl">
              {t('about.values.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-[#64748B]">
              {t('about.values.subtitle')}
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 sm:gap-10">
            {valuesItems.map((item, index) => (
              <div
                key={item.title}
                className={`flex gap-4 sm:gap-5 transition-all duration-600 ease-out ${
                  valuesSectionVisible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-6 opacity-0'
                }`}
                style={
                  valuesSectionVisible
                    ? { transitionDelay: `${200 + index * 100}ms` }
                    : {}
                }
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#F97316] text-white sm:h-14 sm:w-14">
                  {valuesIcons[index]}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-[#0F172A] sm:text-xl">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-[#64748B] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Team */}
      <section ref={leadershipSectionRef} className="bg-[#F8FAFC] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div
            className={`transition-all duration-700 ease-out ${
              leadershipSectionVisible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-6 opacity-0'
            }`}
          >
            <p className="text-center text-sm font-semibold uppercase tracking-wide text-[#F97316]">
              {t('about.leadership.tagline')}
            </p>
            <h2 className="mt-2 text-center text-3xl font-bold text-[#0F172A] sm:text-4xl">
              {t('about.leadership.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-[#64748B]">
              {t('about.leadership.subtitle')}
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {leadershipMembers.map((member, index) => (
              <div
                key={member.name}
                className={`overflow-hidden rounded-xl bg-white shadow-md transition-all duration-600 ease-out ${
                  leadershipSectionVisible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-6 opacity-0'
                }`}
                style={
                  leadershipSectionVisible
                    ? { transitionDelay: `${200 + index * 100}ms` }
                    : {}
                }
              >
                <div className="aspect-[4/5] w-full overflow-hidden rounded-t-xl bg-[#E2E8F0]">
                  <img
                    src={leadershipImages[index]}
                    alt={member.imageAlt || member.name}
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    {member.name}
                  </h3>
                  <p className="mt-0.5 text-sm font-medium text-[#F97316]">
                    {member.title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                    {member.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section ref={testimonialsSectionRef} className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div
            className={`transition-all duration-700 ease-out ${
              testimonialsSectionVisible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-6 opacity-0'
            }`}
          >
            <p className="text-center text-sm font-semibold uppercase tracking-wide text-[#F97316]">
              {t('about.testimonials.tagline')}
            </p>
            <h2 className="mt-2 text-center text-3xl font-bold text-[#0F172A] sm:text-4xl">
              {t('about.testimonials.title')}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-[#64748B]">
              {t('about.testimonials.subtitle')}
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {testimonialItems.map((item, index) => (
              <div
                key={item.name}
                className={`relative overflow-hidden rounded-xl bg-white p-6 shadow-md transition-all duration-600 ease-out ${
                  testimonialsSectionVisible
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-6 opacity-0'
                }`}
                style={
                  testimonialsSectionVisible
                    ? { transitionDelay: `${200 + index * 100}ms` }
                    : {}
                }
              >
                <span
                  className="pointer-events-none absolute right-3 top-2 text-6xl font-serif leading-none text-[#F97316] opacity-30 sm:right-4 sm:top-3 sm:text-7xl"
                  aria-hidden
                >
                  &ldquo;
                </span>
                <p className="relative text-[#64748B] leading-relaxed">
                  {item.quote}
                </p>
                <div className="relative mt-5">
                  <p className="font-bold text-[#0F172A]">{item.name}</p>
                  <p className="text-sm text-[#64748B]">{item.role}</p>
                  <p className="text-sm font-medium text-[#F97316]">
                    {item.affiliation}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Culture */}
      <section ref={cultureSectionRef} className="bg-[#FAF8F5] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-14">
            <div
              className={`transition-all duration-700 ease-out ${
                cultureSectionVisible
                  ? 'translate-x-0 opacity-100'
                  : '-translate-x-6 opacity-0'
              }`}
            >
              <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">
                {t('about.culture.tagline')}
              </p>
              <h2 className="mt-2 text-3xl font-bold text-[#0F172A] sm:text-4xl">
                {t('about.culture.title')}
              </h2>
              <p className="mt-4 text-[#64748B] leading-relaxed">
                {t('about.culture.subtitle')}
              </p>
              <ul className="mt-6 space-y-3">
                {culturePoints.map((item) => (
                  <li key={item.title} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-[#F97316] bg-transparent text-[#F97316]">
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                    <div>
                      <span className="font-semibold text-[#0F172A]">{item.title}:</span>
                      <span className="text-[#64748B]"> {item.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <Link
                to="/find-tasks"
                className="mt-8 inline-flex items-center gap-1.5 font-semibold text-[#F97316] transition-colors hover:text-[#EA580C]"
              >
                {t('about.culture.cta')}
                <span aria-hidden>→</span>
              </Link>
            </div>

            <div
              className={`relative flex items-center justify-center transition-all duration-700 ease-out ${
                cultureSectionVisible
                  ? 'translate-x-0 opacity-100'
                  : 'translate-x-6 opacity-0'
              }`}
              style={{ transitionDelay: '150ms' }}
            >
              <div className="relative grid max-w-sm grid-cols-2 gap-3 sm:gap-4">
                <div className="relative overflow-hidden rounded-xl shadow-lg ring-1 ring-black/5">
                  <img
                    src={cultureImages[0].src}
                    alt={t(`about.culture.images.${cultureImages[0].key}`)}
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
                <div className="relative overflow-hidden rounded-xl shadow-lg ring-1 ring-black/5 sm:mt-6">
                  <img
                    src={cultureImages[1].src}
                    alt={t(`about.culture.images.${cultureImages[1].key}`)}
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
                <div className="relative col-span-2 overflow-hidden rounded-xl shadow-lg ring-1 ring-black/5 sm:-mt-4">
                  <img
                    src={cultureImages[2].src}
                    alt={t(`about.culture.images.${cultureImages[2].key}`)}
                    className="aspect-[21/9] w-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* By the Numbers */}
      <section className="bg-[#F97316] py-14 sm:py-16 md:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
            {t('about.numbers.title')}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-base text-[#1E293B] sm:text-lg">
            {t('about.numbers.subtitle')}
          </p>
          <div className="mt-10 grid grid-cols-2 gap-8 sm:grid-cols-4 sm:gap-6">
            {numbersStats.map((stat) => (
              <div key={stat.label}>
                <p className="text-sm font-medium text-white/90">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ready to Join Our Community */}
      <section className="bg-white py-14 sm:py-16 md:py-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 text-center">
          <h2 className="text-2xl font-bold text-[#0F172A] sm:text-3xl">
            {t('about.finalCta.title')}
          </h2>
          <p className="mt-3 text-[#64748B] leading-relaxed">
            {t('about.finalCta.subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/auth?mode=signup"
              className="inline-flex items-center justify-center rounded-lg bg-[#F97316] px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-[#EA580C]"
            >
              {t('about.finalCta.primary')}
            </Link>
            <Link
              to="/how-it-works"
              className="inline-flex items-center gap-1.5 font-medium text-[#0F172A] transition hover:text-[#F97316]"
            >
              {t('about.finalCta.secondary')}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
