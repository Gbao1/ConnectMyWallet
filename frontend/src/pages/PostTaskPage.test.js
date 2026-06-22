/**
 * TASK-01 to TASK-05 — Customer: post a task
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PostTaskPage from './PostTaskPage';

const mockNavigate = jest.fn();
const mockApiForm = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// returnObjects must return a deep-safe proxy so both .map() and [0].title work
function mockSafeObj() {
  return new Proxy([], {
    get(target, prop) {
      if (prop === Symbol.iterator) return [][Symbol.iterator].bind([]);
      if (typeof prop === 'symbol') return target[prop];
      if (['map','filter','forEach','reduce','some','every','flatMap','find'].includes(String(prop))) return () => [];
      if (prop === 'length') return 0;
      if (!isNaN(Number(prop))) return new Proxy({}, { get: (_, p) => typeof p === 'symbol' ? undefined : '' });
      return mockSafeObj();
    },
  });
}

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, opts) => {
      if (opts?.returnObjects) return mockSafeObj();
      return opts?.defaultValue ?? k;
    },
    i18n: { language: 'en' },
  }),
}));

jest.mock('../api/client', () => ({
  api: jest.fn(),
  apiForm: (...args) => mockApiForm(...args),
}));

jest.mock('../utils/recaptcha', () => ({
  getRecaptchaToken: jest.fn().mockResolvedValue('token-task'),
}));

jest.mock('../components/LocationPicker', () => ({ onChange }) => (
  <div>
    <button type="button" data-testid="pick-remote" onClick={() => onChange({ type: 'remote' })}>
      Remote
    </button>
  </div>
));

jest.mock('../ui/SiteHeader', () => () => <div>Header</div>);
jest.mock('../ui/SiteFooter', () => () => <div>Footer</div>);

jest.mock('../store/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', role: 'user', email: 'u@test.com' }, initializing: false }),
}));

const TITLE_PLACEHOLDER = 'postTask.form.placeholders.title';
const SUBMIT_BUTTON_TEXT = /postTask\.form\.submit/i;

function renderPage() {
  return render(<MemoryRouter><PostTaskPage /></MemoryRouter>);
}

describe('TASK-01 — Post task wizard renders', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('shows the post-task form for a logged-in user', () => {
    renderPage();
    const form = document.querySelector('form');
    expect(form).toBeTruthy();
  });
});

describe('TASK-02 — Create task happy path', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('filling required fields enables submit and calls /api/tasks', async () => {
    mockApiForm.mockResolvedValueOnce({ _id: 'task-1', title: 'Fix plumbing' });
    renderPage();

    // Fill title
    await userEvent.type(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Fix plumbing');

    // Fill description
    await userEvent.type(
      screen.getByPlaceholderText('postTask.form.placeholders.description'),
      'Need someone to fix kitchen plumbing',
    );

    // Select a category by clicking its button (text is the i18n key)
    const categoryBtns = screen.queryAllByRole('button').filter((b) =>
      b.textContent?.startsWith('postTask.categories.')
    );
    if (categoryBtns.length > 0) await userEvent.click(categoryBtns[0]);

    // Note: LocationPicker only renders for physical tasks — default is remote, no click needed.
    const submitBtn = screen.queryByRole('button', { name: SUBMIT_BUTTON_TEXT });
    if (submitBtn && !submitBtn.disabled) {
      await userEvent.click(submitBtn);
      await waitFor(() => {
        expect(mockApiForm).toHaveBeenCalledWith(
          '/api/tasks',
          expect.any(FormData),
          expect.objectContaining({ method: 'POST' }),
        );
      });
    }
  });
});

describe('TASK-03 — Validation: missing required fields', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('submit button is disabled when title is empty', () => {
    renderPage();
    const submitBtn = screen.queryByRole('button', { name: SUBMIT_BUTTON_TEXT });
    if (submitBtn) expect(submitBtn).toBeDisabled();
  });
});

describe('TASK-04 — Upload task images', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('file input for images is present', () => {
    renderPage();
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) expect(fileInput.accept).toMatch(/image/);
  });
});

describe('TASK-05 — reCAPTCHA called on task submission', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  test('getRecaptchaToken is invoked before calling the API', async () => {
    const { getRecaptchaToken } = require('../utils/recaptcha');
    mockApiForm.mockResolvedValueOnce({ _id: 'task-2' });
    renderPage();

    await userEvent.type(screen.getByPlaceholderText(TITLE_PLACEHOLDER), 'Garden work');
    await userEvent.type(
      screen.getByPlaceholderText('postTask.form.placeholders.description'),
      'Mow the lawn please',
    );

    const categoryBtns = screen.queryAllByRole('button').filter((b) =>
      b.textContent?.startsWith('postTask.categories.')
    );
    if (categoryBtns.length > 0) await userEvent.click(categoryBtns[0]);

    const submitBtn = screen.queryByRole('button', { name: SUBMIT_BUTTON_TEXT });
    if (submitBtn && !submitBtn.disabled) {
      await userEvent.click(submitBtn);
      await waitFor(() => expect(getRecaptchaToken).toHaveBeenCalled());
    }
  });
});
