import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SiteFooter from '../ui/SiteFooter';
import SiteHeader from '../ui/SiteHeader';
import { getLocaleForLanguage } from '../utils/currency';

const PRIVACY_SECTION_IDS = [
  'hero',
  'principles',
  'sec1',
  'sec2',
  'sec3',
  'sec4',
  'sec5',
  'sec6',
  'sec7',
  'sec8',
  'sec9',
  'sec10',
  'sec11',
  'bottomLinks',
];

export default function PrivacyPolicyPage() {
  const { t, i18n } = useTranslation();
  const privacy = t('privacyPolicy', { returnObjects: true });
  const today = new Date().toLocaleDateString(getLocaleForLanguage(i18n.language), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const [visibleSections, setVisibleSections] = useState(() => new Set(['hero']));
  const sectionRefs = useRef({});

  useEffect(() => {
    const refs = sectionRefs.current;
    const observers: IntersectionObserver[] = [];

    PRIVACY_SECTION_IDS.forEach((id) => {
      const el = refs[id];
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleSections((prev) => {
              const next = new Set(prev);
              next.add(id);
              return next;
            });
          }
        },
        {
          threshold: 0.08,
          rootMargin: '0px 0px -40px 0px',
        }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, []);

  const animate = (id) =>
    `transition-all duration-700 ease-out ${
      visibleSections.has(id) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F172A]">
      <SiteHeader />

      {/* Hero - dark blue */}
      <section className="bg-[#1e3a5f] px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <div
          ref={(el) => {
            sectionRefs.current.hero = el;
          }}
          className={`mx-auto flex max-w-5xl flex-col items-center text-center text-white ${animate('hero')}`}
        >
          <div className="flex h-14 w-14 items-center justify-center sm:h-16 sm:w-16">
            <svg
              viewBox="0 0 24 24"
              className="h-10 w-10 text-white sm:h-12 sm:w-12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <ellipse cx="12" cy="5" rx="9" ry="3" />
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              <path d="M21 5c0 1.66-4 3-9 3S3 6.66 3 5" />
              <path d="M21 12v7c0 1.66-4 3-9 3s-9-1.34-9-3v-7" />
            </svg>
          </div>
          <h1 className="mt-6 text-3xl font-bold sm:text-4xl md:text-5xl">
            {privacy.hero.title}
          </h1>
          <p className="mt-3 text-sm text-white/90 sm:text-base">
            {t('privacyPolicy.hero.lastUpdatedLabel', { date: today })}
          </p>
        </div>
      </section>

      {/* Our Privacy Principles */}
      <section className="bg-blue-50/40 px-4 py-12 sm:px-6 sm:py-16">
        <div
          ref={(el) => {
            sectionRefs.current.principles = el;
          }}
          className={`mx-auto max-w-6xl ${animate('principles')}`}
        >
          <h2 className="text-center text-2xl font-bold text-[#0F172A] sm:text-3xl">
            {privacy.principles.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-[#64748B] sm:text-lg">
            {privacy.principles.subtitle}
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            <div className="flex flex-col items-center rounded-xl border border-[#E2E8F0] bg-white p-6 text-center shadow-sm transition hover:shadow-md">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="mt-4 font-bold text-[#0F172A]">{privacy.principles.items[0].title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                {privacy.principles.items[0].description}
              </p>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-[#E2E8F0] bg-white p-6 text-center shadow-sm transition hover:shadow-md">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3 className="mt-4 font-bold text-[#0F172A]">{privacy.principles.items[1].title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                {privacy.principles.items[1].description}
              </p>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-[#E2E8F0] bg-white p-6 text-center shadow-sm transition hover:shadow-md">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <h3 className="mt-4 font-bold text-[#0F172A]">{privacy.principles.items[2].title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                {privacy.principles.items[2].description}
              </p>
            </div>
            <div className="flex flex-col items-center rounded-xl border border-[#E2E8F0] bg-white p-6 text-center shadow-sm transition hover:shadow-md">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-600">
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </div>
              <h3 className="mt-4 font-bold text-[#0F172A]">{privacy.principles.items[3].title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#64748B]">
                {privacy.principles.items[3].description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed policy content */}
      <main className="mx-auto w-full max-w-4xl bg-white px-4 pb-16 pt-6 sm:px-6">
        {/* 1. Information We Collect */}
        <section
          ref={(el) => {
            sectionRefs.current.sec1 = el;
          }}
          className={`mt-10 text-sm leading-relaxed text-[#1F2933] ${animate('sec1')}`}
        >
          <h2 className="text-xl font-semibold text-[#0F172A]">{privacy.sections.infoCollect.title}</h2>

          <div className="mt-5 space-y-4">
            <div>
              <h3 className="font-semibold">{privacy.sections.infoCollect.sub1.title}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[#374151]">
                {privacy.sections.infoCollect.sub1.bullets.map((item) => (
                  <li key={item.label}>
                    <span className="font-medium">{item.label}:</span> {item.text}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold">{privacy.sections.infoCollect.sub2.title}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[#374151]">
                {privacy.sections.infoCollect.sub2.bullets.map((item) => (
                  <li key={item.label}>
                    <span className="font-medium">{item.label}:</span> {item.text}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold">{privacy.sections.infoCollect.sub3.title}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[#374151]">
                {privacy.sections.infoCollect.sub3.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 2. How We Use Your Information */}
        <section
          ref={(el) => {
            sectionRefs.current.sec2 = el;
          }}
          className={`mt-10 text-sm leading-relaxed text-[#1F2933] ${animate('sec2')}`}
        >
          <h2 className="text-xl font-semibold text-[#0F172A]">{privacy.sections.useInfo.title}</h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-[#1F2933]">
            <div>
              <h3 className="font-semibold">{privacy.sections.useInfo.sub1.title}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[#374151]">
                {privacy.sections.useInfo.sub1.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold">{privacy.sections.useInfo.sub2.title}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[#374151]">
                {privacy.sections.useInfo.sub2.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold">{privacy.sections.useInfo.sub3.title}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[#374151]">
                {privacy.sections.useInfo.sub3.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold">{privacy.sections.useInfo.sub4.title}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[#374151]">
                {privacy.sections.useInfo.sub4.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 3. How We Share Your Information */}
        <section
          ref={(el) => {
            sectionRefs.current.sec3 = el;
          }}
          className={`mt-10 text-sm leading-relaxed text-[#1F2933] ${animate('sec3')}`}
        >
          <h2 className="text-xl font-semibold text-[#0F172A]">{privacy.sections.shareInfo.title}</h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-[#1F2933]">
            {privacy.sections.shareInfo.items.map((item) => (
              <div key={item.title}>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-[#374151]">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Your Privacy Rights and Choices */}
        <section
          ref={(el) => {
            sectionRefs.current.sec4 = el;
          }}
          className={`mt-10 text-sm leading-relaxed text-[#1F2933] ${animate('sec4')}`}
        >
          <h2 className="text-xl font-semibold text-[#0F172A]">{privacy.sections.rights.title}</h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-[#1F2933]">
            {privacy.sections.rights.items.map((item) => (
              <div key={item.title}>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-[#374151]">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Data Security */}
        <section
          ref={(el) => {
            sectionRefs.current.sec5 = el;
          }}
          className={`mt-10 text-sm leading-relaxed text-[#1F2933] ${animate('sec5')}`}
        >
          <h2 className="text-xl font-semibold text-[#0F172A]">{privacy.sections.security.title}</h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-[#1F2933]">
            {privacy.sections.security.items.map((item) => (
              <div key={item.title}>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-2 text-[#374151]">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Children&apos;s Privacy */}
        <section
          ref={(el) => {
            sectionRefs.current.sec6 = el;
          }}
          className={`mt-10 text-sm leading-relaxed text-[#1F2933] ${animate('sec6')}`}
        >
          <h2 className="text-xl font-semibold text-[#0F172A]">{privacy.sections.children.title}</h2>
          <p className="mt-5 text-sm leading-relaxed text-[#374151]">{privacy.sections.children.body}</p>
        </section>

        {/* 7. International Data Transfers */}
        <section
          ref={(el) => {
            sectionRefs.current.sec7 = el;
          }}
          className={`mt-10 text-sm leading-relaxed text-[#1F2933] ${animate('sec7')}`}
        >
          <h2 className="text-xl font-semibold text-[#0F172A]">{privacy.sections.transfers.title}</h2>
          <p className="mt-5 text-sm leading-relaxed text-[#374151]">{privacy.sections.transfers.body}</p>
        </section>

        {/* 8. Cookies and Tracking Technologies */}
        <section
          ref={(el) => {
            sectionRefs.current.sec8 = el;
          }}
          className={`mt-10 text-sm leading-relaxed text-[#1F2933] ${animate('sec8')}`}
        >
          <h2 className="text-xl font-semibold text-[#0F172A]">{privacy.sections.cookies.title}</h2>
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-[#1F2933]">
            <div>
              <h3 className="font-semibold">{privacy.sections.cookies.sub1.title}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[#374151]">
                {privacy.sections.cookies.sub1.bullets.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold">{privacy.sections.cookies.sub2.title}</h3>
              <p className="mt-2 text-[#374151]">{privacy.sections.cookies.sub2.body}</p>
            </div>
          </div>
        </section>

        {/* 9. Your Rights Under Local Laws */}
        <section
          ref={(el) => {
            sectionRefs.current.sec9 = el;
          }}
          className={`mt-10 text-sm leading-relaxed text-[#1F2933] ${animate('sec9')}`}
        >
          <h2 className="text-xl font-semibold text-[#0F172A]">{privacy.sections.localRights.title}</h2>
          <p className="mt-5 text-sm leading-relaxed text-[#374151]">{privacy.sections.localRights.body}</p>
        </section>

        {/* 10. Changes to This Privacy Policy */}
        <section
          ref={(el) => {
            sectionRefs.current.sec10 = el;
          }}
          className={`mt-10 text-sm leading-relaxed text-[#1F2933] ${animate('sec10')}`}
        >
          <h2 className="text-xl font-semibold text-[#0F172A]">{privacy.sections.changes.title}</h2>
          <p className="mt-5 text-sm leading-relaxed text-[#374151]">{privacy.sections.changes.body}</p>
        </section>

        {/* 11. Contact Us */}
        <section
          ref={(el) => {
            sectionRefs.current.sec11 = el;
          }}
          className={`mt-10 text-sm leading-relaxed text-[#1F2933] ${animate('sec11')}`}
        >
          <h2 className="text-xl font-semibold text-[#0F172A]">{privacy.sections.contact.title}</h2>
          <p className="mt-5 text-sm leading-relaxed text-[#374151]">{privacy.sections.contact.body}</p>

          <div className="mt-5 rounded-2xl bg-[#F9FAFB] p-5 text-sm text-[#111827] ring-1 ring-[#E5E7EB] sm:p-6">
            <p>
              <span className="font-semibold">{privacy.sections.contact.details.emailLabel}</span>{' '}
              {privacy.sections.contact.details.email}
            </p>
            <p className="mt-1">
              <span className="font-semibold">{privacy.sections.contact.details.addressLabel}</span>{' '}
              {privacy.sections.contact.details.address}
            </p>
            <p className="mt-1">
              <span className="font-semibold">{privacy.sections.contact.details.phoneLabel}</span>{' '}
              {privacy.sections.contact.details.phone}
            </p>
          </div>
        </section>

        <div
          ref={(el) => {
            sectionRefs.current.bottomLinks = el;
          }}
          className={`mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-[#E5E7EB] pt-6 text-sm text-[#6B7280] ${animate(
            'bottomLinks'
          )}`}
        >
          <p>{privacy.sections.bottom.prompt}</p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/terms-of-service"
              className="font-semibold text-[#2563EB] transition hover:text-[#1D4ED8]"
            >
              {privacy.sections.bottom.termsLink}
            </Link>
            <Link
              to="/contact"
              className="font-semibold text-[#2563EB] transition hover:text-[#1D4ED8]"
            >
              {privacy.sections.bottom.contactLink}
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
