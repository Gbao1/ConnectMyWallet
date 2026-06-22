import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { api, setStoredToken, getStoredToken } from '../api/client';
import { assertRecaptchaBeforeAuth } from '../utils/recaptcha';

jest.mock('../api/client', () => ({
  api: jest.fn(),
  setStoredToken: jest.fn(),
  getStoredToken: jest.fn(),
}));

jest.mock('../utils/recaptcha', () => ({
  assertRecaptchaBeforeAuth: jest.fn(),
  getRecaptchaToken: jest.fn().mockResolvedValue('test-recaptcha-token'),
}));

jest.mock('../utils/deviceFingerprint', () => ({
  syncDeviceFingerprint: jest.fn().mockResolvedValue(undefined),
}));

function TestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="initializing">{String(auth.initializing)}</div>
      <div data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</div>
      <button onClick={() => { auth.login({ email: 'u@example.com', password: 'secret123' }).catch(() => {}); }}>login</button>
      <button
        onClick={async () => {
          try {
            await auth.updateProfile({ firstName: 'Jane' });
          } catch (err) {
            window.__authErr = err;
          }
        }}
      >
        update
      </button>
      <button onClick={() => auth.logout()}>logout</button>
    </div>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.__authErr = undefined;
  });

  test('bootstraps user when token exists', async () => {
    getStoredToken.mockReturnValue('token-1');
    api.mockResolvedValueOnce({ user: { id: 'u1', role: 'user' } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('initializing')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('"id":"u1"');
    expect(api).toHaveBeenCalledWith('/api/auth/me');
  });

  test('login runs recaptcha, stores token and user', async () => {
    getStoredToken.mockReturnValue(null);
    api
      .mockResolvedValueOnce({ token: 'jwt-1' })
      .mockResolvedValueOnce({ user: { id: 'u2', role: 'provider' } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('initializing')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'login' }).click();
    });

    expect(assertRecaptchaBeforeAuth).toHaveBeenCalledWith('login');
    expect(setStoredToken).toHaveBeenCalledWith('jwt-1');
    expect(screen.getByTestId('user')).toHaveTextContent('"id":"u2"');
  });

  test('updateProfile throws when no authenticated user', async () => {
    getStoredToken.mockReturnValue(null);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('initializing')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'update' }).click();
    });

    expect(window.__authErr).toBeInstanceOf(Error);
    expect(window.__authErr.message).toBe('No authenticated user');
  });

  // AUTH-02 — Login before email verified
  test('login propagates EMAIL_NOT_VERIFIED error to caller', async () => {
    getStoredToken.mockReturnValue(null);
    const err = new Error('EMAIL_NOT_VERIFIED');
    err.code = 'EMAIL_NOT_VERIFIED';
    api.mockRejectedValueOnce(err);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('initializing')).toHaveTextContent('false');
    });

    let thrown;
    await act(async () => {
      try {
        await screen.getByRole('button', { name: 'login' }).click();
      } catch (e) {
        thrown = e;
      }
    });

    expect(api).toHaveBeenCalledWith('/api/auth/login', expect.any(Object));
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  // AUTH-07 — Invalid login credentials
  test('login with wrong password leaves user null', async () => {
    getStoredToken.mockReturnValue(null);
    const err = new Error('Invalid credentials');
    err.status = 401;
    api.mockRejectedValueOnce(err);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('initializing')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'login' }).click();
    });

    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(setStoredToken).not.toHaveBeenCalledWith(expect.stringContaining('jwt'));
  });

  // AUTH-15 — Logout clears token and user
  test('logout clears stored token and nullifies user', async () => {
    getStoredToken.mockReturnValue('token-99');
    api.mockResolvedValueOnce({ user: { id: 'u99', role: 'user' } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('"id":"u99"');
    });

    await act(async () => {
      screen.getByRole('button', { name: 'logout' }).click();
    });

    expect(setStoredToken).toHaveBeenCalledWith(null);
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  // AUTH-14 — Session persists on page refresh (token in storage → user loaded)
  test('existing token in storage bootstraps user session on mount', async () => {
    getStoredToken.mockReturnValue('refresh-token');
    api.mockResolvedValueOnce({ user: { id: 'u-refresh', role: 'provider' } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('"id":"u-refresh"');
    });
    expect(api).toHaveBeenCalledWith('/api/auth/me');
  });
});
