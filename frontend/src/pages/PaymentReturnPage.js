import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import SiteFooter from '../ui/SiteFooter';
import SiteHeader from '../ui/SiteHeader';

const TERMINAL_STATUSES = ['success', 'failed', 'cancelled', 'refunded'];

export default function PaymentReturnPage({ outcome }) {
  const { t } = useTranslation();
  const location = useLocation();
  const [status, setStatus] = useState('checking');
  const [transaction, setTransaction] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams(location.search);
    const queryTransactionId = query.get('transactionId');
    const transactionId = queryTransactionId || sessionStorage.getItem('pendingTransactionId');
    if (queryTransactionId) {
      sessionStorage.setItem('pendingTransactionId', queryTransactionId);
    }
    if (!transactionId) {
      setStatus('missing');
      return undefined;
    }

    const verify = async (attempt = 0) => {
      try {
        const data = await api(`/api/payments/verify/${transactionId}`);
        if (cancelled) return;
        setTransaction(data);
        if (TERMINAL_STATUSES.includes(data.status)) {
          setStatus(data.status);
          if (data.status === 'success') {
            sessionStorage.removeItem('pendingTransactionId');
          }
          return;
        }
        setStatus(data.status);
        if (attempt < 5) {
          setTimeout(() => verify(attempt + 1), 3000);
        }
      } catch (err) {
        if (!cancelled) setStatus('error');
      }
    };

    verify();
    return () => {
      cancelled = true;
    };
  }, [location.search]);

  const titleKey = `paymentReturn.${status}.title`;
  const bodyKey = `paymentReturn.${status}.body`;
  const title = t(titleKey, { defaultValue: t('paymentReturn.default.title') });
  const body = t(bodyKey, { defaultValue: t('paymentReturn.default.body') });
  const showOutcome = outcome && ['success', 'failed', 'cancelled'].includes(outcome);
  const retryPath = transaction?.task?._id
    ? `/payment?plan=pro&taskId=${encodeURIComponent(transaction.task._id)}`
    : '/pricing';

  const statusMeta = {
    success: { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: '✓' },
    failed: { bg: 'bg-rose-50', text: 'text-rose-600', icon: '✕' },
    cancelled: { bg: 'bg-amber-50', text: 'text-amber-600', icon: '!' },
    refunded: { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: '↺' },
    processing: { bg: 'bg-slate-50', text: 'text-slate-600', icon: '…' },
    checking: { bg: 'bg-slate-50', text: 'text-slate-600', icon: '…' },
    missing: { bg: 'bg-slate-50', text: 'text-slate-600', icon: '…' },
    error: { bg: 'bg-rose-50', text: 'text-rose-600', icon: '!' },
  };
  const meta = statusMeta[status] || statusMeta.checking;

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A]">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
          <div className="rounded-3xl border border-[#E2E8F0] bg-white p-8 text-center shadow-sm sm:p-10">
            <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${meta.bg} ${meta.text}`}>
              <span className="text-2xl" aria-hidden="true">
                {meta.icon}
              </span>
            </div>
            <h1 className="mt-5 text-3xl font-bold">{title}</h1>
            <p className="mt-3 text-[#64748B]">
              {body}
            </p>
            {showOutcome && status === 'processing' && (
              <p className="mt-3 text-xs text-[#F97316]">
                {t('paymentReturn.processingHint')}
              </p>
            )}
            {transaction?.transactionId && (
              <p className="mt-4 text-xs text-gray-400">
                {t('paymentReturn.transactionLabel')} {transaction.transactionId}
              </p>
            )}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-lg bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]"
              >
                {t('paymentReturn.backHome')}
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center rounded-lg border border-[#0F172A] px-4 py-2.5 text-sm font-semibold text-[#0F172A] transition hover:bg-[#0F172A] hover:text-white"
              >
                {t('paymentReturn.viewDashboard')}
              </Link>
              {(status === 'failed' || status === 'cancelled') && (
                <Link
                  to={retryPath}
                  className="inline-flex items-center justify-center rounded-lg border border-[#F97316] px-4 py-2.5 text-sm font-semibold text-[#F97316] transition hover:bg-[#F97316] hover:text-white"
                >
                  {t('paymentReturn.retry')}
                </Link>
              )}
            </div>
            {(status === 'failed' || status === 'cancelled' || status === 'error') && (
              <div className="mt-6 text-xs text-gray-500">
                {t('paymentReturn.supportPrefix')}{' '}
                <Link to="/contact" className="font-semibold text-[#F97316] hover:text-[#ea580c]">
                  {t('paymentReturn.supportLink')}
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
