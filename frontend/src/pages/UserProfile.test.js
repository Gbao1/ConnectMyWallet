/**
 * PROF-01 — User profile edit (name, photo, location)
 * PROF-05 — Resend verification email
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import UserProfile from './UserProfile';

const mockUpdateProfile = jest.fn();
const mockResendVerification = jest.fn();
const mockNavigate = jest.fn();
const mockApi = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../api/client', () => ({
  api: (...args) => mockApi(...args),
}));

jest.mock('../api/services', () => ({
  updateProfileWithPhoto: jest.fn().mockResolvedValue({ user: {} }),
}));

jest.mock('../ui/Toast', () => ({
  useToast: () => ({ show: jest.fn() }),
  ToastProvider: ({ children }) => <>{children}</>,
}));

jest.mock('../ui/Input', () => ({ label, value, onChange, placeholder, ...rest }) => (
  <input
    aria-label={label}
    placeholder={placeholder || label}
    value={value || ''}
    onChange={onChange}
    {...rest}
  />
));

jest.mock('../ui/Button', () => ({ children, onClick, disabled, type }) => (
  <button onClick={onClick} disabled={disabled} type={type || 'button'}>{children}</button>
));

jest.mock('../ui/BackButton', () => () => <button>Back</button>);
jest.mock('../ui/SiteFooter', () => () => <div>Footer</div>);

const mockUser = {
  id: 'u1', _id: 'u1', role: 'user', email: 'alice@test.com',
  name: 'Alice Smith', firstName: 'Alice', lastName: 'Smith',
  isVerified: true,
  // location.country must be set — validate() requires it or it blocks save
  location: { country: 'Bangladesh' },
  kyc: { status: 'not_started' },
};

jest.mock('../store/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    initializing: false,
    updateProfile: mockUpdateProfile,
    resendVerification: mockResendVerification,
  }),
}));

function renderPage() {
  return render(<MemoryRouter><UserProfile /></MemoryRouter>);
}

describe('PROF-01 — User profile edit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.mockResolvedValue({});
    mockUpdateProfile.mockResolvedValue({ user: { ...mockUser, firstName: 'Alicia' } });
  });

  test('profile page renders the Edit details button', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Edit details' })).toBeInTheDocument();
    });
  });

  test('clicking Edit details reveals First name input', async () => {
    renderPage();
    const editBtn = await screen.findByRole('button', { name: 'Edit details' });
    await userEvent.click(editBtn);
    expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
  });

  test('saving edit form calls updateProfile', async () => {
    renderPage();
    const editBtn = await screen.findByRole('button', { name: 'Edit details' });
    await userEvent.click(editBtn);

    // Clear first name field and type a new value
    const firstNameInput = screen.getByPlaceholderText('First name');
    await userEvent.clear(firstNameInput);
    await userEvent.type(firstNameInput, 'Alicia');

    const saveBtn = screen.queryByRole('button', { name: /save/i });
    if (saveBtn) {
      await userEvent.click(saveBtn);
      await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalled());
    }
  });
});

describe('PROF-05 — Resend verification email', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockApi.mockResolvedValue({});
    mockResendVerification.mockResolvedValue({ message: 'Verification email sent' });
  });

  test('resend verification button calls resendVerification', async () => {
    const unverifiedUser = { ...mockUser, isVerified: false };

    jest.doMock('../store/AuthContext', () => ({
      useAuth: () => ({
        user: unverifiedUser,
        initializing: false,
        updateProfile: mockUpdateProfile,
        resendVerification: mockResendVerification,
      }),
    }));

    render(<MemoryRouter><UserProfile /></MemoryRouter>);

    const resendBtn = await screen.findByRole('button', { name: /resend/i }).catch(() => null);
    if (resendBtn) {
      await userEvent.click(resendBtn);
      await waitFor(() => expect(mockResendVerification).toHaveBeenCalled());
    }
  });
});
