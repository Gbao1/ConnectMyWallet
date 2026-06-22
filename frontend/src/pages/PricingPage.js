import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { api } from '../api/client';
import SiteFooter from '../ui/SiteFooter';
import SiteHeader from '../ui/SiteHeader';
import { formatCurrency } from '../utils/currency';

const planMeta = [
  {
    slug: 'basic',
    ctaTo: '/auth?mode=signup',
    highlighted: false,
  },
  {
    slug: 'pro',
    ctaTo: '/auth?mode=signup',
    highlighted: true,
  },
  {
    slug: 'business',
    ctaTo: '/auth?mode=signup',
    highlighted: false,
  },
];

export default function PricingPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState('');
  const plans = t('pricing.plans', { returnObjects: true });
  const isAuthed = Boolean(user);
  const handlePlanCheckout = async (meta, plan) => {
    if (meta.slug === 'basic') {
      navigate('/');
      return;
    }

    if (!isAuthed) {
      navigate(meta.ctaTo);
      return;
    }

    setError('');
    setLoadingPlan(meta.slug);
    try {
      const amount = Number(plan.priceValue ?? 0);
      const data = await api('/api/payments/subscription/initiate', {
        method: 'POST',
        body: JSON.stringify({
          plan: meta.slug,
          amount,
          currency: 'BDT',
        }),
      });

      if (!data?.paymentUrl || !data?.transactionId) {
        throw new Error('Missing payment redirect data');
      }

      sessionStorage.setItem('pendingTransactionId', data.transactionId);
      window.location.assign(data.paymentUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start checkout');
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A]">
      <SiteHeader />

      <main className="flex-1 bg-white">
        <section className="mx-auto flex w-full max-w-6xl flex-col px-4 py-10 sm:px-6 sm:py-14 md:py-16">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">
              {t('pricing.tagline')}
            </p>
            <h1 className="mt-2 text-3xl font-bold text-[#0F172A] sm:text-4xl md:text-5xl">
              {t('pricing.title')}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-[#64748B] sm:mt-4 sm:text-lg">
              {t('pricing.subtitle')}
            </p>
            {error ? (
              <div className="mx-auto mt-4 max-w-xl rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3 md:gap-7 lg:mt-12">
            {plans.map((plan, index) => {
              const meta = planMeta[index];
              const isPopular = meta?.highlighted;
              const priceLabel =
                plan.priceType === 'free'
                  ? t('pricing.price.free')
                  : `${formatCurrency(plan.priceValue, i18n.language)}${t(`pricing.price.${plan.priceInterval}`)}`;
              return (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition md:p-7 ${
                    isPopular
                      ? 'border-[#F97316] shadow-lg shadow-[#F97316]/20 md:scale-[1.03] md:z-10 bg-[#FFF7ED]'
                      : 'border-[#E2E8F0]'
                  }`}
                >
                  {plan.badge ? (
                    <div className="absolute -top-3 right-5 rounded-full bg-[#F97316] px-3 py-1 text-xs font-semibold text-white shadow-sm">
                      {plan.badge}
                    </div>
                  ) : null}
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-[#F97316]">{plan.name}</p>
                    <p className="mt-1 text-sm text-[#64748B]">
                      {plan.description || plan.priceNote}
                    </p>
                  </div>
                  <div className="mb-5">
                    <p className="text-3xl font-bold text-[#0F172A]">{priceLabel}</p>
                    {plan.priceNote && plan.description === '' ? (
                      <p className="mt-1 text-sm text-[#64748B]">{plan.priceNote}</p>
                    ) : null}
                  </div>
                  <ul className="flex-1 space-y-2 text-sm text-[#0F172A]">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="mt-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#F97316] text-[10px] text-[#F97316]">
                          ✓
                        </span>
                        <span className="text-[#64748B]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => handlePlanCheckout(meta, plan)}
                      disabled={loadingPlan === meta.slug}
                      className={`inline-flex w-full items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                        isPopular
                          ? 'bg-[#F97316] text-white shadow-sm hover:bg-[#ea580c]'
                          : 'border border-[#0F172A] text-[#0F172A] hover:bg-[#0F172A] hover:text-white'
                      } ${loadingPlan === meta.slug ? 'cursor-not-allowed opacity-70' : ''}`}
                    >
                      {loadingPlan === meta.slug ? 'Redirecting…' : plan.ctaLabel}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
