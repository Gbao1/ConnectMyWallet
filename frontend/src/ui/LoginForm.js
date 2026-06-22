import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';

export default function LoginForm({ setMode }) {
  const { login, resendVerificationByEmail } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [resendNote, setResendNote] = useState(null);

  const validate = () => {
    const next = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t('authForm.login.errorEmail');
    if (!password || password.length < 6) next.password = t('authForm.login.errorPassword');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError(null);
    setResendNote(null);
    try {
      const result = await login({ email: email.trim(), password });
      const nextRoute =
        (result?.user?.role ?? '').toLowerCase() === 'provider'
          ? '/provider-dashboard'
          : '/dashboard';
      navigate(nextRoute);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t('authForm.login.errorServer'));
      if (err?.code === 'EMAIL_NOT_VERIFIED') {
        setResendNote('unverified');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 focus:border-[#F97316] transition-colors';
  const inputError = 'border-red-500 bg-red-50 focus:ring-red-200 focus:border-red-500';

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {serverError ? (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {serverError}
          {resendNote === 'unverified' ? (
            <button
              type="button"
              className="mt-2 block text-sm font-semibold text-[#F97316] hover:underline"
              onClick={async () => {
                try {
                  const data = await resendVerificationByEmail(email.trim());
                  setResendNote(data?.msg || 'Verification email sent.');
                } catch (e) {
                  setResendNote(e instanceof Error ? e.message : 'Could not resend email.');
                }
              }}
            >
              Resend verification email
            </button>
          ) : null}
        </div>
      ) : null}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700">{t('authForm.login.emailLabel')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('authForm.login.emailPlaceholder')}
            className={`${inputBase} ${errors.email ? inputError : ''}`}
            autoComplete="email"
          />
          {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">{t('authForm.login.passwordLabel')}</label>
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-sm font-medium text-[#F97316] hover:underline"
            >
              {t('authForm.login.forgotPassword')}
            </button>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('authForm.login.passwordPlaceholder')}
            className={`${inputBase} ${errors.password ? inputError : ''}`}
            autoComplete="current-password"
          />
          {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-[#F97316] focus:ring-[#F97316]/40"
        />
        {t('authForm.login.rememberMe')}
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#F97316] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c] focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 disabled:opacity-70"
      >
        {loading ? t('authForm.login.submitLoading') : t('authForm.login.submit')}
      </button>

      <p className="text-center text-sm text-gray-600">
        {t('authForm.login.signupPrompt')}{' '}
        <button
          type="button"
          onClick={() => setMode('signup')}
          className="font-semibold text-[#F97316] hover:underline"
        >
          {t('authForm.login.signupAction')}
        </button>
      </p>
    </form>
  );
}
