import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SiteFooter from '../ui/SiteFooter';
import SiteHeader from '../ui/SiteHeader';

const TERMS_SECTION_IDS = ['hero', 'notice', 'sec1', 'sec2', 'sec3', 'sec4', 'sec5', 'sec6', 'sec7', 'sec8', 'sec9', 'sec10', 'sec11', 'sec12', 'sec13', 'sec14', 'sec15', 'sec16', 'contactLinks'];

function Section({ title, children }) {
  return (
    <section className="border-b border-[#E2E8F0] py-8 last:border-b-0">
      <h2 className="text-xl font-bold text-[#0F172A]">{title}</h2>
      <div className="mt-3 space-y-4 text-[#64748B]">{children}</div>
    </section>
  );
}

function SubSection({ title, children }) {
  return (
    <div>
      <h3 className="font-semibold text-[#0F172A]">{title}</h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export default function TermsOfServicePage() {
  const [visibleSections, setVisibleSections] = useState(() => new Set(['hero']));
  const sectionRefs = useRef({});
  const { t } = useTranslation();
  const terms = t('terms', { returnObjects: true });
  const lastUpdated = terms.lastUpdated;

  useEffect(() => {
    const refs = sectionRefs.current;
    const observers = [];
    TERMS_SECTION_IDS.forEach((id) => {
      const el = refs[id];
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setVisibleSections((prev) => new Set(prev).add(id));
        },
        { threshold: 0.06, rootMargin: '0px 0px -24px 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const animate = (id) =>
    `transition-all duration-700 ease-out ${
      visibleSections.has(id) ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
    }`;

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F172A]">
      <SiteHeader />

      {/* Hero */}
      <section className="bg-[#0B1120] px-4 py-14 sm:px-6 sm:py-16 md:py-20">
        <div
          ref={(el) => (sectionRefs.current.hero = el)}
          className={`mx-auto flex max-w-5xl flex-col items-center text-center text-white ${animate('hero')}`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F97316]/10 text-[#F97316] sm:h-16 sm:w-16">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F97316] sm:h-11 sm:w-11">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                <path d="M14 2v5h5" />
              </svg>
            </div>
          </div>
          <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-[#F97316]">{terms.hero.label}</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl md:text-5xl">{terms.hero.title}</h1>
          <p className="mt-3 text-sm text-white/80 sm:text-base">
            {t('terms.hero.lastUpdatedLabel', { date: lastUpdated })}
          </p>
        </div>
      </section>

      {/* Important Notice */}
      <section className="bg-[#FFFBEB] px-4 py-10 sm:px-6">
        <div
          ref={(el) => (sectionRefs.current.notice = el)}
          className={`mx-auto max-w-4xl rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] px-6 py-6 sm:px-8 sm:py-8 ${animate('notice')}`}
        >
          <div className="flex items-start gap-4">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-[#F97316]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="13" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-[#0F172A] sm:text-lg">{terms.notice.title}</h2>
              <p className="text-sm leading-relaxed text-[#64748B]">
                {terms.notice.body}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Terms content */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <div ref={(el) => (sectionRefs.current.sec1 = el)} className={animate('sec1')}>
        <Section title={terms.sections.acceptance.title}>
          <p>{terms.sections.acceptance.body}</p>
        </Section>
        </div>
        <div ref={(el) => (sectionRefs.current.sec2 = el)} className={animate('sec2')}>
        <Section title={terms.sections.description.title}>
          <p>{terms.sections.description.body}</p>
        </Section>
        </div>
        <div ref={(el) => (sectionRefs.current.sec3 = el)} className={animate('sec3')}>
        <Section title={terms.sections.accounts.title}>
          {terms.sections.accounts.items.map((item) => (
            <SubSection key={item.title} title={item.title}>
              <p>{item.body}</p>
            </SubSection>
          ))}
        </Section>
        </div>
        <div ref={(el) => (sectionRefs.current.sec4 = el)} className={animate('sec4')}>
        <Section title={terms.sections.conduct.title}>
          {terms.sections.conduct.items.map((item) => (
            <SubSection key={item.title} title={item.title}>
              {item.intro && <p>{item.intro}</p>}
              {item.bullets && item.bullets.map((bullet) => <p key={bullet}>{bullet}</p>)}
              {item.body && <p>{item.body}</p>}
            </SubSection>
          ))}
        </Section>
        </div>
        <div ref={(el) => (sectionRefs.current.sec5 = el)} className={animate('sec5')}>
        <Section title={terms.sections.payments.title}>
          {terms.sections.payments.items.map((item) => (
            <SubSection key={item.title} title={item.title}>
              <p>{item.body}</p>
            </SubSection>
          ))}
        </Section>
        </div>
        <div ref={(el) => (sectionRefs.current.sec6 = el)} className={animate('sec6')}>
        <Section title={terms.sections.verification.title}>
          <p>{terms.sections.verification.body}</p>
        </Section>
        </div>
        <div ref={(el) => (sectionRefs.current.sec7 = el)} className={animate('sec7')}>
        <Section title={terms.sections.liability.title}>
          {terms.sections.liability.items.map((item) => (
            <SubSection key={item.title} title={item.title}>
              <p className={item.uppercase ? 'uppercase' : undefined}>{item.body}</p>
            </SubSection>
          ))}
        </Section>
        </div>
        <div ref={(el) => (sectionRefs.current.sec8 = el)} className={animate('sec8')}>
        <Section title={terms.sections.ip.title}>
          <p>{terms.sections.ip.body}</p>
        </Section>
        </div>
        <div ref={(el) => (sectionRefs.current.sec9 = el)} className={animate('sec9')}>
        <Section title={terms.sections.privacy.title}>
          <p>{terms.sections.privacy.body}</p>
        </Section>
        </div>
        <div ref={(el) => (sectionRefs.current.sec10 = el)} className={animate('sec10')}>
        <Section title={terms.sections.termination.title}>
          {terms.sections.termination.items.map((item) => (
            <SubSection key={item.title} title={item.title}>
              <p>{item.body}</p>
            </SubSection>
          ))}
        </Section>
        </div>
        <div ref={(el) => (sectionRefs.current.sec11 = el)} className={animate('sec11')}>
        <Section title={terms.sections.indemnification.title}>
          <p>{terms.sections.indemnification.body}</p>
        </Section>
        </div>
        <div ref={(el) => (sectionRefs.current.sec12 = el)} className={animate('sec12')}>
        <Section title={terms.sections.dispute.title}>
          {terms.sections.dispute.items.map((item) => (
            <SubSection key={item.title} title={item.title}>
              <p>{item.body}</p>
            </SubSection>
          ))}
        </Section>
        </div>
        <div ref={(el) => (sectionRefs.current.sec13 = el)} className={animate('sec13')}>
        <Section title={terms.sections.governing.title}>
          <p>{terms.sections.governing.body}</p>
        </Section>
        </div>
        <div ref={(el) => (sectionRefs.current.sec14 = el)} className={animate('sec14')}>
        <Section title={terms.sections.changes.title}>
          <p>{terms.sections.changes.body}</p>
        </Section>
        </div>
        <div ref={(el) => (sectionRefs.current.sec15 = el)} className={animate('sec15')}>
        <Section title={terms.sections.misc.title}>
          {terms.sections.misc.items.map((item) => (
            <SubSection key={item.title} title={item.title}>
              <p>{item.body}</p>
            </SubSection>
          ))}
        </Section>
        </div>
        <div ref={(el) => (sectionRefs.current.sec16 = el)} className={animate('sec16')}>
        <Section title={terms.sections.contact.title}>
          <p>{terms.sections.contact.body}</p>
        </Section>
        </div>

        <div
          ref={(el) => (sectionRefs.current.contactLinks = el)}
          className={`mt-12 border-t border-[#E2E8F0] pt-8 ${animate('contactLinks')}`}
        >
          <p className="text-[#64748B]">{terms.bottom.prompt}</p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link to="/privacy-policy" className="inline-flex items-center gap-1.5 font-semibold text-[#F97316] transition hover:text-[#EA580C]">
              {terms.bottom.privacyLink}
              <span aria-hidden>→</span>
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-1.5 font-semibold text-[#F97316] transition hover:text-[#EA580C]">
              {terms.bottom.contactLink}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
