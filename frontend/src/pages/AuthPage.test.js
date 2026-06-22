import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthPage from './AuthPage';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

jest.mock('../ui/LoginForm', () => () => <div>LoginForm</div>);
jest.mock('../ui/SignupForm', () => () => <div>SignupForm</div>);
jest.mock('../ui/GoogleSignInButton', () => () => <div>GoogleButton</div>);
jest.mock('../ui/FacebookSignInButton', () => () => <div>FacebookButton</div>);
jest.mock('../ui/SiteHeader', () => () => <div>Header</div>);
jest.mock('../ui/SiteFooter', () => () => <div>Footer</div>);

function renderAt(path, state) {
  const [pathname, search = ''] = path.split('?');
  return render(
    <MemoryRouter initialEntries={[{ pathname, search: search ? `?${search}` : '', state }]}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('AuthPage', () => {
  test('defaults to login mode', () => {
    renderAt('/auth');
    expect(screen.getByText('LoginForm')).toBeInTheDocument();
  });

  test('shows signup mode when query mode=signup', () => {
    renderAt('/auth?mode=signup');
    expect(screen.getByText('SignupForm')).toBeInTheDocument();
  });

  test('shows signup mode when location state requests it', () => {
    renderAt('/auth', { mode: 'signup' });
    expect(screen.getByText('SignupForm')).toBeInTheDocument();
  });
});
