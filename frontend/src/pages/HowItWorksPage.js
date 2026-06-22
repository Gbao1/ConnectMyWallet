import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteFooter from '../ui/SiteFooter';
import SiteHeader from '../ui/SiteHeader';

const stepsMeta = [
  {
    iconBg: 'bg-[#FEF3C7]',
    iconRing: 'text-[#FDBA74]',
    iconColor: 'text-[#F97316]',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M9 3v4" />
        <path d="M15 3v4" />
        <path d="M4 10h16" />
      </svg>
    ),
  },
  {
    iconBg: 'bg-[#E0E7FF]',
    iconRing: 'text-[#A5B4FC]',
    iconColor: 'text-[#4F46E5]',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="5" />
        <path d="M16 16l3.5 3.5" />
      </svg>
    ),
  },
  {
    iconBg: 'bg-[#E0F2FE]',
    iconRing: 'text-[#7DD3FC]',
    iconColor: 'text-[#0EA5E9]',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 12.5 11.2 15 15 9" />
        <circle cx="12" cy="12" r="7" />
      </svg>
    ),
  },
  {
    iconBg: 'bg-[#DCFCE7]',
    iconRing: 'text-[#86EFAC]',
    iconColor: 'text-[#16A34A]',
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="h-6 w-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="4" y="7" width="16" height="13" rx="2" />
        <path d="M4 11h16" />
        <path d="M9 15h2" />
      </svg>
    ),
  },
];

export default function HowItWorksPage() {
  const { t } = useTranslation();
  const steps = t('howItWorks.steps', { returnObjects: true });

  return (
    <div className="min-h-screen bg-white text-[#0F172A]">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:px-6 sm:py-12 md:py-16">
        <section className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#F97316] sm:text-sm">
            {t('howItWorks.tagline')}
          </p>
          <h1 className="mt-3 text-3xl font-extrabold text-[#0F172A] sm:text-4xl md:text-5xl">
            {t('howItWorks.title')}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-[#64748B] sm:mt-4 sm:text-base">
            {t('howItWorks.subtitle')}
          </p>
        </section>

        <section className="mt-8 sm:mt-10 md:mt-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, index) => {
              const meta = stepsMeta[index];
              return (
              <div key={step.title} className="flex flex-col items-start gap-3 text-left">
                <div
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-xl ${meta?.iconBg}`}
                >
                  <div
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border border-current bg-white ${meta?.iconRing}`}
                  >
                    <span className={`inline-flex items-center justify-center ${meta?.iconColor}`}>
                      {meta?.icon}
                    </span>
                  </div>
                </div>
                <h3 className="text-base font-semibold text-[#0F172A] sm:text-lg">
                  {step.title}
                </h3>
                <p className="text-sm text-[#64748B]">{step.description}</p>
              </div>
              );
            })}
          </div>
        </section>

        <section className="mt-12 flex justify-center">
          <Link
            to="/tasks/new"
            className="inline-flex items-center justify-center rounded-full bg-[#F97316] px-8 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c] sm:text-base"
          >
            {t('howItWorks.cta')}
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
