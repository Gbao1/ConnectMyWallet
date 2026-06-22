import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function SiteFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-[#E2E8F0] bg-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-12 md:grid-cols-4">
        <div>
          <div className="inline-flex h-10 w-36 items-center justify-center overflow-hidden rounded-xl bg-transparent">
            <img
              src="/images/connectmytask_logo.png"
              alt="ConnectMyTask"
              className="h-full w-full object-contain"
            />
          </div>
          <p className="mt-3 text-sm text-[#64748B]">
            {t('footer.tagline')}
          </p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-[#0F172A]">
            {t('footer.sections.platform')}
          </h4>
          <div className="mt-3 space-y-2 text-sm text-[#64748B]">
            <Link className="block hover:text-[#F97316]" to="/pricing">
              {t('footer.links.pricing')}
            </Link>
            <Link className="block hover:text-[#F97316]" to="/tasks/new">
              {t('footer.links.postTask')}
            </Link>
            <Link className="block hover:text-[#F97316]" to="/find-tasks">
              {t('footer.links.browseProviders')}
            </Link>
            <Link className="block hover:text-[#F97316]" to="/trust-safety">
              {t('footer.links.trustSafety')}
            </Link>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-[#0F172A]">
            {t('footer.sections.company')}
          </h4>
          <div className="mt-3 space-y-2 text-sm text-[#64748B]">
            <Link className="block hover:text-[#2563EB]" to="/about">
              {t('footer.links.about')}
            </Link>
            <Link className="block hover:text-[#2563EB]" to="/careers">
              {t('footer.links.careers')}
            </Link>
            <Link className="block hover:text-[#2563EB]" to="/contact">
              {t('footer.links.contact')}
            </Link>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wide text-[#0F172A]">
            {t('footer.sections.legal')}
          </h4>
          <div className="mt-3 space-y-2 text-sm text-[#64748B]">
            <Link className="block hover:text-[#2563EB]" to="/privacy-policy">
              {t('footer.links.privacyPolicy')}
            </Link>
            <Link className="block hover:text-[#2563EB]" to="/terms-of-service">
              {t('footer.links.termsOfService')}
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-[#E2E8F0]">
        <div className="mx-auto w-full max-w-6xl px-6 py-4 text-center text-xs text-[#64748B]">
          {t('footer.copyright')}
        </div>
      </div>
    </footer>
  );
}
