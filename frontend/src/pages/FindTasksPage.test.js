/**
 * PROV-01 — Find tasks page renders available tasks for providers
 */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FindTasksPage from './FindTasksPage';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => {
      if (opts?.returnObjects) return [];
      return opts?.defaultValue ?? k;
    },
    i18n: { language: 'en' },
  }),
}));

jest.mock('../ui/SiteHeader', () => () => <div>Header</div>);
jest.mock('../ui/SiteFooter', () => () => <div>Footer</div>);

jest.mock('../api/services', () => ({
  fetchActivePostedTasks: jest.fn(),
  fetchBrowseProviders: jest.fn(),
}));

jest.mock('../utils/currency', () => ({
  formatCurrency: jest.fn((v) => `$${v}`),
  getLocaleForLanguage: jest.fn(() => 'en-AU'),
}));

const { fetchActivePostedTasks, fetchBrowseProviders } = require('../api/services');

function renderPage() {
  return render(
    <MemoryRouter>
      <FindTasksPage />
    </MemoryRouter>
  );
}

const sampleTasks = [
  {
    _id: 'task-1',
    title: 'Fix garden',
    description: 'Need someone to mow lawn',
    budget: 80,
    status: 'Active',
    category: 'Gardening',
    location: { type: 'physical', address: '1 Main St' },
    user: { _id: 'u1', name: 'Alice' },
    bids: [],
    createdAt: new Date().toISOString(),
  },
];

describe('PROV-01 — Find tasks page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchActivePostedTasks.mockResolvedValue({ tasks: sampleTasks });
    fetchBrowseProviders.mockResolvedValue([]);
  });

  test('renders header and footer', () => {
    renderPage();
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  test('fetches and displays active tasks', async () => {
    renderPage();

    await waitFor(() => {
      expect(fetchActivePostedTasks).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Fix garden')).toBeInTheDocument();
    });
  });

  test('shows empty state when no tasks available', async () => {
    fetchActivePostedTasks.mockResolvedValueOnce({ tasks: [] });
    renderPage();

    await waitFor(() => {
      expect(fetchActivePostedTasks).toHaveBeenCalled();
    });

    expect(screen.queryByText('Fix garden')).not.toBeInTheDocument();
  });

  test('category filter buttons are rendered', () => {
    renderPage();
    expect(screen.getByText(/All/i)).toBeInTheDocument();
  });
});
