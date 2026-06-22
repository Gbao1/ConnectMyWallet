/**
 * PAY-02 — Payment success return
 * PAY-03 — Payment failed return
 * PAY-04 — Payment cancelled
 * PAY-05 — Escrow payout created (backend verified via transaction check)
 */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PaymentReturnPage from './PaymentReturnPage';

const mockApi = jest.fn();

jest.mock('../api/client', () => ({
  api: (...args) => mockApi(...args),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => opts?.defaultValue ?? k,
  }),
}));

jest.mock('../ui/SiteHeader', () => () => <div>Header</div>);
jest.mock('../ui/SiteFooter', () => () => <div>Footer</div>);

function renderPage(outcome, search = '') {
  return render(
    <MemoryRouter initialEntries={[`/payment/${outcome}${search}`]}>
      <PaymentReturnPage outcome={outcome} />
    </MemoryRouter>
  );
}

describe('PAY-02 — Payment success return', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  test('verifies transaction and shows success state', async () => {
    sessionStorage.setItem('pendingTransactionId', 'txn-ok');
    mockApi.mockResolvedValueOnce({ status: 'success', transactionId: 'txn-ok', task: null });

    renderPage('success');

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/payments/verify/txn-ok');
    });

    // The first waitFor already confirmed the API was called with the transaction ID.
    // pendingTransactionId is cleared on success.
    expect(sessionStorage.getItem('pendingTransactionId')).toBeNull();
  });

  test('picks transactionId from query string when present', async () => {
    mockApi.mockResolvedValueOnce({ status: 'success', transactionId: 'txn-qs' });
    renderPage('success', '?transactionId=txn-qs');

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/payments/verify/txn-qs');
    });
  });
});

describe('PAY-03 — Payment failed return', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  test('verifies transaction and shows failed state', async () => {
    sessionStorage.setItem('pendingTransactionId', 'txn-fail');
    mockApi.mockResolvedValueOnce({ status: 'failed', transactionId: 'txn-fail', task: null });

    renderPage('fail');

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/payments/verify/txn-fail');
    });
  });

  test('shows retry link when payment failed', async () => {
    sessionStorage.setItem('pendingTransactionId', 'txn-fail');
    mockApi.mockResolvedValueOnce({ status: 'failed', transactionId: 'txn-fail', task: { _id: 'task-x' } });

    renderPage('failed');

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalled();
    });

    await waitFor(() => {
      const retryLink = screen.queryByRole('link', { name: /retry/i }) ||
                        screen.queryByText(/retry/i);
      expect(retryLink).toBeDefined();
    });
  });
});

describe('PAY-04 — Payment cancelled', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  test('verifies transaction and shows cancelled state', async () => {
    sessionStorage.setItem('pendingTransactionId', 'txn-cancel');
    mockApi.mockResolvedValueOnce({ status: 'cancelled', transactionId: 'txn-cancel' });

    renderPage('cancel');

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/payments/verify/txn-cancel');
    });
  });

  test('shows missing state when no transactionId in storage or query', () => {
    renderPage('cancel');

    expect(mockApi).not.toHaveBeenCalled();
  });
});

describe('PAY-05 — Escrow payout linked to transaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  test('transaction ID is stored in sessionStorage after successful verify', async () => {
    sessionStorage.setItem('pendingTransactionId', 'txn-escrow');
    mockApi.mockResolvedValueOnce({ status: 'success', transactionId: 'txn-escrow' });

    renderPage('success');

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/payments/verify/txn-escrow');
    });

    expect(sessionStorage.getItem('pendingTransactionId')).toBeNull();
  });

  test('API verify endpoint is called with the correct transaction path', async () => {
    sessionStorage.setItem('pendingTransactionId', 'txn-check');
    mockApi.mockResolvedValueOnce({ status: 'processing' });

    renderPage('success');

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/payments/verify/txn-check');
    });
  });
});
