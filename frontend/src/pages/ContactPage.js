import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import SiteFooter from '../ui/SiteFooter';
import SiteHeader from '../ui/SiteHeader';

const INQUIRY_KEYS = ['general', 'support', 'partnership', 'careers', 'trust', 'other'];

export default function ContactPage() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', inquiryType: '', subject: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);
  const offices = t('contact.offices', { returnObjects: true });
  const inquiryOptions = useMemo(
    () => INQUIRY_KEYS.map((key) => ({ key, label: t(`contact.form.inquiry.options.${key}`) })),
    [t],
  );
  const faqItems = t('contact.faq.items', { returnObjects: true });
  const supportPoints = t('contact.support.points', { returnObjects: true });
  const businessHours = t('contact.hours.items', { returnObjects: true });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitStatus(null);
    try {
      await api('/api/contact', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      setSubmitStatus('success');
      setFormData({ firstName: '', lastName: '', email: '', inquiryType: '', subject: '', message: '' });
    } catch (err) {
      console.error('Failed to submit contact form', err);
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#0F172A]">
      <SiteHeader />

      {/* Get in Touch hero */}
      <section className="bg-[#EA580C] px-4 py-14 text-white sm:px-6 sm:py-20 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold sm:text-4xl md:text-5xl">
            {t('contact.hero.title')}
          </h1>
          <p className="mt-4 text-sm text-white/95 sm:text-base">
            {t('contact.hero.subtitle')}
          </p>
        </div>
      </section>

      {/* Contact cards + form section */}
      <main className="flex-1 bg-[#F3F4F6] px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:items-stretch">
          <div className="flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#F97316] text-[#F97316]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <path d="M22 6l-10 7L2 6" />
              </svg>
            </div>
            <h2 className="mt-4 font-bold text-[#0F172A]">{t('contact.cards.email.title')}</h2>
            <a href="mailto:support@connectmytask.com" className="mt-1 block font-medium text-[#F97316] hover:underline">
              support@connectmytask.com
            </a>
            <p className="mt-2 text-sm text-[#64748B]">
              {t('contact.cards.email.note')}
            </p>
          </div>

          <div className="flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#F97316] text-[#F97316]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <h2 className="mt-4 font-bold text-[#0F172A]">{t('contact.cards.phone.title')}</h2>
            <p className="mt-1 font-medium text-[#0F172A]">{t('contact.cards.phone.value')}</p>
            <p className="mt-2 text-sm text-[#64748B]">
              {t('contact.cards.phone.note')}
            </p>
          </div>

          <div className="flex flex-col rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#F97316] text-[#F97316]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className="mt-4 font-bold text-[#0F172A]">{t('contact.cards.chat.title')}</h2>
            <a href="#chat" className="mt-1 block font-medium text-[#F97316] hover:underline">
              {t('contact.cards.chat.cta')}
            </a>
            <p className="mt-2 text-sm text-[#64748B]">
              {t('contact.cards.chat.note')}
            </p>
          </div>
        </div>

        {/* Send message + Our Offices */}
        <div className="mt-16 grid gap-10 lg:grid-cols-5 lg:items-start lg:gap-12">
          <div className="lg:col-span-3">
            <h2 className="text-xl font-bold text-[#0F172A]">{t('contact.form.title')}</h2>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-[#0F172A]">
                    {t('contact.form.firstName.label')} <span className="text-[#F97316]">*</span>
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[#0F172A] focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                    placeholder={t('contact.form.firstName.placeholder')}
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-[#0F172A]">
                    {t('contact.form.lastName.label')} <span className="text-[#F97316]">*</span>
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[#0F172A] focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                    placeholder={t('contact.form.lastName.placeholder')}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#0F172A]">
                  {t('contact.form.email.label')} <span className="text-[#F97316]">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[#0F172A] focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                  placeholder={t('contact.form.email.placeholder')}
                />
              </div>
              <div>
                <label htmlFor="inquiryType" className="block text-sm font-medium text-[#0F172A]">
                  {t('contact.form.inquiry.label')} <span className="text-[#F97316]">*</span>
                </label>
                <select
                  id="inquiryType"
                  name="inquiryType"
                  required
                  value={formData.inquiryType}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[#0F172A] focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                >
                  <option value="">{t('contact.form.inquiry.placeholder')}</option>
                  {inquiryOptions.map((type) => (
                    <option key={type.key} value={type.key}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-[#0F172A]">
                  {t('contact.form.subject.label')} <span className="text-[#F97316]">*</span>
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  required
                  value={formData.subject}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[#0F172A] focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                  placeholder={t('contact.form.subject.placeholder')}
                />
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-[#0F172A]">
                  {t('contact.form.message.label')} <span className="text-[#F97316]">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-[#0F172A] focus:border-[#F97316] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                  placeholder={t('contact.form.message.placeholder')}
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-[#F97316] py-2.5 font-semibold text-white transition hover:bg-[#EA580C] disabled:opacity-70 sm:w-auto sm:px-8"
              >
                {submitting ? t('contact.form.submit.sending') : t('contact.form.submit.default')}
              </button>
              {submitStatus === 'success' && (
                <p className="text-sm font-medium text-green-600">{t('contact.form.status.success')}</p>
              )}
              {submitStatus === 'error' && (
                <p className="text-sm font-medium text-red-600">{t('contact.form.status.error')}</p>
              )}
              {!submitStatus && (
                <p className="text-sm text-[#64748B]">{t('contact.form.status.neutral')}</p>
              )}
            </form>
          </div>

          <div className="space-y-8 lg:col-span-2">
            <div>
              <h2 className="text-xl font-bold text-[#0F172A]">{t('contact.officesTitle')}</h2>
              <div className="mt-4 space-y-3">
                {offices.map((office) => (
                  <div
                    key={office.name}
                    className="flex items-start gap-3 rounded-2xl border border-[#E5E7EB] bg-white px-5 py-4 shadow-sm sm:px-6 sm:py-5"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 border-[#FDBA74] bg-[#FFEDD5] text-[#EA580C]">
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
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#F97316]">
                        {office.name}
                      </p>
                      <p className="mt-1 font-bold text-[#0F172A]">{office.city}</p>
                      <p className="mt-1 text-sm text-[#64748B]">{office.address}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] px-5 py-5 shadow-sm sm:px-6 sm:py-6">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F97316]/10 text-[#F97316]">
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
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </span>
                <h2 className="text-xl font-bold text-[#0F172A]">{t('contact.hours.title')}</h2>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-[#64748B] sm:grid-cols-2">
                {businessHours.map((item) => (
                  <div key={item.day}>
                    <p>{item.day}</p>
                    <p className="mt-1 font-medium text-[#0F172A]">{item.time}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4 border-t border-[#FACC6B] pt-3 text-sm font-medium text-[#F97316]">
                {t('contact.hours.emergency')}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Answers */}
        <section className="mx-auto mt-16 max-w-6xl pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F97316]/10 text-[#F97316]">
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M9.5 9A2.5 2.5 0 0 1 16 10c0 2-2.5 2-2.5 4" />
                <path d="M12 17h.01" />
              </svg>
            </span>
            <h2 className="text-lg font-bold text-[#0F172A] sm:text-xl">{t('contact.faq.title')}</h2>
          </div>

          <div className="mt-4 space-y-3">
            {faqItems.map((item) => (
              <div key={item.question} className="rounded-2xl bg-white px-5 py-4 shadow-sm sm:px-6 sm:py-5">
                <h3 className="text-sm font-semibold text-[#0F172A] sm:text-base">
                  {item.question}
                </h3>
                <p className="mt-2 text-sm text-[#64748B]">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Support Team highlight */}
        <section className="mx-auto mt-16 max-w-6xl pb-8">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div className="overflow-hidden rounded-3xl bg-[#111827]/5 shadow-md">
              <img
                src="/images/call.png"
                alt={t('contact.support.imageAlt')}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F97316]">
                {t('contact.support.tagline')}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#0F172A] sm:text-3xl">
                {t('contact.support.title')}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[#64748B] sm:text-base">
                {t('contact.support.subtitle')}
              </p>
              <ul className="mt-6 space-y-2 text-sm text-[#0F172A] sm:text-base">
                {supportPoints.map((point) => (
                  <li key={point} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#F97316] text-white">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-3 w-3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
