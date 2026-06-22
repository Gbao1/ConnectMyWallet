import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils/currency';
import SiteHeader from '../ui/SiteHeader';
import SiteFooter from '../ui/SiteFooter';

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const [taskCardVisible, setTaskCardVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTaskCardVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const heroBadges = t('home.heroBadges', { returnObjects: true });
  const categories = t('home.categories', { returnObjects: true });
  const whyCards = t('home.whyCards', { returnObjects: true });
  const testimonials = t('home.testimonials', { returnObjects: true });
  const whyIcons = [
    {
      iconBg: 'bg-[#DBEAFE]',
      iconColor: 'text-[#2563EB]',
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3l2 4 4 .5-3 3 1 4-4-2-4 2 1-4-3-3 4-.5z" />
        </svg>
      ),
    },
    {
      iconBg: 'bg-[#DCFCE7]',
      iconColor: 'text-[#16A34A]',
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="6" width="16" height="12" rx="2" />
          <path d="M4 10h16" />
          <path d="M9 15l2 2 4-4" />
        </svg>
      ),
    },
    {
      iconBg: 'bg-[#FEF3C7]',
      iconColor: 'text-[#EA580C]',
      icon: (
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3l2.1 4.3 4.7.7-3.4 3.3.8 4.7L12 14.9 7.8 16l.8-4.7L5.2 8l4.7-.7L12 3z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-12 md:py-16">
        <section className="grid flex-1 gap-8 md:grid-cols-2 md:items-center md:gap-12">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#F97316] sm:text-sm">
              {t('home.heroTagline')}
            </p>
            <h1 className="mt-3 text-3xl font-extrabold leading-tight text-[#0F172A] sm:mt-4 sm:text-4xl md:text-5xl lg:text-6xl">
              {t('home.heroTitle')}
            </h1>
            <p className="mt-3 text-base text-[#64748B] sm:mt-4 sm:text-lg">
              {t('home.heroSubtitle')}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
              <Link
                to="/tasks/new"
                className="inline-flex items-center justify-center rounded-full bg-[#F97316] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#ea580c] sm:px-6 sm:py-3 sm:text-sm"
              >
                {t('home.heroPrimaryCta')}
              </Link>
              <Link
                to="/find-tasks"
                className="inline-flex items-center justify-center rounded-full border border-[#0F172A] px-4 py-2.5 text-xs font-semibold text-[#0F172A] transition hover:bg-[#0F172A] hover:text-white sm:px-6 sm:py-3 sm:text-sm"
              >
                {t('home.heroSecondaryCta')}
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-[#0F172A] sm:mt-6 sm:gap-4">
              {heroBadges.map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#22C55E] text-[10px] text-white">
                    ✓
                  </span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mt-8 md:mt-0">
            <div className="overflow-hidden rounded-2xl bg-white shadow-[0_22px_55px_rgba(15,23,42,0.18)] transition-transform duration-300 hover:scale-[1.02] sm:rounded-[32px]">
              <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 overflow-hidden">
                <img
                  src="/images/laptop.jpg"
                  alt={t('home.heroImageAlt')}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
              </div>
            </div>
            <div
              className={`pointer-events-none absolute -bottom-2 left-2 w-max max-w-[85%] rounded-xl bg-white px-3 py-2 shadow-[0_18px_45px_rgba(15,23,42,0.16)] transition-all duration-500 ease-out sm:-bottom-4 sm:left-4 sm:max-w-none sm:rounded-2xl sm:px-5 sm:py-3 ${
                taskCardVisible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-4 opacity-0'
              }`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DCFCE7] sm:h-11 sm:w-11">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#22C55E] bg-[#DCFCE7] sm:h-9 sm:w-9">
                    <span className="text-sm font-semibold text-[#22C55E] sm:text-base">✓</span>
                  </div>
                </div>
                <div className="flex min-w-0 flex-col">
                  <p className="text-xs font-semibold text-[#0F172A] sm:text-sm">
                    {t('home.heroCardTitle')}
                  </p>
                  <p className="truncate text-[10px] font-medium text-[#64748B] sm:text-xs">
                    {t('home.heroCardSubtitle', {
                      amount: formatCurrency(1200, i18n.language, { maximumFractionDigits: 0 }),
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mt-12 sm:mt-16 md:mt-20">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-[#0F172A] sm:text-2xl md:text-3xl">
              {t('home.categoriesTitle')}
            </h2>
            <p className="mt-1.5 text-xs text-[#64748B] sm:mt-2 sm:text-sm md:text-base">
              {t('home.categoriesSubtitle')}
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-3">
            {categories.map((item) => (
              <div
                key={item.label}
                className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="h-36 w-full overflow-hidden sm:h-40">
                  <img
                    src={item.imageSrc}
                    alt={item.imageAlt || item.label}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4 sm:p-5">
                  <h3 className="text-base font-semibold text-[#0F172A] sm:text-lg">
                    {item.label}
                  </h3>
                  <p className="mt-1.5 text-xs text-[#64748B] sm:mt-2 sm:text-sm">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl bg-[#F1F5F9] px-4 py-8 sm:mt-16 sm:rounded-3xl sm:px-6 sm:py-10 md:mt-20 md:py-12">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-xl font-semibold text-[#0F172A] sm:text-2xl md:text-3xl">
              {t('home.whyTitle')}
            </h2>
          </div>
          <div className="mt-6 grid gap-8 sm:mt-8 sm:gap-10 md:grid-cols-3">
            {whyCards.map((item, index) => {
              const icon = whyIcons[index];
              return (
              <div
                key={item.title}
                className="flex flex-col items-center text-center"
              >
                <div
                  className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full ${icon?.iconBg} shadow-sm`}
                >
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${icon?.iconColor}`}
                  >
                    {icon?.icon}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-[#0F172A]">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs text-[#64748B] sm:text-sm">{item.copy}</p>
              </div>
              );
            })}
          </div>
        </section>

        <section className="mt-12 sm:mt-16 md:mt-20">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-[#0F172A] sm:text-2xl md:text-3xl">
              {t('home.testimonialsTitle')}
            </h2>
            <p className="mt-1.5 text-xs text-[#64748B] sm:mt-2 sm:text-sm md:text-base">
              {t('home.testimonialsSubtitle')}
            </p>
          </div>

          <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2">
            {testimonials.map((review) => (
              <article
                key={review.name}
                className="grid overflow-hidden rounded-xl bg-[#2563EB] text-white shadow-md sm:rounded-2xl md:grid-cols-[3fr,2fr]"
              >
                <div className="flex flex-col justify-between gap-2 px-3 py-3 sm:px-4 sm:py-4 md:py-5">
                  <div>
                    <div
                      className="flex items-center gap-0.5 text-sm text-[#FACC15]"
                      aria-label="Five star rating"
                    >
                      <span aria-hidden="true">★★★★★</span>
                    </div>
                    <p className="mt-2 text-xs font-medium leading-snug sm:text-sm md:text-base">
                      “{review.quote}”
                    </p>
                  </div>
                  <div className="mt-2 text-xs">
                    <p className="font-semibold">{review.name}</p>
                    <p className="text-[#E2E8F0]">{review.role}</p>
                  </div>
                </div>
                <div className="relative min-h-0 h-28 sm:h-32 md:h-full md:min-h-[140px]">
                  <img
                    src={review.image}
                    alt={review.imageAlt || review.name}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-2xl bg-[#0F172A] px-4 py-10 text-center sm:mt-16 sm:rounded-3xl sm:px-6 sm:py-12 md:mt-20 md:px-8 md:py-14">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-xl font-bold text-white sm:text-2xl md:text-3xl">
              {t('home.ctaTitle')}
            </h2>
            <p className="mt-2 text-sm text-white/90 sm:mt-3 sm:text-base md:text-lg">
              {t('home.ctaSubtitle')}
            </p>
            <div className="mt-6 sm:mt-8">
              <Link
                to="/auth"
                className="inline-flex w-full items-center justify-center rounded-full bg-[#F97316] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c] sm:w-auto sm:px-8 sm:py-3.5 sm:text-base"
              >
                {t('home.ctaButton')}
              </Link>
            </div>
          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  );
}
