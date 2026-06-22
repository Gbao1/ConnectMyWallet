import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoginForm from '../ui/LoginForm';
import SignupForm from '../ui/SignupForm';
import GoogleSignInButton from '../ui/GoogleSignInButton';
import FacebookSignInButton from '../ui/FacebookSignInButton';
import SiteHeader from '../ui/SiteHeader';
import SiteFooter from '../ui/SiteFooter';

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const location = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const modeParam = params.get('mode');
    if (modeParam === 'signup' || location.state?.mode === 'signup') {
      setMode('signup');
    } else {
      setMode('login');
    }
  }, [location.search, location.state]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#FFFBF7] via-[#FEF7F0] to-[#FFF5EB]">
      <SiteHeader />

      <main className="flex flex-1 flex-col lg:flex-row" key={mode}>
        <section className="flex flex-1 flex-col justify-center px-6 py-10 lg:py-16 lg:pl-12 lg:pr-6">
          <div className="ml-auto w-full max-w-xl">
            {mode === 'login' ? (
              <>
                <span className="inline-block rounded-full bg-[#FFF7ED] px-4 py-1.5 text-sm font-medium text-[#F97316] animate-rise">
                  {t('authPage.login.badge')}
                </span>
                <h1 className="mt-6 text-3xl font-bold leading-tight text-[#0F172A] sm:text-4xl animate-rise-d1">
                  {t('authPage.login.title')}
                </h1>
                <p className="mt-4 text-lg text-gray-600 animate-rise-d2">
                  {t('authPage.login.subtitle')}
                </p>
                <div className="mt-8 flex flex-wrap gap-6 animate-rise-d3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF7ED]">
                      <svg className="h-5 w-5 text-[#F97316]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-base font-medium text-gray-700">{t('authPage.login.features.security')}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF7ED]">
                      <svg className="h-5 w-5 text-[#F97316]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-base font-medium text-gray-700">{t('authPage.login.features.fast')}</span>
                  </div>
                </div>
                <div className="mt-10 rounded-2xl border border-gray-100 bg-white/90 p-6 shadow-sm animate-rise-d4">
                  <div className="flex -space-x-2">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F97316] text-sm font-semibold text-white ring-2 ring-white">J</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#214296] text-sm font-semibold text-white ring-2 ring-white">M</span>
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#019C47] text-sm font-semibold text-white ring-2 ring-white">S</span>
                  </div>
                  <div className="mt-3 flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <svg key={i} className="h-5 w-5 text-[#F97316]" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="mt-2 text-sm italic text-gray-600">
                    {t('authPage.login.testimonial.quote')}
                  </p>
                  <p className="mt-2 text-sm text-gray-500">{t('authPage.login.testimonial.author')}</p>
                </div>
              </>
            ) : (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#019C47]/10 px-4 py-1.5 text-sm font-medium text-[#019C47] animate-rise">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {t('authPage.signup.badge')}
                </span>
                <h1 className="mt-6 text-3xl font-bold leading-tight text-[#0F172A] sm:text-4xl animate-rise-d1">
                  {t('authPage.signup.title')}
                </h1>
                <p className="mt-4 text-lg text-gray-600 animate-rise-d2">
                  {t('authPage.signup.subtitle')}
                </p>
                <ul className="mt-8 space-y-4 animate-rise-d3">
                  <li className="flex items-center gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#F97316]">
                      <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-base text-gray-700">{t('authPage.signup.bullets.postTasks')}</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#F97316]">
                      <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-base text-gray-700">{t('authPage.signup.bullets.realtime')}</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#F97316]">
                      <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-base text-gray-700">{t('authPage.signup.bullets.ratings')}</span>
                  </li>
                </ul>
                <div className="mt-10 flex items-center gap-8 animate-rise-d4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#F97316]">100k+</p>
                    <p className="text-sm text-gray-500">{t('authPage.signup.stats.activeUsers')}</p>
                  </div>
                  <div className="h-10 w-px bg-gray-200" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#F97316]">25k+</p>
                    <p className="text-sm text-gray-500">{t('authPage.signup.stats.verifiedProviders')}</p>
                  </div>
                  <div className="h-10 w-px bg-gray-200" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#F97316]">4.8/5</p>
                    <p className="text-sm text-gray-500">{t('authPage.signup.stats.averageRating')}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <aside className="flex flex-1 items-start justify-center px-6 py-10 lg:items-center lg:py-16">
          <div className={`w-full max-w-md rounded-2xl border border-gray-100 bg-white shadow-xl animate-lift-in ${mode === 'signup' ? 'p-6' : 'p-8'}`}>
            {mode === 'signup' ? (
              <>
                <h2 className="text-xl font-bold text-[#0F172A]">{t('authPage.card.signupTitle')}</h2>
                <p className="mt-1 text-xs text-gray-500">
                  {t('authPage.card.signupSubtitle')}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <GoogleSignInButton mode="signup" label={t('authSocial.googleShort')} />
                  <FacebookSignInButton mode="signup" label={t('authSocial.facebookShort')} />
                </div>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-xs text-gray-500">{t('authPage.card.orLabel')}</span>
                  </div>
                </div>
                <SignupForm setMode={setMode} />
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-[#0F172A]">{t('authPage.card.loginTitle')}</h2>
                <p className="mt-2 text-sm text-gray-500">
                  {t('authPage.card.loginSubtitle')}
                </p>
                <div className="mt-6 space-y-4">
                  <GoogleSignInButton mode="login" label={t('authSocial.googleContinue')} />
                  <FacebookSignInButton mode="login" label={t('authSocial.facebookContinue')} />
                </div>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-3 text-sm text-gray-500">{t('authPage.card.orLabel')}</span>
                  </div>
                </div>
                <LoginForm setMode={setMode} />
              </>
            )}
          </div>
        </aside>
      </main>

      <div className="border-t border-gray-200 bg-white/50 py-4 animate-rise-d4">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-gray-500">
          {t('authPage.support.text')}{' '}
          <Link to="/contact" className="font-semibold text-[#F97316] hover:underline">
            {t('authPage.support.link')}
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
