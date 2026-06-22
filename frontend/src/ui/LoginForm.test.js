import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';

const mockLogin = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../store/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
  }),
}));

describe('LoginForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows validation errors for invalid email and short password', async () => {
    render(<LoginForm setMode={jest.fn()} />);

    await userEvent.type(screen.getByPlaceholderText('authForm.login.emailPlaceholder'), 'bad-email');
    await userEvent.type(screen.getByPlaceholderText('authForm.login.passwordPlaceholder'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'authForm.login.submit' }));

    expect(screen.getByText('authForm.login.errorEmail')).toBeInTheDocument();
    expect(screen.getByText('authForm.login.errorPassword')).toBeInTheDocument();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  test('submits trimmed email and navigates to provider dashboard for provider role', async () => {
    mockLogin.mockResolvedValueOnce({ user: { role: 'provider' } });

    render(<LoginForm setMode={jest.fn()} />);

    await userEvent.type(screen.getByPlaceholderText('authForm.login.emailPlaceholder'), '  test@example.com  ');
    await userEvent.type(screen.getByPlaceholderText('authForm.login.passwordPlaceholder'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'authForm.login.submit' }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ email: 'test@example.com', password: 'secret123' });
    });
    expect(mockNavigate).toHaveBeenCalledWith('/provider-dashboard');
  });

  test('shows server error when login fails', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));

    render(<LoginForm setMode={jest.fn()} />);

    await userEvent.type(screen.getByPlaceholderText('authForm.login.emailPlaceholder'), 'test@example.com');
    await userEvent.type(screen.getByPlaceholderText('authForm.login.passwordPlaceholder'), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: 'authForm.login.submit' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});
