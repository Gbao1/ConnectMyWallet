import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import SiteHeader from '../ui/SiteHeader';
import SiteFooter from '../ui/SiteFooter';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingRequest, setLoadingRequest] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const sendCode = async (e) => {
    e.preventDefault();
    setError('');
    setRequestMessage('');
    setLoadingRequest(true);
    try {
      const data = await api('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setRequestMessage(data.message || data.msg || t('forgotPassword.requestSent', { defaultValue: 'If the account exists, a reset link/token has been sent.' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('forgotPassword.sendFailed', { defaultValue: 'Failed to send code' }));
    } finally {
      setLoadingRequest(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    if (!token.trim() || !newPassword) {
      setError(t('forgotPassword.fillRequired', { defaultValue: 'Please fill in reset token and new password.' }));
      return;
    }
    if (newPassword.length < 6) {
      setError(t('forgotPassword.passwordLength', { defaultValue: 'Password must be at least 6 characters.' }));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('forgotPassword.passwordMismatch', { defaultValue: 'Passwords do not match.' }));
      return;
    }
    setLoadingReset(true);
    try {
      const data = await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          token: token.trim(),
          newPassword,
        }),
      });
      setResetMessage(
        data.msg || data.message || t('forgotPassword.resetSuccess', { defaultValue: 'Password reset successful.' })
      );
      setToken('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('forgotPassword.resetFailed', { defaultValue: 'Failed to reset password' }));
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <SiteHeader />
      <main className="flex-1 px-4 py-10">
        <div className="mx-auto grid w-full max-w-4xl gap-6 md:grid-cols-2">
          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-bold text-[#0F172A]">{t('forgotPassword.title', { defaultValue: 'Forgot password' })}</h1>
            <p className="mt-2 text-sm text-gray-600">{t('forgotPassword.subtitle', { defaultValue: 'Enter your account email and we will send you a reset code.' })}</p>
            <form onSubmit={sendCode} className="mt-5 space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder={t('forgotPassword.email', { defaultValue: 'Email' })}
                required
              />
              <button
                type="submit"
                disabled={loadingRequest}
                className="w-full rounded-lg bg-[#F97316] px-4 py-2 text-sm font-semibold text-white hover:bg-[#EA580C] disabled:opacity-70"
              >
                {loadingRequest ? t('forgotPassword.sendingCode', { defaultValue: 'Sending code...' }) : t('forgotPassword.sendCode', { defaultValue: 'Send reset code' })}
              </button>
            </form>
            {requestMessage ? <p className="mt-3 text-sm text-emerald-700">{requestMessage}</p> : null}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-[#0F172A]">{t('forgotPassword.resetTitle', { defaultValue: 'Reset password' })}</h2>
            <p className="mt-2 text-sm text-gray-600">{t('forgotPassword.resetSubtitle', { defaultValue: 'Enter the reset token from email and your new password.' })}</p>
            <form onSubmit={resetPassword} className="mt-5 space-y-3">
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder={t('forgotPassword.token', { defaultValue: 'Reset token' })}
                required
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder={t('forgotPassword.newPassword', { defaultValue: 'New password' })}
                required
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder={t('forgotPassword.confirmPassword', { defaultValue: 'Confirm new password' })}
                required
              />
              <button
                type="submit"
                disabled={loadingReset}
                className="w-full rounded-lg bg-[#0F172A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E293B] disabled:opacity-70"
              >
                {loadingReset ? t('forgotPassword.updating', { defaultValue: 'Updating password...' }) : t('forgotPassword.resetCta', { defaultValue: 'Reset password' })}
              </button>
            </form>
            {resetMessage ? <p className="mt-3 text-sm text-emerald-700">{resetMessage}</p> : null}
            {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
            <p className="mt-4 text-sm text-gray-600">
              {t('forgotPassword.backTo', { defaultValue: 'Back to' })}{' '}
              <Link to="/auth?mode=login" className="font-semibold text-[#F97316] hover:underline">
                {t('authForm.login.submit', { defaultValue: 'login' })}
              </Link>
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
