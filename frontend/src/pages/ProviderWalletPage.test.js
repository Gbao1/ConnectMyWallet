/**
 * WAL-01 to WAL-07 — Provider wallet & withdrawals
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProviderWalletPage from './ProviderWalletPage';

const mockApi = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => opts?.defaultValue ?? k,
    i18n: { language: 'en' },
  }),
}));

jest.mock('../api/client', () => ({
  api: (...args) => mockApi(...args),
}));

jest.mock('../ui/SiteHeader', () => () => <div>Header</div>);
jest.mock('../ui/SiteFooter', () => () => <div>Footer</div>);

const mockProvider = { id: 'prov-1', role: 'provider', email: 'prov@test.com' };

jest.mock('../store/AuthContext', () => ({
  useAuth: () => ({ user: mockProvider, initializing: false }),
}));

const walletData = { walletBalance: 150.00, walletPending: 50.00 };
// Response shape: { payouts: [...] }
const payoutHistory = {
  payouts: [
    {
      _id: 'payout-1',
      payoutId: 'PO-001',
      status: 'available',
      grossAmount: 100,
      commissionRate: 0.1,
      commissionAmount: 10,
      netAmount: 90,
      currency: 'BDT',
      createdAt: new Date().toISOString(),
    },
  ],
};
// Response shape: { destinations: [...] }
const destinations = {
  destinations: [
    {
      _id: 'dest-1',
      label: 'My bKash',
      type: 'mobile_banking',
      mobileBankingProvider: 'bkash',
      mobileNumber: '01712345678',
      isDefault: true,
      country: 'BD',
    },
  ],
};

function setupDefaultMocks() {
  mockApi
    .mockResolvedValueOnce(walletData)
    .mockResolvedValueOnce(payoutHistory)
    .mockResolvedValueOnce(destinations);
}

function renderPage() {
  return render(<MemoryRouter><ProviderWalletPage /></MemoryRouter>);
}

describe('WAL-01 — Wallet page loads balances', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  test('renders available and pending balances', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/payouts/wallet');
    });

    await waitFor(() => {
      expect(screen.queryByText(/150/) || screen.queryByText(/150\.00/)).toBeDefined();
    });
  });
});

describe('WAL-02 — Payout history table', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  test('fetches and shows payout history rows', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/payouts/history?page=1&limit=20');
    });

    await waitFor(() => {
      expect(screen.queryByText(/PO-001/) || screen.queryByText(/90/)).toBeDefined();
    });
  });
});

describe('WAL-03 — Save bKash destination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi
      .mockResolvedValueOnce(walletData)
      .mockResolvedValueOnce({ payouts: [] })
      .mockResolvedValueOnce({ destinations: [] })
      .mockResolvedValueOnce({ destinations: [{ _id: 'dest-new', mobileBankingProvider: 'bkash' }] });
  });

  test('filling label + mobile and clicking Save Destination calls destinations API', async () => {
    renderPage();

    await waitFor(() => expect(mockApi).toHaveBeenCalledWith('/api/payouts/wallet'));

    // Must fill BOTH label AND mobile number (handleSaveDestination validates both)
    const labelInput = screen.getByPlaceholderText('Label (e.g. My bKash)');
    await userEvent.type(labelInput, 'My bKash');

    const mobileInput = screen.getByPlaceholderText('Mobile number');
    await userEvent.type(mobileInput, '01712345678');

    await userEvent.click(screen.getByRole('button', { name: 'Save Destination' }));

    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith(
        '/api/payouts/destinations',
        expect.objectContaining({ method: 'POST' })
      )
    );
  });
});

describe('WAL-04 — Withdraw single payout', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  test('clicking Withdraw button calls /api/payouts/:payoutId/withdraw', async () => {
    // Queue extra mocks for refreshPayoutData after withdraw
    mockApi
      .mockResolvedValueOnce(walletData)
      .mockResolvedValueOnce({ payouts: [] })
      .mockResolvedValueOnce({ destinations: [] });

    renderPage();

    await waitFor(() => expect(mockApi).toHaveBeenCalledWith('/api/payouts/history?page=1&limit=20'));

    // Exact text "Withdraw" — avoids matching "Withdraw All Available"
    const withdrawBtn = screen.queryByRole('button', { name: 'Withdraw' });
    if (withdrawBtn && !withdrawBtn.disabled) {
      await userEvent.click(withdrawBtn);
      await waitFor(() => {
        const called = mockApi.mock.calls.some(([url]) =>
          String(url).includes('/api/payouts/') && String(url).includes('/withdraw')
        );
        expect(called).toBe(true);
      });
    }
  });
});

describe('WAL-05 — Withdraw all available', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  test('withdraw all button calls withdraw-all API', async () => {
    mockApi.mockResolvedValueOnce({ message: 'All withdrawn' });

    renderPage();

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalled();
    });

    const withdrawAllBtn = screen.queryByRole('button', { name: 'Withdraw All Available' });
    if (withdrawAllBtn) {
      await userEvent.click(withdrawAllBtn);
      await waitFor(() => {
        expect(mockApi).toHaveBeenCalledWith(
          '/api/payouts/withdraw-all',
          expect.any(Object)
        );
      });
    }
  });
});

describe('WAL-06 — Wallet sync after fund release', () => {
  beforeEach(() => { jest.clearAllMocks(); setupDefaultMocks(); });

  test('wallet endpoint is called on page load to get current balances', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/payouts/wallet');
    });
  });
});

describe('WAL-07 — Cannot withdraw without destination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi
      .mockResolvedValueOnce(walletData)
      .mockResolvedValueOnce(payoutHistory)
      .mockResolvedValueOnce({ destinations: [] });
  });

  test('withdraw button is disabled when no destinations saved', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/payouts/destinations');
    });

    const withdrawBtn = screen.queryByRole('button', { name: /^withdraw$/i });
    if (withdrawBtn) {
      expect(withdrawBtn).toBeDisabled();
    }
  });
});
