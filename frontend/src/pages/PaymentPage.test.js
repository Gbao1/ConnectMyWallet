import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PaymentPage from './PaymentPage';
import { api } from '../api/client';

jest.mock('../api/client', () => ({
  api: jest.fn(),
}));

jest.mock('../store/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', role: 'user', email: 'test@example.com', firstName: 'Test', lastName: 'User' },
  }),
}));

jest.mock('../ui/SiteHeader', () => () => <div>Header</div>);
jest.mock('../ui/SiteFooter', () => () => <div>Footer</div>);

jest.mock('../utils/currency', () => ({
  convertCurrency: jest.fn(() => 1234.56),
  formatCurrency: jest.fn(() => '$9.99'),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'en' },
    t: (key, opts) => {
      if (key === 'payment.plans' && opts?.returnObjects) {
        return {
          basic: {
            name: 'Basic',
            priceType: 'free',
            priceValue: 0,
            priceNum: 0,
            description: 'Basic plan',
            features: ['Feature A'],
          },
          pro: {
            name: 'Pro',
            priceType: 'paid',
            priceValue: 9.99,
            priceNum: 9.99,
            description: 'Pro plan',
            features: ['Feature B'],
          },
          business: {
            name: 'Business',
            priceType: 'paid',
            priceValue: 29.99,
            priceNum: 29.99,
            description: 'Business plan',
            features: ['Feature C'],
          },
        };
      }
      return key;
    },
  }),
}));

function renderPage(initialEntry = '/payment?plan=pro&taskId=task-123') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PaymentPage />
    </MemoryRouter>
  );
}

async function fillValidBillingDetails() {
  await userEvent.clear(screen.getByPlaceholderText('payment.placeholders.email'));
  await userEvent.type(screen.getByPlaceholderText('payment.placeholders.email'), 'buyer@example.com');
  await userEvent.clear(screen.getByPlaceholderText('payment.placeholders.firstName'));
  await userEvent.type(screen.getByPlaceholderText('payment.placeholders.firstName'), 'Jane');
  await userEvent.clear(screen.getByPlaceholderText('payment.placeholders.lastName'));
  await userEvent.type(screen.getByPlaceholderText('payment.placeholders.lastName'), 'Doe');
  await userEvent.type(screen.getByPlaceholderText('payment.placeholders.postalCode'), '3000');
}

describe('PaymentPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  test('checkout is disabled until form is valid', async () => {
    renderPage();

    const checkoutBtn = screen.getByRole('button', { name: 'payment.checkout' });
    expect(checkoutBtn).toBeDisabled();

    await fillValidBillingDetails();

    expect(checkoutBtn).toBeEnabled();
  });

  test('free plan checkout shows receipt and does not call payment API', async () => {
    renderPage('/payment?plan=basic');

    await fillValidBillingDetails();
    await userEvent.click(screen.getByRole('button', { name: 'payment.checkout' }));

    await waitFor(() => {
      expect(screen.getByText('Payment Successful')).toBeInTheDocument();
    });
    expect(api).not.toHaveBeenCalled();
  });

  test('paid plan checkout initiates sslcommerz payment and stores pending transaction id', async () => {
    api.mockResolvedValueOnce({ paymentUrl: 'https://gateway.example/pay', transactionId: 'txn-123' });
    delete window.location;
    window.location = { assign: jest.fn() };

    renderPage('/payment?plan=pro&taskId=task-123');

    await fillValidBillingDetails();
    await userEvent.click(screen.getByRole('button', { name: 'payment.checkout' }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/api/payments/sslcommerz/initiate', expect.objectContaining({ method: 'POST' }));
    });
    expect(sessionStorage.getItem('pendingTransactionId')).toBe('txn-123');
    expect(window.location.assign).toHaveBeenCalledWith('https://gateway.example/pay');
  });

  test('shows error when paid plan API misses redirect payload', async () => {
    api.mockResolvedValueOnce({});
    renderPage('/payment?plan=pro&taskId=task-123');

    await fillValidBillingDetails();
    await userEvent.click(screen.getByRole('button', { name: 'payment.checkout' }));

    await waitFor(() => {
      expect(screen.getByText('Missing payment redirect data')).toBeInTheDocument();
    });
  });
});
