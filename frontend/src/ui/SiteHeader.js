import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { getDisplayName } from '../utils/displayName';

const baseLinks = [
  { key: 'home', to: '/' },
  { key: 'howItWorks', to: '/how-it-works' },
  { key: 'pricing', to: '/pricing' },
  { key: 'about', to: '/about' },
];

export default function SiteHeader() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const currentLanguage = i18n.resolvedLanguage || i18n.language || 'en';
  const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'bn', label: 'বাংলা' },
    { value: 'hi', label: 'हिंदी' },
    { value: 'ur', label: 'اردو' }
  ];

  const handleLanguageChange = (event) => {
    i18n.changeLanguage(event.target.value);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/');
  };

  const initials = user
    ? ((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase() || user.email?.[0]?.toUpperCase() || '?'
    : '';

  const displayName = getDisplayName(user, t('header.userFallback'));
  const role = user?.role ?? 'user';
  const isProvider = role === 'provider';
  const isAdmin = role === 'admin';
  const dashboardPath = isProvider ? '/provider-dashboard' : '/dashboard';

  const navLinks = [
    ...baseLinks,
    ...(!isProvider ? [{ key: 'postTask', to: '/tasks/new' }] : []),
    { key: 'browseProviders', to: '/find-tasks' },
  ];

  return (
    <header className="relative z-[200] border-b border-[#E2E8F0] bg-white">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center">
          <span className="inline-flex h-12 w-40 items-center justify-center overflow-hidden rounded-xl bg-transparent">
            <img
              src="/images/connectmytask_logo.png"
              alt="ConnectMyTask"
              className="h-full w-full object-contain"
            />
          </span>
        </Link>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden items-center gap-4 text-sm font-medium text-[#0F172A] md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.key}
                to={link.to}
                className="transition hover:text-[#F97316]"
              >
                {t(`nav.${link.key}`)}
              </Link>
            ))}
          </div>

          <div className="flex items-center">
            <label htmlFor="language-select" className="sr-only">
              {t('language.label')}
            </label>
            <select
              id="language-select"
              value={currentLanguage}
              onChange={handleLanguageChange}
              className="rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-[#0F172A] transition focus:border-[#F97316]/60 focus:outline-none focus:ring-2 focus:ring-[#F97316]/20"
            >
              {languageOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center gap-2.5 rounded-full border border-gray-200 py-1.5 pl-1.5 pr-4 transition hover:border-[#F97316]/40 hover:shadow-sm"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F97316] text-xs font-bold text-white">
                  {initials}
                </span>
                <span className="text-sm font-medium text-[#0F172A]">{displayName}</span>
                <svg className={`h-4 w-4 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-gray-100 bg-white py-2 shadow-lg">
                  <div className="border-b border-gray-100 px-4 pb-2">
                    <p className="text-sm font-semibold text-[#0F172A]">{displayName}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <Link
                    to={dashboardPath}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
                    </svg>
                    {t('header.menu.dashboard')}
                  </Link>
                  <Link
                    to={role === 'provider' ? '/provider/profile' : '/profile'}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {t('header.menu.profile')}
                  </Link>
                  {isProvider && (
                    <Link
                      to="/provider/wallet"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                    >
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5m0 0h-6m6 0a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      {t('header.menu.wallet')}
                    </Link>
                  )}
                  {!isProvider && (
                    <Link
                      to="/tasks/new"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                    >
                      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      {t('header.menu.postTask')}
                    </Link>
                  )}
                  <Link
                    to="/messages"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                  >
                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    {t('header.menu.messages')}
                  </Link>
                  {isAdmin && (
                    <>
                      <Link
                        to="/admin"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                      >
                        {t('header.menu.adminPanel')}
                      </Link>
                      <Link
                        to="/admin/fraud"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 transition hover:bg-gray-50"
                      >
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                        </svg>
                        {t('header.menu.fraudDashboard')}
                      </Link>
                    </>
                  )}
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1" />
                    </svg>
                    {t('header.menu.logout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/auth?mode=login"
                className="inline-flex items-center justify-center rounded-full border border-[#0F172A] px-5 py-2 text-sm font-semibold text-[#0F172A] transition hover:bg-[#0F172A] hover:text-white"
              >
                {t('header.auth.login')}
              </Link>
              <Link
                to="/auth?mode=signup"
                className="inline-flex items-center justify-center rounded-full bg-[#F97316] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#ea580c]"
              >
                {t('header.auth.signup')}
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
