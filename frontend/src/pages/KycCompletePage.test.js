/**
 * KYC-01 to KYC-06 — KYC / identity verification
 */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import KycCompletePage from './KycCompletePage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => opts?.defaultValue ?? k }),
}));

let mockUser = null;
let mockInitializing = false;

jest.mock('../store/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, initializing: mockInitializing }),
}));

function renderPage(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/kyc-complete${search}`]}>
      <Routes>
        <Route path="/kyc-complete" element={<KycCompletePage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('KYC-01/03 — KYC complete redirect for provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitializing = false;
  });

  test('provider is redirected to /provider/profile after KYC', async () => {
    mockUser = { id: 'prov-1', role: 'provider' };
    renderPage();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/provider/profile', expect.objectContaining({ replace: true }));
    });
  });

  test('provider KYC status query param is forwarded to profile redirect', async () => {
    mockUser = { id: 'prov-1', role: 'provider' };
    renderPage('?kyc_status=verified');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/provider/profile?kyc_status=verified',
        expect.objectContaining({ replace: true })
      );
    });
  });
});

describe('KYC-01/06 — KYC complete redirect for user', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitializing = false;
  });

  test('user role is redirected to /profile after KYC', async () => {
    mockUser = { id: 'u1', role: 'user' };
    renderPage();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/profile', expect.objectContaining({ replace: true }));
    });
  });
});

describe('KYC-02 — Unauthenticated redirect to login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitializing = false;
    mockUser = null;
  });

  test('unauthenticated user is redirected to login', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/auth?mode=login', expect.objectContaining({ replace: true }));
    });
  });
});

describe('KYC-03 — Finalizing message shown during loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitializing = true;
    mockUser = null;
  });

  test('shows finalizing text while auth is initializing', () => {
    renderPage();
    expect(screen.getByText('Finalizing verification…')).toBeInTheDocument();
  });
});

describe('KYC-04 — KYC status query param preserved', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitializing = false;
  });

  test('failed kyc_status is forwarded in redirect', async () => {
    mockUser = { id: 'prov-1', role: 'provider' };
    renderPage('?kyc_status=failed');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/provider/profile?kyc_status=failed',
        expect.any(Object)
      );
    });
  });
});

describe('KYC-05 — Verified provider can bid (post-KYC)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitializing = false;
  });

  test('provider with verified KYC is redirected to provider profile to continue', async () => {
    mockUser = { id: 'prov-2', role: 'provider', kyc: { status: 'verified' } };
    renderPage('?kyc_status=verified');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/provider/profile?kyc_status=verified',
        expect.any(Object)
      );
    });
  });
});
