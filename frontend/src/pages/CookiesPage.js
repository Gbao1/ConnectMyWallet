import BackButton from '../ui/BackButton';
import SiteFooter from '../ui/SiteFooter';
import SiteHeader from '../ui/SiteHeader';
import { useTranslation } from 'react-i18next';

export default function CookiesPage() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A]">
      <SiteHeader />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-6 py-16">
        <div className="mb-8">
          <BackButton />
        </div>
        <div className="rounded-3xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-[#0F172A] md:text-4xl">
            {t('cookies.title', { defaultValue: 'Cookies' })}
          </h1>
          <p className="mt-4 text-base text-[#64748B]">
            {t('cookies.intro', { defaultValue: 'We use cookies and similar technologies to keep you signed in, remember preferences, and understand how the platform is used.' })}
          </p>
          <div className="mt-6 space-y-4 text-sm text-[#64748B]">
            <p>
              {t('cookies.control', { defaultValue: 'You can control cookies in your browser settings. Some cookies are required for core functionality, while others help us improve the experience.' })}
            </p>
            <p>
              {t('cookies.consent', { defaultValue: 'By continuing to use ConnectMyTask, you agree to our use of cookies as described here.' })}
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
