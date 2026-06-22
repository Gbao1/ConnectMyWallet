import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from './ForgotPasswordPage';

const mockApi = jest.fn();

jest.mock('../api/client', () => ({
  api: (...args) => mockApi(...args),
}));

jest.mock('../ui/SiteHeader', () => () => <div>Header</div>);
jest.mock('../ui/SiteFooter', () => () => <div>Footer</div>);

function renderPage() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows mismatch error when passwords do not match', async () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Reset token'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByPlaceholderText('New password'), {
      target: { value: 'secret12' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
      target: { value: 'other123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    expect(await screen.findByText(/Passwords do not match/i)).toBeInTheDocument();
    expect(mockApi).not.toHaveBeenCalledWith('/api/auth/reset-password', expect.anything());
  });

  test('sends forgot-password request and success message', async () => {
    mockApi.mockResolvedValueOnce({ message: 'Reset code sent' });
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset code/i }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: 'user@example.com' }),
      });
    });

    expect(await screen.findByText('Reset code sent')).toBeInTheDocument();
  });

  test('submits reset-password with backend-compatible payload', async () => {
    mockApi
      .mockResolvedValueOnce({ message: 'Code request accepted' })
      .mockResolvedValueOnce({ message: 'Password reset successful' });

    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'user@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset code/i }));

    fireEvent.change(screen.getByPlaceholderText('Reset token'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByPlaceholderText('New password'), {
      target: { value: 'secret12' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), {
      target: { value: 'secret12' },
    });
    fireEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: 'user@example.com',
          token: '123456',
          newPassword: 'secret12',
        }),
      });
    });
  });
});
