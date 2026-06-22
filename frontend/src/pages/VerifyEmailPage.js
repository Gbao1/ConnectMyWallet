import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import SiteHeader from '../ui/SiteHeader';
import SiteFooter from '../ui/SiteFooter';

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState(() =>
    t('verifyEmail.loading', { defaultValue: 'Verifying your email...' })
  );
  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    if (hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;
    (async () => {
      if (!token) {
        setStatus('error');
        setMessage(t('verifyEmail.missingToken', { defaultValue: 'Missing verification token.' }));
        return;
      }
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);
        const data = await api(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        setStatus('success');
        setMessage(
          data.msg ||
            data.message ||
            t('verifyEmail.success', { defaultValue: 'Email verified. You can now log in.' })
        );
      } catch (err) {
        setStatus('error');
        setMessage(
          err instanceof Error && err.name === 'AbortError'
            ? t('verifyEmail.timeout', { defaultValue: 'Verification timed out. Please try opening the link again.' })
            : err instanceof Error
              ? err.message
              : t('verifyEmail.failed', { defaultValue: 'Verification failed' })
        );
      }
    })();
  }, [token, t]);

  const isSuccess = status === 'success';

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-[#0F172A]">{t('verifyEmail.title', { defaultValue: 'Email verification' })}</h1>
          <p className={`mt-3 text-sm ${isSuccess ? 'text-emerald-700' : status === 'error' ? 'text-rose-700' : 'text-gray-600'}`}>
            {message}
          </p>
          <Link
            to="/auth?mode=login"
            className="mt-5 inline-flex rounded-lg bg-[#F97316] px-4 py-2 text-sm font-semibold text-white hover:bg-[#EA580C]"
          >
            {t('verifyEmail.loginCta', { defaultValue: 'Go to login' })}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
