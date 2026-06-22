/**
 * CUST-01 to CUST-07 — Customer: dashboard & bid management
 * REV-01  to REV-05  — Customer: complete task & review
 * PAY-01             — Initiate payment after accepting bid
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import UserDashboard from './UserDashboard';

const mockApi = jest.fn();
const mockNavigate = jest.fn();
const mockInitiateTaskPayment = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => opts?.defaultValue ?? k,
    i18n: { language: 'en' },
  }),
}));

jest.mock('../api/client', () => ({
  api: (...args) => mockApi(...args),
}));

// initiateTaskPayment lives in services, not api/client
jest.mock('../api/services', () => ({
  initiateTaskPayment: (...args) => mockInitiateTaskPayment(...args),
}));

jest.mock('../components/TaskComments', () => () => <div data-testid="task-comments">Comments</div>);
jest.mock('../ui/SiteHeader', () => () => <div>Header</div>);
jest.mock('../ui/SiteFooter', () => () => <div>Footer</div>);
jest.mock('../ui/StarRatingInput', () => ({ value, onChange, label }) => (
  <label>
    {label}
    <input
      data-testid={`star-${label}`}
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </label>
));

const mockUser = { id: 'u1', role: 'user', email: 'user@test.com', name: 'Test User' };

jest.mock('../store/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, initializing: false }),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const sampleTask = {
  _id: 'task-1',
  id: 'task-1',
  title: 'Fix leaky faucet',
  description: 'Kitchen faucet needs fixing',
  budget: 100,
  status: 'Active',
  category: 'Plumbing',
  // user owner matches mockUser.id === 'u1'
  user: { _id: 'u1' },
  bids: [
    {
      _id: 'bid-1',
      provider: { _id: 'prov-1', name: 'Jane Provider' },
      providerId: 'prov-1',
      providerName: 'Jane Provider',
      price: 90,
      comment: 'I can fix it today',
      estimatedTime: '2 hours',
    },
  ],
  location: { type: 'remote' },
  images: [],
  comments: [],
  createdAt: new Date().toISOString(),
};

// "Complete Task" button needs: In Progress + completionSubmission.status === 'pending_approval'
const completedTask = {
  ...sampleTask,
  _id: 'task-c',
  id: 'task-c',
  status: 'In Progress',
  bids: [],
  assignedProvider: { _id: 'prov-1', name: 'Jane Provider' },
  acceptedBid: { providerId: 'prov-1', providerName: 'Jane Provider', amount: 90 },
  completionSubmission: {
    status: 'pending_approval',
    notes: 'Job done',
    submittedAt: new Date().toISOString(),
  },
};

function renderPage() {
  return render(<MemoryRouter><UserDashboard /></MemoryRouter>);
}

// Helper: wait for tasks to load then expand a task to reveal BidsPanel
async function waitForTaskAndExpand() {
  await waitFor(() => expect(screen.getByText('Fix leaky faucet')).toBeInTheDocument());
  // Expand button shows bid count, e.g. "🤝 1 Bid" – click to reveal BidsPanel
  const expandBtn = screen.getByRole('button', { name: /1 bid/i });
  await userEvent.click(expandBtn);
}

// ── CUST tests ────────────────────────────────────────────────────────────────

describe('CUST-01 — Dashboard loads tasks owned by user', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('fetches tasks and displays them', async () => {
    mockApi.mockResolvedValueOnce([sampleTask]);
    renderPage();
    // api('/api/tasks') is called without a second argument
    await waitFor(() => expect(mockApi).toHaveBeenCalledWith('/api/tasks'));
    await waitFor(() => expect(screen.getByText('Fix leaky faucet')).toBeInTheDocument());
  });

  test('shows no tasks when API returns empty list', async () => {
    mockApi.mockResolvedValueOnce([]);
    renderPage();
    await waitFor(() => expect(mockApi).toHaveBeenCalled());
    expect(screen.queryByText('Fix leaky faucet')).not.toBeInTheDocument();
  });
});

describe('CUST-02 — View bids on a task', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('expanding a task reveals the bid list with provider name', async () => {
    mockApi.mockResolvedValueOnce([sampleTask]);
    renderPage();
    await waitForTaskAndExpand();
    // BidsPanel is now visible
    expect(screen.getByText('Jane Provider')).toBeInTheDocument();
  });
});

describe('CUST-03 — Accept bid triggers payment flow', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('clicking Accept Bid calls acceptBid then initiateTaskPayment', async () => {
    mockApi
      .mockResolvedValueOnce([sampleTask])           // initial load
      .mockResolvedValueOnce({});                    // acceptBid PUT
    mockInitiateTaskPayment.mockResolvedValueOnce({
      paymentUrl: 'https://pay.example',
      transactionId: 'txn-1',
    });
    delete window.location;
    window.location = { assign: jest.fn() };

    renderPage();
    await waitForTaskAndExpand();

    const acceptBtn = screen.getByRole('button', { name: /accept bid/i });
    await userEvent.click(acceptBtn);

    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith(
        '/api/tasks/task-1/acceptBid/bid-1',
        expect.objectContaining({ method: 'PUT' })
      )
    );
    await waitFor(() => expect(mockInitiateTaskPayment).toHaveBeenCalled());
  });
});

describe('CUST-04 — API rejects accept bid for non-owner (403)', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('403 from acceptBid API does not crash the page', async () => {
    // Task is owned by u1 (the logged-in user), but we mock the API to return 403
    mockApi
      .mockResolvedValueOnce([sampleTask])
      .mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { status: 403 }));
    mockInitiateTaskPayment.mockResolvedValue({ paymentUrl: '', transactionId: '' });

    renderPage();
    await waitForTaskAndExpand();

    const acceptBtn = screen.getByRole('button', { name: /accept bid/i });
    await userEvent.click(acceptBtn);

    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith(
        expect.stringMatching(/acceptBid/),
        expect.any(Object)
      )
    );
    // Page should still render (not crash)
    expect(screen.getByText('Fix leaky faucet')).toBeInTheDocument();
  });
});

describe('CUST-05 — Task comments', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('TaskComments is rendered after expanding a task', async () => {
    mockApi.mockResolvedValueOnce([sampleTask]);
    renderPage();
    await waitForTaskAndExpand();
    expect(screen.getByTestId('task-comments')).toBeInTheDocument();
  });
});

describe('CUST-06 — Search / filter tasks', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('search input filters tasks by title', async () => {
    const task2 = { ...sampleTask, _id: 'task-2', id: 'task-2', title: 'Electrical work', bids: [] };
    mockApi.mockResolvedValueOnce([sampleTask, task2]);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Fix leaky faucet')).toBeInTheDocument();
      expect(screen.getByText('Electrical work')).toBeInTheDocument();
    });

    // placeholder is "Search tasks…" (Unicode ellipsis character)
    await userEvent.type(screen.getByPlaceholderText('Search tasks…'), 'Electric');

    await waitFor(() => expect(screen.queryByText('Fix leaky faucet')).not.toBeInTheDocument());
    expect(screen.getByText('Electrical work')).toBeInTheDocument();
  });
});

describe('CUST-07 — Delete task', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.confirm = jest.fn(() => true);
  });

  test('delete calls window.confirm then DELETE API and removes task', async () => {
    mockApi
      .mockResolvedValueOnce([sampleTask])
      .mockResolvedValueOnce({ message: 'Deleted' });

    renderPage();
    await waitFor(() => expect(screen.getByText('Fix leaky faucet')).toBeInTheDocument());

    // "Delete Task" button only shows when !hasAssignedProvider (Active task, no assignedProvider)
    const deleteBtn = screen.getByRole('button', { name: /delete task/i });
    await userEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith(
        '/api/tasks/task-1',
        expect.objectContaining({ method: 'DELETE' })
      )
    );
  });
});

// ── REV tests ─────────────────────────────────────────────────────────────────

describe('REV-01 — Complete task modal opens', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('Complete Task button appears when completion is pending_approval', async () => {
    mockApi.mockResolvedValueOnce([completedTask]);
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /complete task/i })).toBeInTheDocument());
  });
});

describe('REV-02 — Submit review happy path', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('opening modal and submitting calls completeTask API', async () => {
    mockApi
      .mockResolvedValueOnce([completedTask])
      .mockResolvedValueOnce({ message: 'OK', task: { ...completedTask, status: 'Completed' } });

    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /complete task/i })).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: /complete task/i }));

    const submitBtn = await screen.findByRole('button', { name: /submit review/i });
    await userEvent.click(submitBtn);

    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith(
        '/api/tasks/task-c/completeTask',
        expect.objectContaining({ method: 'PUT' })
      )
    );
  });
});

describe('REV-03 — Duplicate review blocked', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('completed task shows Reviewed badge and no Complete Task button', async () => {
    const alreadyDone = {
      ...sampleTask,
      status: 'Completed',
      review: { rating: 5 },
      assignedProvider: { _id: 'prov-1' },
    };
    mockApi.mockResolvedValueOnce([alreadyDone]);
    renderPage();

    await waitFor(() => expect(screen.getByText('Fix leaky faucet')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /complete task/i })).not.toBeInTheDocument();
    expect(screen.getByText('Reviewed')).toBeInTheDocument();
  });
});

describe('REV-04 — Payout scheduled after task completion', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('completeTask endpoint is called after review submission', async () => {
    mockApi
      .mockResolvedValueOnce([completedTask])
      .mockResolvedValueOnce({ message: 'OK', task: { ...completedTask, status: 'Completed' } });

    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /complete task/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /complete task/i }));

    const submitBtn = await screen.findByRole('button', { name: /submit review/i });
    await userEvent.click(submitBtn);

    await waitFor(() =>
      expect(mockApi).toHaveBeenCalledWith('/api/tasks/task-c/completeTask', expect.any(Object))
    );
  });
});

describe('REV-05 — Sub-rating validation', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('review modal has four star rating inputs (Communication, Punctuality, Quality, Professionalism)', async () => {
    mockApi.mockResolvedValueOnce([completedTask]);
    renderPage();
    await waitFor(() => expect(screen.getByRole('button', { name: /complete task/i })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /complete task/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /submit review/i })).toBeInTheDocument());

    expect(screen.getByTestId('star-Communication')).toBeInTheDocument();
    expect(screen.getByTestId('star-Punctuality')).toBeInTheDocument();
    expect(screen.getByTestId('star-Quality')).toBeInTheDocument();
    expect(screen.getByTestId('star-Professionalism')).toBeInTheDocument();
  });
});
