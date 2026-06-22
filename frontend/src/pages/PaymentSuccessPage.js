import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteFooter from '../ui/SiteFooter';

export default function PaymentSuccessPage() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A]">
      <main className="flex-1">
        <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
          <div className="rounded-3xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F97316]/10 text-[#F97316]">
              <span className="text-2xl" aria-hidden="true">✓</span>
            </div>
            <h1 className="mt-5 text-3xl font-bold">{t('paymentSuccess.title')}</h1>
            <p className="mt-3 text-[#64748B]">
              {t('paymentSuccess.subtitle')}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-[#0F172A] px-4 py-2.5 text-sm font-semibold text-[#0F172A] transition hover:bg-[#0F172A] hover:text-white"
              >
                {t('paymentSuccess.viewReceipt')}
              </button>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-lg bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
              >
                {t('paymentSuccess.backHome')}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
