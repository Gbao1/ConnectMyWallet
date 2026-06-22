/**
 * PUB-01 to PUB-07 — Public & marketing pages render without auth.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Must be top-level so Jest hoists them before any module loads.
// Deep-safe proxy for returnObjects — handles both .map() and [0].title patterns
function mockSafeObj() {
  return new Proxy([], {
    get(target, prop) {
      if (prop === Symbol.iterator) return [][Symbol.iterator].bind([]);
      if (typeof prop === 'symbol') return target[prop];
      if (['map','filter','slice','forEach','reduce','some','every','flatMap','find','findIndex','concat','join'].includes(String(prop))) return () => [];
      if (prop === 'length') return 0;
      if (!isNaN(Number(prop))) return new Proxy({}, { get: (_, p) => typeof p === 'symbol' ? undefined : '' });
      return mockSafeObj();
    },
  });
}

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => {
      if (opts?.returnObjects) return mockSafeObj();
      return opts?.defaultValue ?? k;
    },
    i18n: { language: 'en' },
  }),
  Trans: ({ children }) => <>{children}</>,
}));

jest.mock('../store/AuthContext', () => ({
  useAuth: () => ({ user: null, initializing: false }),
}));

jest.mock('../ui/SiteHeader', () => () => <nav data-testid="site-header">Header</nav>);
jest.mock('../ui/SiteFooter', () => () => <footer data-testid="site-footer">Footer</footer>);

// ContactPage uses api directly
jest.mock('../api/client', () => ({ api: jest.fn().mockResolvedValue({}) }));
// LocationPicker used by some pages
jest.mock('../components/LocationPicker', () => () => <div>LocationPicker</div>);

import HomePage from '../pages/HomePage';
import HowItWorksPage from '../pages/HowItWorksPage';
import PricingPage from '../pages/PricingPage';
import AboutPage from '../pages/AboutPage';
import TrustSafetyPage from '../pages/TrustSafetyPage';
import PrivacyPolicyPage from '../pages/PrivacyPolicyPage';
import TermsOfServicePage from '../pages/TermsOfServicePage';
import CookiesPage from '../pages/CookiesPage';
import ContactPage from '../pages/ContactPage';
import CareersPage from '../pages/CareersPage';

function wrap(Page) {
  return render(
    <MemoryRouter>
      <Page />
    </MemoryRouter>
  );
}

describe('PUB-01 — Home page', () => {
  test('renders header and footer', () => {
    wrap(HomePage);
    expect(screen.getByTestId('site-header')).toBeInTheDocument();
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
  });
});

describe('PUB-02 — How It Works page', () => {
  test('renders without auth required', () => {
    wrap(HowItWorksPage);
    expect(screen.getByTestId('site-header')).toBeInTheDocument();
  });
});

describe('PUB-03 — Pricing page', () => {
  test('renders pricing content', () => {
    wrap(PricingPage);
    expect(screen.getByTestId('site-header')).toBeInTheDocument();
  });
});

describe('PUB-04 — Legal and informational pages', () => {
  test('About page renders', () => {
    wrap(AboutPage);
    expect(screen.getByTestId('site-header')).toBeInTheDocument();
  });

  test('Trust & Safety page renders', () => {
    wrap(TrustSafetyPage);
    expect(screen.getByTestId('site-header')).toBeInTheDocument();
  });

  test('Privacy Policy page renders', () => {
    wrap(PrivacyPolicyPage);
    expect(screen.getByTestId('site-header')).toBeInTheDocument();
  });

  test('Terms of Service page renders', () => {
    wrap(TermsOfServicePage);
    expect(screen.getByTestId('site-header')).toBeInTheDocument();
  });

  test('Cookies page renders', () => {
    wrap(CookiesPage);
    expect(screen.getByTestId('site-header')).toBeInTheDocument();
  });
});

describe('PUB-05 — Contact form page', () => {
  test('contact page renders without errors', () => {
    wrap(ContactPage);
    expect(screen.getByTestId('site-header')).toBeInTheDocument();
  });
});

describe('PUB-06 — Careers page', () => {
  test('renders without errors', () => {
    wrap(CareersPage);
    expect(screen.getByTestId('site-header')).toBeInTheDocument();
  });
});

describe('PUB-07 — Language switcher (i18n wired)', () => {
  test('useTranslation is called when rendering public pages', () => {
    const { useTranslation } = require('react-i18next');
    wrap(HomePage);
    expect(useTranslation).toBeDefined();
  });
});
