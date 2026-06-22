import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import VerifyEmailPage from './VerifyEmailPage';

const mockApi = jest.fn();

jest.mock('../api/client', () => ({
  api: (...args) => mockApi(...args),
}));

jest.mock('../ui/SiteHeader', () => () => <div>Header</div>);
jest.mock('../ui/SiteFooter', () => () => <div>Footer</div>);

function renderWithRoute(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows missing token message', async () => {
    renderWithRoute('/verify-email');
    expect(await screen.findByText(/Missing verification token/i)).toBeInTheDocument();
  });

  test('shows success message after verification', async () => {
    mockApi.mockResolvedValueOnce({ message: 'Verified!' });
    renderWithRoute('/verify-email?token=abc');

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith('/api/auth/verify-email?token=abc', expect.any(Object));
    });
    expect(await screen.findByText('Verified!')).toBeInTheDocument();
  });

  test('shows API error message on failure', async () => {
    mockApi.mockRejectedValueOnce(new Error('Invalid token'));
    renderWithRoute('/verify-email?token=abc');
    expect(await screen.findByText('Invalid token')).toBeInTheDocument();
  });
});
