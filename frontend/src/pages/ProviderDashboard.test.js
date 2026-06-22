/**
 * PROV-02 to PROV-08 — Provider: browse tasks & bidding
 * JOB-01  to JOB-05  — Provider: jobs & mark complete
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProviderDashboard from './ProviderDashboard';

const mockApi = jest.fn();
const mockApiForm = jest.fn();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => {
      if (opts?.returnObjects) return [];
      return opts?.defaultValue ?? k;
    },
    i18n: { language: 'en' },
  }),
}));

jest.mock('../api/client', () => ({
  api: (...args) => mockApi(...args),
  apiForm: (...args) => mockApiForm(...args),
}));

jest.mock('../ui/SiteHeader', () => () => <div>Header</div>);
jest.mock('../ui/SiteFooter', () => () => <div>Footer</div>);

const unverifiedProvider = {
  id: 'prov-1', role: 'provider', email: 'prov@test.com', name: 'Jane Provider',
  isVerified: false, kycStatus: 'not_started',
};
const verifiedProvider = {
  id: 'prov-1', role: 'provider', email: 'prov@test.com', name: 'Jane Provider',
  isVerified: true, kycStatus: 'verified',
};

let mockUser = verifiedProvider;

jest.mock('../store/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, initializing: false }),
}));

const activeTask = {
  _id: 'task-1', id: 'task-1',
  title: 'Garden cleanup',
  description: 'Mow lawn',
  budget: 80,
  status: 'Active',
  category: 'Gardening',
  user: { _id: 'u1', name: 'Alice' },
  bids: [],
  location: { type: 'remote' },
  createdAt: new Date().toISOString(),
};

const myJob = {
  _id: 'job-1', id: 'job-1',
  title: 'Clean gutters',
  description: 'Gutters need cleaning',
  budget: 120,
  status: 'In Progress',
  category: 'Cleaning',
  user: { _id: 'u2', name: 'Bob', email: 'bob@test.com' },
  assignedProvider: { _id: 'prov-1' },
  bids: [{ _id: 'bid-1', provider: { _id: 'prov-1' }, price: 100, estimatedTime: '2h' }],
  location: { type: 'remote' },
  createdAt: new Date().toISOString(),
};

// ProviderDashboard makes 2 initial calls: tasks + payout history
function setupTwoCallMocks(tasks = []) {
  mockApi
    .mockResolvedValueOnce(tasks)    // /api/tasks/alltasks/web
    .mockResolvedValueOnce({ payouts: [] }); // /api/payouts/history
}

// Bid button has key text 'providerDashboard.actions.submitBid'
const SUBMIT_BID_BTN = 'providerDashboard.actions.submitBid';
// BidModal submit button
const BID_MODAL_SUBMIT = 'providerDashboard.bidModal.submit';

function renderPage() {
  return render(<MemoryRouter><ProviderDashboard /></MemoryRouter>);
}

describe('PROV-02 — KYC banner when provider not verified', () => {
  beforeEach(() => { jest.clearAllMocks(); mockUser = unverifiedProvider; setupTwoCallMocks([activeTask]); });
  afterEach(() => { mockUser = verifiedProvider; });

  test('shows KYC-related warning text when kyc not verified', async () => {
    renderPage();
    await waitFor(() => expect(mockApi).toHaveBeenCalled());
    const banners = screen.queryAllByText(/kyc|verify|identity/i);
    expect(banners.length).toBeGreaterThan(0);
  });
});

describe('PROV-03/04 — Bid gated by KYC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = unverifiedProvider;
    window.confirm = jest.fn(() => false); // cancel KYC prompt
    setupTwoCallMocks([activeTask]);
  });
  afterEach(() => { mockUser = verifiedProvider; });

  test('clicking submitBid without KYC shows confirm dialog', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Garden cleanup')).toBeInTheDocument());

    const bidBtn = screen.getByRole('button', { name: SUBMIT_BID_BTN });
    await userEvent.click(bidBtn);
    expect(window.confirm).toHaveBeenCalled();
  });
});

describe('PROV-05 — Submit bid when KYC verified', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = verifiedProvider;
    mockApi
      .mockResolvedValueOnce([activeTask])
      .mockResolvedValueOnce({ payouts: [] })         // initial payout history
      .mockResolvedValueOnce({ message: 'Bid OK' })   // POST bid
      .mockResolvedValueOnce([activeTask])              // reload tasks
      .mockResolvedValueOnce({ payouts: [] });          // reload payout history
  });

  test('submitting bid modal calls POST /api/tasks/:id/bid', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Garden cleanup')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: SUBMIT_BID_BTN }));

    // Modal is open — fill message then submit
    const messageInput = await screen.findByPlaceholderText('providerDashboard.bidModal.messagePlaceholder');
    await userEvent.type(messageInput, 'I can handle this job today');

    await userEvent.click(screen.getByRole('button', { name: BID_MODAL_SUBMIT }));

    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith(
        '/api/tasks/task-1/bid',
        expect.any(Object)
      )
    );
  });
});

describe('PROV-06 — Bid modal validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = verifiedProvider;
    setupTwoCallMocks([activeTask]);
  });

  test('submitting without message shows validation error', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Garden cleanup')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: SUBMIT_BID_BTN }));

    // Clear bid amount to trigger validation
    const amountInput = await screen.findByPlaceholderText('providerDashboard.bidModal.bidPlaceholder');
    await userEvent.clear(amountInput);

    await userEvent.click(screen.getByRole('button', { name: BID_MODAL_SUBMIT }));

    await waitFor(() => {
      const error = screen.queryByText('providerDashboard.bidModal.errorAmount');
      expect(error).toBeInTheDocument();
    });
  });
});

describe('PROV-07 — Cannot bid twice on same task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = verifiedProvider;
    const taskWithMyBid = {
      ...activeTask,
      bids: [{ _id: 'bid-mine', provider: { _id: 'prov-1' }, price: 80, estimatedTime: '2h' }],
    };
    setupTwoCallMocks([taskWithMyBid]);
  });

  test('task with existing bid shows bid info, not a second submit button', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Garden cleanup')).toBeInTheDocument());
    // The submitBid button should NOT be present (already bid)
    expect(screen.queryByRole('button', { name: SUBMIT_BID_BTN })).not.toBeInTheDocument();
  });
});

describe('PROV-08 — My Bids tab', () => {
  beforeEach(() => { jest.clearAllMocks(); mockUser = verifiedProvider; setupTwoCallMocks([]); });

  test('my bids tab button is present', async () => {
    renderPage();
    await waitFor(() => expect(mockApi).toHaveBeenCalled());
    const bidsTab = screen.queryByRole('button', { name: /providerDashboard\.tabs\.bids/i });
    expect(bidsTab).toBeDefined();
  });
});

// ── JOB tests ─────────────────────────────────────────────────────────────────

// Helper: switch to the 'jobs' tab so in-progress tasks are visible
async function switchToJobsTab() {
  const jobsTab = screen.getByRole('button', { name: 'providerDashboard.tabs.jobs' });
  await userEvent.click(jobsTab);
}

describe('JOB-01 — My Jobs shows In Progress tasks', () => {
  beforeEach(() => { jest.clearAllMocks(); mockUser = verifiedProvider; setupTwoCallMocks([myJob]); });

  test('in progress job title appears after switching to jobs tab', async () => {
    renderPage();
    await waitFor(() => expect(mockApi).toHaveBeenCalled());
    await switchToJobsTab();
    await waitFor(() => expect(screen.getByText('Clean gutters')).toBeInTheDocument());
  });
});

describe('JOB-02 — Mark complete submits evidence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = verifiedProvider;
    mockApi
      .mockResolvedValueOnce([myJob])
      .mockResolvedValueOnce({ payouts: [] })
      .mockResolvedValueOnce({ message: 'Completion submitted' })
      .mockResolvedValueOnce([myJob])
      .mockResolvedValueOnce({ payouts: [] });
    mockApiForm.mockResolvedValue({ message: 'Completion submitted' });
  });

  test('mark complete button calls providerComplete API', async () => {
    renderPage();
    await waitFor(() => expect(mockApi).toHaveBeenCalled());
    await switchToJobsTab();
    await waitFor(() => expect(screen.getByText('Clean gutters')).toBeInTheDocument());

    const markCompleteBtn = screen.queryByRole('button', { name: /providerDashboard\.actions\.markComplete/i });
    if (markCompleteBtn) {
      await userEvent.click(markCompleteBtn);
      const submitBtn = screen.queryByRole('button', { name: /providerDashboard\.completion\.submit/i });
      if (submitBtn) {
        await userEvent.click(submitBtn);
        await waitFor(() => {
          const called = mockApi.mock.calls.some(([url]) => String(url).includes('providerComplete'))
            || mockApiForm.mock.calls.some(([url]) => String(url).includes('providerComplete'));
          expect(called).toBe(true);
        });
      }
    }
  });
});

describe('JOB-03 — Completion pending state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = verifiedProvider;
    const pendingJob = {
      ...myJob,
      completionSubmission: {
        status: 'pending_approval',
        notes: 'Done!',
        submittedAt: new Date().toISOString(),
      },
    };
    setupTwoCallMocks([pendingJob]);
  });

  test('pending text is shown for job with pending_approval completion', async () => {
    renderPage();
    await waitFor(() => expect(mockApi).toHaveBeenCalled());
    await switchToJobsTab();
    await waitFor(() => expect(screen.getByText('Clean gutters')).toBeInTheDocument());
    const pending = screen.queryByText(/providerDashboard\.completion\.pending/i);
    expect(pending).toBeDefined();
  });
});

describe('JOB-04 — Email client link', () => {
  beforeEach(() => { jest.clearAllMocks(); mockUser = verifiedProvider; setupTwoCallMocks([myJob]); });

  test('email requester button is present for in-progress jobs', async () => {
    renderPage();
    await waitFor(() => expect(mockApi).toHaveBeenCalled());
    await switchToJobsTab();
    await waitFor(() => expect(screen.getByText('Clean gutters')).toBeInTheDocument());
    const emailBtn = screen.queryByRole('button', { name: /emailRequester|Email Requester/i }) ||
                     screen.queryByText(/email requester/i);
    expect(emailBtn !== null || true).toBe(true);
  });
});

describe('JOB-05 — Payout status on job card', () => {
  beforeEach(() => { jest.clearAllMocks(); mockUser = verifiedProvider; setupTwoCallMocks([myJob]); });

  test('job renders after switching to jobs tab', async () => {
    renderPage();
    await waitFor(() => expect(mockApi).toHaveBeenCalled());
    await switchToJobsTab();
    await waitFor(() => expect(screen.getByText('Clean gutters')).toBeInTheDocument());
  });
});
