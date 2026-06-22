/**
 * AUTH-01 — Register new customer (user role)
 * AUTH-05 — Register new provider
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SignupForm from './SignupForm';

const mockRegister = jest.fn();

jest.mock('../store/AuthContext', () => ({
  useAuth: () => ({ register: mockRegister }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

async function fillForm({ firstName = 'Alice', lastName = 'Smith', email = 'alice@example.com', password = 'secret123', role = 'user' } = {}) {
  await userEvent.type(screen.getByPlaceholderText('authForm.signup.firstNamePlaceholder'), firstName);
  await userEvent.type(screen.getByPlaceholderText('authForm.signup.lastNamePlaceholder'), lastName);
  await userEvent.type(screen.getByPlaceholderText('authForm.signup.emailPlaceholder'), email);
  await userEvent.type(screen.getByPlaceholderText('authForm.signup.passwordPlaceholder'), password);
  await userEvent.type(screen.getByPlaceholderText('authForm.signup.confirmPasswordPlaceholder'), password);

  if (role === 'provider') {
    const providerRadio = screen.getByLabelText(/provider/i);
    await userEvent.click(providerRadio);
  }

  const termsCheckbox = screen.getByRole('checkbox');
  await userEvent.click(termsCheckbox);
}

function renderForm() {
  const setMode = jest.fn();
  render(
    <MemoryRouter>
      <SignupForm setMode={setMode} />
    </MemoryRouter>
  );
  return { setMode };
}

describe('AUTH-01 — Register new customer (user role)', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('submits registration with user role and shows success message', async () => {
    mockRegister.mockResolvedValueOnce({ msg: 'Registration successful. Please check your email to verify your account before logging in.' });
    const { setMode } = renderForm();

    await fillForm({ role: 'user' });
    await userEvent.click(screen.getByRole('button', { name: /authForm.signup.createAccount/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({
        email: 'alice@example.com',
        role: 'user',
      }));
    });

    await waitFor(() => {
      expect(setMode).toHaveBeenCalledWith('login');
    });
  });

  test('shows validation errors when required fields are empty', async () => {
    renderForm();
    await userEvent.click(screen.getByRole('button', { name: /authForm.signup.createAccount/i }));

    expect(mockRegister).not.toHaveBeenCalled();
    expect(screen.getByText('authForm.signup.errorFirstName')).toBeInTheDocument();
    expect(screen.getByText('authForm.signup.errorEmail')).toBeInTheDocument();
    expect(screen.getByText('authForm.signup.errorPassword')).toBeInTheDocument();
    // errorTerms only changes the label CSS class — no separate error text is rendered
  });

  test('shows mismatch error when passwords differ', async () => {
    renderForm();
    await userEvent.type(screen.getByPlaceholderText('authForm.signup.firstNamePlaceholder'), 'Alice');
    await userEvent.type(screen.getByPlaceholderText('authForm.signup.lastNamePlaceholder'), 'Smith');
    await userEvent.type(screen.getByPlaceholderText('authForm.signup.emailPlaceholder'), 'alice@example.com');
    await userEvent.type(screen.getByPlaceholderText('authForm.signup.passwordPlaceholder'), 'secret123');
    await userEvent.type(screen.getByPlaceholderText('authForm.signup.confirmPasswordPlaceholder'), 'different');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: /authForm.signup.createAccount/i }));

    expect(screen.getByText('authForm.signup.errorConfirm')).toBeInTheDocument();
    expect(mockRegister).not.toHaveBeenCalled();
  });

  test('shows server error when registration fails', async () => {
    mockRegister.mockRejectedValueOnce(new Error('User already exists'));
    renderForm();

    await fillForm({ role: 'user' });
    await userEvent.click(screen.getByRole('button', { name: /authForm.signup.createAccount/i }));

    await waitFor(() => {
      expect(screen.getByText('User already exists')).toBeInTheDocument();
    });
  });
});

describe('AUTH-05 — Register new provider', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('submits registration with provider role', async () => {
    mockRegister.mockResolvedValueOnce({ msg: 'Registration successful. Please check your email.' });
    renderForm();

    await fillForm({ role: 'provider' });
    await userEvent.click(screen.getByRole('button', { name: /authForm.signup.createAccount/i }));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({
        role: 'provider',
        email: 'alice@example.com',
      }));
    });
  });
});
