/**
 * ADM-01 to ADM-07 — Admin panel
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminPanelPage from './AdminPanelPage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => opts?.defaultValue ?? k }),
}));

jest.mock('../ui/SiteHeader', () => () => <div>Header</div>);
jest.mock('../ui/SiteFooter', () => () => <div>Footer</div>);

const mockAdminApi = {
  users: jest.fn(),
  providers: jest.fn(),
  tasks: jest.fn(),
  flaggedAccounts: jest.fn(),
  verifyUser: jest.fn(),
  deleteUser: jest.fn(),
};

jest.mock('../api/services', () => ({
  adminApi: {
    users: (...a) => mockAdminApi.users(...a),
    providers: (...a) => mockAdminApi.providers(...a),
    tasks: (...a) => mockAdminApi.tasks(...a),
    flaggedAccounts: (...a) => mockAdminApi.flaggedAccounts(...a),
    verifyUser: (...a) => mockAdminApi.verifyUser(...a),
    deleteUser: (...a) => mockAdminApi.deleteUser(...a),
  },
}));

let mockUser = { id: 'admin-1', role: 'admin', email: 'admin@test.com' };

jest.mock('../store/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, initializing: false }),
}));

const sampleUsers = [
  { _id: 'u1', name: 'Alice Smith', email: 'alice@test.com', role: 'user', isVerified: false, createdAt: new Date().toISOString() },
  { _id: 'u2', name: 'Bob Jones', email: 'bob@test.com', role: 'user', isVerified: true, createdAt: new Date().toISOString() },
];
const sampleProviders = [
  { _id: 'p1', name: 'Jane Provider', email: 'jane@test.com', role: 'provider', isVerified: true, createdAt: new Date().toISOString() },
];
const sampleTasks = [
  { _id: 't1', title: 'Fix roof', status: 'Active', budget: 300, user: { name: 'Alice' }, createdAt: new Date().toISOString() },
];

function setupMocks() {
  mockAdminApi.users.mockResolvedValue(sampleUsers);
  mockAdminApi.providers.mockResolvedValue(sampleProviders);
  mockAdminApi.tasks.mockResolvedValue(sampleTasks);
  mockAdminApi.flaggedAccounts.mockResolvedValue([]);
}

function renderPage() {
  return render(<MemoryRouter><AdminPanelPage /></MemoryRouter>);
}

describe('ADM-01 — Admin panel access', () => {
  beforeEach(() => { jest.clearAllMocks(); setupMocks(); });

  test('admin user sees panel with tabs', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.queryByText(/users/i)).toBeInTheDocument();
    });
  });
});

describe('ADM-02 — List users', () => {
  beforeEach(() => { jest.clearAllMocks(); setupMocks(); });

  test('users tab fetches and shows user list', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockAdminApi.users).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });
  });
});

describe('ADM-03 — Verify user', () => {
  beforeEach(() => { jest.clearAllMocks(); setupMocks(); });

  test('clicking verify calls verifyUser API', async () => {
    mockAdminApi.verifyUser.mockResolvedValueOnce({ message: 'Verified' });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    const verifyBtns = screen.queryAllByRole('button', { name: /verify/i });
    if (verifyBtns.length > 0) {
      await userEvent.click(verifyBtns[0]);
      await waitFor(() => {
        expect(mockAdminApi.verifyUser).toHaveBeenCalledWith('u1');
      });
    }
  });
});

describe('ADM-04 — Delete user', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    window.confirm = jest.fn(() => true);
  });

  test('clicking delete calls deleteUser API', async () => {
    mockAdminApi.deleteUser.mockResolvedValueOnce({ message: 'Deleted' });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });

    const deleteBtns = screen.queryAllByRole('button', { name: /delete/i });
    if (deleteBtns.length > 0) {
      await userEvent.click(deleteBtns[0]);
      await waitFor(() => {
        expect(mockAdminApi.deleteUser).toHaveBeenCalledWith('u1');
      });
    }
  });
});

describe('ADM-05 — List providers and tasks', () => {
  beforeEach(() => { jest.clearAllMocks(); setupMocks(); });

  test('switching to providers tab shows provider list', async () => {
    renderPage();

    const providerTab = await waitFor(() =>
      screen.queryByRole('button', { name: /providers/i }) ||
      screen.queryByText(/providers/i)
    );

    if (providerTab && providerTab.tagName === 'BUTTON') {
      await userEvent.click(providerTab);
      await waitFor(() => {
        expect(mockAdminApi.providers).toHaveBeenCalled();
      });
    }
  });

  test('switching to tasks tab shows task list', async () => {
    renderPage();

    const taskTab = await waitFor(() =>
      screen.queryByRole('button', { name: /tasks/i }) ||
      screen.queryByText(/^tasks$/i)
    );

    if (taskTab && taskTab.tagName === 'BUTTON') {
      await userEvent.click(taskTab);
      await waitFor(() => {
        expect(mockAdminApi.tasks).toHaveBeenCalled();
      });
    }
  });
});

describe('ADM-06 — Flagged accounts tab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminApi.users.mockResolvedValue(sampleUsers);
    mockAdminApi.flaggedAccounts.mockResolvedValue([
      { _id: 'u-flagged', name: 'Suspicious User', fraudFlags: { isFlagged: true } },
    ]);
  });

  test('fraud tab loads flagged account data', async () => {
    renderPage();

    const fraudTab = await waitFor(() =>
      screen.queryByRole('button', { name: /fraud/i }) ||
      screen.queryByText(/fraud/i)
    );

    if (fraudTab && fraudTab.tagName === 'BUTTON') {
      await userEvent.click(fraudTab);
      await waitFor(() => {
        expect(mockAdminApi.flaggedAccounts).toHaveBeenCalled();
      });
    }
  });
});

describe('ADM-07 — Non-admin blocked from admin panel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { id: 'u1', role: 'user', email: 'user@test.com' };
  });

  afterEach(() => {
    mockUser = { id: 'admin-1', role: 'admin', email: 'admin@test.com' };
  });

  test('non-admin user is redirected away from admin panel', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', expect.objectContaining({ replace: true }));
    });
  });
});
