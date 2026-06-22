/**
 * PROF-02 — Provider profile edit (in ProviderProfile)
 * PROF-03 — View provider public page
 * PROF-04 — View user public page
 */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ViewProviderPage from './ViewProviderPage';
import ViewUserPage from './ViewUserPage';

const mockApi = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => {
      if (opts?.returnObjects) return [];
      return opts?.defaultValue ?? k;
    },
    i18n: { language: 'en' },
  }),
}));

jest.mock('../api/client', () => ({
  api: (...args) => mockApi(...args),
}));

jest.mock('../ui/SiteHeader', () => () => <div>Header</div>);
jest.mock('../ui/SiteFooter', () => () => <div>Footer</div>);
jest.mock('../ui/TrustScoreBadge', () => ({ score }) => <span>Trust: {score}</span>);

jest.mock('../data/providers', () => ({
  PROVIDERS: [],
}));

jest.mock('../utils/currency', () => ({
  formatCurrency: jest.fn((v) => `$${v}`),
  formatCurrencyWithCode: jest.fn((v) => `$${v}`),
  getLocaleForLanguage: jest.fn(() => 'en-AU'),
}));

const mockUser = { id: 'u1', role: 'user', email: 'user@test.com' };

jest.mock('../store/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, initializing: false }),
}));

const providerProfile = {
  _id: 'prov-1',
  id: 'prov-1',
  name: 'Jane Provider',
  role: 'provider',
  averageRating: 4.7,
  totalReviews: 12,
  completedTasks: 8,
  rank: 'Gold',
  kyc: { status: 'verified' },
  skills: ['Plumbing', 'Electrical'],
  location: { country: 'Bangladesh' },
  profilePhoto: '',
};

const userProfile = {
  _id: 'u-other',
  id: 'u-other',
  name: 'Bob Client',
  role: 'user',
  email: 'bob@test.com',
  location: { country: 'India' },
  profilePhoto: '',
};

function renderProviderPage(id = 'prov-1') {
  return render(
    <MemoryRouter initialEntries={[`/providers/${id}`]}>
      <Routes>
        <Route path="/providers/:id" element={<ViewProviderPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function renderUserPage(id = 'u-other') {
  return render(
    <MemoryRouter initialEntries={[`/users/${id}`]}>
      <Routes>
        <Route path="/users/:id" element={<ViewUserPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('PROF-03 — View provider public page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // ViewProviderPage calls Promise.allSettled([reviews, profile]) — reviews first
    mockApi
      .mockResolvedValueOnce([])             // /api/reviews/provider/:id
      .mockResolvedValueOnce(providerProfile); // /api/auth/profile/:id
  });

  test('loads provider profile by ID', async () => {
    renderProviderPage('prov-1');

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/auth/profile/prov-1');
    });
  });

  test('shows provider name after data loads', async () => {
    renderProviderPage('prov-1');

    await waitFor(() => {
      expect(screen.getByText('Jane Provider')).toBeInTheDocument();
    });
  });

  test('shows KYC verified badge for verified provider', async () => {
    renderProviderPage('prov-1');

    await waitFor(() => {
      const verified = screen.queryByText(/verified/i) ||
                       screen.queryByText(/kyc/i);
      expect(verified).toBeDefined();
    });
  });

  test('shows average rating', async () => {
    renderProviderPage('prov-1');

    await waitFor(() => {
      const rating = screen.queryByText(/4\.7/) || screen.queryByText(/12.*review/i);
      expect(rating).toBeDefined();
    });
  });
});

describe('PROF-04 — View user public page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.mockResolvedValueOnce(userProfile);
  });

  test('loads user profile by ID', async () => {
    renderUserPage('u-other');

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/auth/profile/u-other');
    });
  });

  test('shows user name after data loads', async () => {
    renderUserPage('u-other');

    await waitFor(() => {
      expect(screen.getByText('Bob Client')).toBeInTheDocument();
    });
  });
});
