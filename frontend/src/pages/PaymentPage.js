import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { initiateTaskPayment } from '../api/services';
import SiteHeader from '../ui/SiteHeader';
import SiteFooter from '../ui/SiteFooter';
import { formatCurrency } from '../utils/currency';

const generateReceiptId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'CMT-';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
};

const formatDate = (date) =>
  date.toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });

export default function PaymentPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [postalCode, setPostalCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);

  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const planParam = (params.get('plan') || '').toLowerCase();
  const taskId = params.get('taskId') || sessionStorage.getItem('checkoutTaskId');
  const planContent = t('payment.plans', { returnObjects: true });
  const selectedPlan = planContent[planParam] || planContent.pro;

  const isEmailValid = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()), [email]);
  const isNameValid = firstName.trim().length > 0 && lastName.trim().length > 0;
  const isPostalValid = postalCode.trim().length >= 3;
  const canCheckout = isEmailValid && isNameValid && isPostalValid;

  const handleCheckout = async () => {
    if (!canCheckout || submitting) return;
    setSubmitting(true);
    setError(null);

    const now = new Date();
    const receiptId = generateReceiptId();
    const nextBillingDate = new Date(now);
    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

    const paymentData = {
      receiptId,
      userId: user?.id || null,
      userEmail: email.trim(),
      userName: `${firstName.trim()} ${lastName.trim()}`,
      plan: planParam || 'pro',
      planName: selectedPlan.name,
      amount: selectedPlan.priceNum ?? selectedPlan.priceValue ?? 0,
      postalCode: postalCode.trim(),
      status: 'active',
      nextBillingDate: nextBillingDate.toISOString(),
    };

    try {
      if (selectedPlan.priceType === 'paid') {
        if (!taskId) {
          throw new Error('Missing task context for payment. Please start checkout from a task.');
        }

        const data = await initiateTaskPayment({
          taskId,
          amount: paymentData.amount,
          currency: 'BDT',
        });

        if (!data?.paymentUrl || !data?.transactionId) {
          throw new Error('Missing payment redirect data');
        }

        sessionStorage.setItem('pendingTransactionId', data.transactionId);
        window.location.assign(data.paymentUrl);
        return;
      }

      setReceipt({
        ...paymentData,
        paidAt: now,
        nextBillingDate,
      });
    } catch (err) {
      console.error('Payment failed:', err);
      setError(err.message || 'Payment failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (receipt) {
    return (
      <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A]">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="w-full max-w-lg">
            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-lg sm:p-10">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF7ED]">
                  <svg className="h-8 w-8 text-[#F97316]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h1 className="mt-4 text-2xl font-bold text-[#0F172A]">Payment Successful</h1>
                <p className="mt-1 text-sm text-gray-500">Your subscription is now active.</p>
              </div>

              <div className="mt-8 rounded-2xl border border-gray-100 bg-[#FAFAFA] p-5">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-400">Receipt</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Receipt ID</span>
                    <span className="font-mono font-semibold text-[#0F172A]">{receipt.receiptId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date</span>
                    <span className="text-[#0F172A]">{formatDate(receipt.paidAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Plan</span>
                    <span className="font-semibold text-[#F97316]">{receipt.planName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-semibold text-[#0F172A]">{receipt.amount === 0 ? 'Free' : `$${receipt.amount.toFixed(2)}`}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-3" />
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name</span>
                    <span className="text-[#0F172A]">{receipt.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="text-[#0F172A]">{receipt.userEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Next billing</span>
                    <span className="text-[#0F172A]">{formatDate(receipt.nextBillingDate)}</span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-center text-xs text-gray-400">A copy of this receipt has been saved to your account.</p>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-[#0F172A] transition hover:border-gray-300"
                >
                  Print Receipt
                </button>
                <Link
                  to={user?.role === 'provider' ? '/provider-dashboard' : '/dashboard'}
                  className="flex-1 rounded-xl bg-[#F97316] px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-[#ea580c]"
                >
                  Go to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const formattedPrice =
    selectedPlan.priceType === 'free'
      ? t('payment.price.free')
      : formatCurrency(selectedPlan.priceValue, i18n.language);
  const formattedTax = formatCurrency(0, i18n.language);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A]">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="mb-6">
            <Link
              to="/pricing"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#0F172A] hover:text-[#F97316]"
            >
              <span aria-hidden="true">←</span>
              {t('payment.backToPricing')}
            </Link>
          </div>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
                <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">
                  {t('payment.secureCheckout')}
                </p>
                <h1 className="mt-2 text-3xl font-bold">
                  {t('payment.title')}
                </h1>
                <p className="mt-3 text-[#64748B]">
                  {t('payment.subtitle')}
                </p>
              </div>

              <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
                <h2 className="text-lg font-semibold text-[#0F172A]">
                  {t('payment.billingTitle')}
                </h2>
                {error && (
                  <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                )}
                <div className="mt-5 grid gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#0F172A]">
                      {t('payment.fields.email')}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder={t('payment.placeholders.email')}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#0F172A]">
                        {t('payment.fields.firstName')}
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        placeholder={t('payment.placeholders.firstName')}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#0F172A]">
                        {t('payment.fields.lastName')}
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        placeholder={t('payment.placeholders.lastName')}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-1">
                    <div className="space-y-1.5 sm:col-span-1">
                      <label className="text-xs font-semibold text-[#0F172A]">
                        {t('payment.fields.postalCode')}
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={postalCode}
                        onChange={(event) => setPostalCode(event.target.value)}
                        placeholder={t('payment.placeholders.postalCode')}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                    Card and banking details are entered securely on SSLCommerz after checkout.
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-[#0F172A]">
                    {t('payment.promo.title')}
                  </h2>
                  <span className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                    {t('payment.promo.optional')}
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    placeholder={t('payment.promo.placeholder')}
                    className="w-full flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#0F172A] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/40"
                  />
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg border border-[#0F172A] px-4 py-2 text-xs font-semibold text-[#0F172A] transition hover:bg-[#0F172A] hover:text-white sm:text-sm"
                  >
                    {t('payment.promo.apply')}
                  </button>
                </div>
              </div>
            </div>

            <aside className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#F97316]">
                    {t('payment.selectedPlan')}
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-[#0F172A]">
                    {selectedPlan.name}
                  </h3>
                  <p className="mt-2 text-sm text-[#64748B]">
                    {selectedPlan.description}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#FFF7ED] px-4 py-3 text-right">
                  <p className="text-2xl font-bold text-[#F97316]">
                    {formattedPrice}
                  </p>
                  <p className="text-xs font-semibold text-[#F97316]">
                    {selectedPlan.priceType === 'free'
                      ? t('payment.price.freeNote')
                      : t('payment.price.perMonth')}
                  </p>
                </div>
              </div>
              <ul className="mt-6 space-y-2 text-sm text-[#0F172A]">
                {selectedPlan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[#F97316] text-[10px] text-[#F97316]">✓</span>
                    <span className="text-[#64748B]">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="my-6 border-t border-[#E2E8F0]" />
              <div className="space-y-2 text-sm text-[#0F172A]">
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">{t('payment.summary.subtotal')}</span>
                  <span className="font-semibold">
                    {formattedPrice}
                    {selectedPlan.priceType === 'free' ? '' : t('payment.price.perMonth')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#64748B]">{t('payment.summary.tax')}</span>
                  <span className="font-semibold">{formattedTax}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>{t('payment.summary.totalDue')}</span>
                  <span>{formattedPrice}</span>
                </div>
              </div>
              <button
                type="button"
                disabled={!canCheckout || submitting}
                className="mt-6 w-full rounded-lg bg-[#F97316] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c] focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 disabled:cursor-not-allowed disabled:bg-[#f5b07d]"
                onClick={handleCheckout}
              >
                {t('payment.checkout')}
              </button>
              <p className="mt-4 text-xs text-[#64748B]">
                {t('payment.termsNote')}
              </p>
            </aside>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
