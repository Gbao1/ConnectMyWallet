import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

const mockUseAuth = jest.fn();

jest.mock('./store/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('./pages/HomePage', () => () => <div>Home Page</div>);
jest.mock('./pages/PricingPage', () => () => <div>Pricing Page</div>);
jest.mock('./pages/HowItWorksPage', () => () => <div>How It Works Page</div>);
jest.mock('./pages/AboutPage', () => () => <div>About Page</div>);
jest.mock('./pages/TrustSafetyPage', () => () => <div>Trust Safety Page</div>);
jest.mock('./pages/ContactPage', () => () => <div>Contact Page</div>);
jest.mock('./pages/PrivacyPolicyPage', () => () => <div>Privacy Policy Page</div>);
jest.mock('./pages/TermsOfServicePage', () => () => <div>Terms Of Service Page</div>);
jest.mock('./pages/CookiesPage', () => () => <div>Cookies Page</div>);
jest.mock('./pages/CareersPage', () => () => <div>Careers Page</div>);
jest.mock('./pages/PaymentPage', () => () => <div>Payment Page</div>);
jest.mock('./pages/PaymentSuccessPage', () => () => <div>Payment Success Page</div>);
jest.mock('./pages/AuthPage', () => () => <div>Auth Page</div>);
jest.mock('./pages/UserDashboard', () => () => <div>User Dashboard</div>);
jest.mock('./pages/ProviderDashboard', () => () => <div>Provider Dashboard</div>);
jest.mock('./pages/PostTaskPage', () => () => <div>Post Task Page</div>);
jest.mock('./pages/FindTasksPage', () => () => <div>Find Tasks Page</div>);
jest.mock('./pages/ViewProviderPage', () => () => <div>View Provider Page</div>);
jest.mock('./pages/UserProfile', () => () => <div>User Profile Page</div>);
jest.mock('./pages/ProviderProfile', () => () => <div>Provider Profile Page</div>);

describe('App route guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.pushState({}, '', '/');
  });

  test('redirects unauthenticated users from private route to auth login', async () => {
    mockUseAuth.mockReturnValue({ user: null, initializing: false });
    window.history.pushState({}, '', '/dashboard');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Auth Page')).toBeInTheDocument();
    });
  });

  test('redirects authenticated provider from auth page to provider dashboard', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'provider' }, initializing: false });
    window.history.pushState({}, '', '/auth');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Provider Dashboard')).toBeInTheDocument();
    });
  });

  test('redirects authenticated non-provider from auth page to user dashboard', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'user' }, initializing: false });
    window.history.pushState({}, '', '/auth');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('User Dashboard')).toBeInTheDocument();
    });
  });

  // AUTH-13 — Provider cannot access user-only post task route
  test('authenticated provider visiting /tasks/new sees post task page (redirect handled inside page)', async () => {
    mockUseAuth.mockReturnValue({ user: { role: 'provider' }, initializing: false });
    window.history.pushState({}, '', '/tasks/new');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Post Task Page')).toBeInTheDocument();
    });
  });

  // AUTH-12 (variant) — unknown route redirects to home
  test('unknown route redirects to home page', async () => {
    mockUseAuth.mockReturnValue({ user: null, initializing: false });
    window.history.pushState({}, '', '/definitely-does-not-exist');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
  });
});
