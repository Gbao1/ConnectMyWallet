import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';

export default function SignupForm({ setMode }) {
  const { register } = useAuth();
  const { t } = useTranslation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('user');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const validate = () => {
    const next = {};
    if (!firstName?.trim()) next.firstName = t('authForm.signup.errorFirstName');
    if (!lastName?.trim()) next.lastName = t('authForm.signup.errorLastName');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t('authForm.signup.errorEmail');
    if (!password || password.length < 8) next.password = t('authForm.signup.errorPassword');
    if (confirmPassword !== password) next.confirmPassword = t('authForm.signup.errorConfirm');
    if (!agreeTerms) next.terms = t('authForm.signup.errorTerms');
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError(null);
    setSuccessMessage(null);
    try {
      const data = await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        preferredName: '',
        email: email.trim(),
        password,
        role,
      });
      setSuccessMessage(
        data?.msg ||
          'Account created. Please check your email and click the verification link before logging in.'
      );
      setMode('login');
    } catch (err) {
      const code = err?.code ?? '';
      const friendly =
        code === 'auth/email-already-in-use'
          ? t('authForm.signup.errorEmailExists')
          : code === 'auth/weak-password'
            ? t('authForm.signup.errorWeakPassword')
            : code === 'auth/invalid-email'
              ? t('authForm.signup.errorInvalidEmail')
              : err instanceof Error ? err.message : t('authForm.signup.errorCreate');
      setServerError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 focus:border-[#F97316] transition-colors';
  const inputError = 'border-red-500 bg-red-50 focus:ring-red-200 focus:border-red-500';

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {serverError && (
        <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {serverError}
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="space-y-2.5">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-700">{t('authForm.signup.emailLabel')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('authForm.signup.emailPlaceholder')}
            className={`${inputBase} ${errors.email ? inputError : ''}`}
            autoComplete="email"
          />
          {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">{t('authForm.signup.firstNameLabel')}</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={t('authForm.signup.firstNamePlaceholder')}
              className={`${inputBase} ${errors.firstName ? inputError : ''}`}
              autoComplete="given-name"
            />
            {errors.firstName && <p className="text-xs text-red-600">{errors.firstName}</p>}
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">{t('authForm.signup.lastNameLabel')}</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={t('authForm.signup.lastNamePlaceholder')}
              className={`${inputBase} ${errors.lastName ? inputError : ''}`}
              autoComplete="family-name"
            />
            {errors.lastName && <p className="text-xs text-red-600">{errors.lastName}</p>}
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">{t('authForm.signup.passwordLabel')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('authForm.signup.passwordPlaceholder')}
              className={`${inputBase} ${errors.password ? inputError : ''}`}
              autoComplete="new-password"
            />
            {errors.password && <p className="text-xs text-red-600">{errors.password}</p>}
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-700">{t('authForm.signup.confirmPasswordLabel')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('authForm.signup.confirmPasswordPlaceholder')}
              className={`${inputBase} ${errors.confirmPassword ? inputError : ''}`}
              autoComplete="new-password"
            />
            {errors.confirmPassword && <p className="text-xs text-red-600">{errors.confirmPassword}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex cursor-pointer items-center justify-center rounded-lg border border-gray-200 px-2 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 has-[:checked]:border-[#F97316] has-[:checked]:bg-[#FFF7ED] has-[:checked]:text-[#F97316]">
            <input type="radio" name="role" value="user" checked={role === 'user'} onChange={() => setRole('user')} className="sr-only" />
            {t('authForm.signup.roleUser')}
          </label>
          <label className="flex cursor-pointer items-center justify-center rounded-lg border border-gray-200 px-2 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 has-[:checked]:border-[#F97316] has-[:checked]:bg-[#FFF7ED] has-[:checked]:text-[#F97316]">
            <input type="radio" name="role" value="provider" checked={role === 'provider'} onChange={() => setRole('provider')} className="sr-only" />
            {t('authForm.signup.roleProvider')}
          </label>
        </div>
      </div>

      <label className={`flex items-start gap-2 text-xs ${errors.terms ? 'text-red-600' : 'text-gray-600'}`}>
        <input
          type="checkbox"
          checked={agreeTerms}
          onChange={(e) => setAgreeTerms(e.target.checked)}
          className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-[#F97316] focus:ring-[#F97316]/40"
        />
        <span>
          {t('authForm.signup.termsPrefix')}{' '}
          <Link to="/terms-of-service" className="font-semibold text-[#F97316] hover:underline">{t('authForm.signup.termsService')}</Link>
          {' '}{t('authForm.signup.termsAnd')}{' '}
          <Link to="/privacy-policy" className="font-semibold text-[#F97316] hover:underline">{t('authForm.signup.termsPrivacy')}</Link>
        </span>
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#F97316] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c] focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 disabled:opacity-70"
      >
        {loading ? t('authForm.signup.createAccountLoading') : t('authForm.signup.createAccount')}
      </button>

      <p className="text-center text-xs text-gray-600">
        {t('authForm.signup.alreadyHave')}{' '}
        <button
          type="button"
          onClick={() => setMode('login')}
          className="font-semibold text-[#F97316] hover:underline"
        >
          {t('authForm.signup.loginAction')}
        </button>
      </p>
    </form>
  );
}
