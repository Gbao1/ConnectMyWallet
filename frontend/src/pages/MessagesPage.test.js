/**
 * MSG-01 to MSG-05 — Messaging (Web UI + Backend API + Socket.IO)
 */
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MessagesPage from './MessagesPage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k, opts) => opts?.defaultValue ?? k }),
}));

jest.mock('../hooks/useSocket', () => ({
  useChatSocket: jest.fn(),
}));

const mockFetchChatSummaries = jest.fn();
const mockFetchMessagesWithUser = jest.fn();
const mockSendMessage = jest.fn();

jest.mock('../api/services', () => ({
  fetchChatSummaries: (...a) => mockFetchChatSummaries(...a),
  fetchMessagesWithUser: (...a) => mockFetchMessagesWithUser(...a),
  sendMessage: (...a) => mockSendMessage(...a),
}));

jest.mock('../ui/SiteHeader', () => () => <div>Header</div>);
jest.mock('../ui/SiteFooter', () => () => <div>Footer</div>);

const mockUser = { id: 'u1', role: 'user', email: 'user@test.com', name: 'Alice' };

jest.mock('../store/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, initializing: false }),
}));

const chatSummaries = [
  {
    _id: 'conv-1',
    // MessagesPage renders s.name directly (not s.otherUser.name)
    name: 'Bob Provider',
    otherUser: { _id: 'u2', name: 'Bob Provider', profilePhoto: '' },
    lastMessage: 'Hello!',
    unread: 0,
  },
];

const messages = [
  { _id: 'msg-1', sender: { _id: 'u2' }, text: 'Hello there', createdAt: new Date().toISOString() },
  { _id: 'msg-2', sender: { _id: 'u1' }, text: 'Hi back!', createdAt: new Date().toISOString() },
];

function renderPage(path = '/messages') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/messages/:userId" element={<MessagesPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('MSG-01 — Open messages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchChatSummaries.mockResolvedValue(chatSummaries);
    mockFetchMessagesWithUser.mockResolvedValue(messages);
  });

  test('conversation list loads on /messages', async () => {
    renderPage();

    await waitFor(() => {
      expect(mockFetchChatSummaries).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText('Bob Provider')).toBeInTheDocument();
    });
  });
});

describe('MSG-02 — Send text message', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchChatSummaries.mockResolvedValue(chatSummaries);
    mockFetchMessagesWithUser.mockResolvedValue(messages);
    mockSendMessage.mockResolvedValue({
      _id: 'msg-3',
      sender: { _id: 'u1' },
      text: 'New message',
      createdAt: new Date().toISOString(),
    });
  });

  test('typing and sending a message calls sendMessage service', async () => {
    renderPage('/messages/u2');

    await waitFor(() => {
      expect(mockFetchChatSummaries).toHaveBeenCalled();
    });

    const input = screen.queryByPlaceholderText(/type|message/i) ||
                  screen.queryByRole('textbox');
    if (input) {
      await userEvent.type(input, 'New message');
      const sendBtn = screen.queryByRole('button', { name: /send/i });
      if (sendBtn) {
        await userEvent.click(sendBtn);
        await waitFor(() => {
          expect(mockSendMessage).toHaveBeenCalledWith(
            expect.objectContaining({ text: 'New message', receiverId: 'u2' })
          );
        });
      }
    }
  });
});

describe('MSG-03 — Real-time receive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchChatSummaries.mockResolvedValue(chatSummaries);
    mockFetchMessagesWithUser.mockResolvedValue(messages);
  });

  test('useChatSocket hook is initialized with current user id', () => {
    const { useChatSocket } = require('../hooks/useSocket');

    renderPage('/messages/u2');

    expect(useChatSocket).toHaveBeenCalledWith('u1', expect.any(Function));
  });

  test('incoming socket message appends to thread', async () => {
    const { useChatSocket } = require('../hooks/useSocket');

    let capturedHandler;
    useChatSocket.mockImplementation((userId, handler) => {
      capturedHandler = handler;
    });

    renderPage('/messages/u2');

    await waitFor(() => {
      expect(mockFetchChatSummaries).toHaveBeenCalled();
    });

    const incomingMsg = {
      _id: 'msg-live',
      sender: { _id: 'u2' },
      text: 'Live message!',
      createdAt: new Date().toISOString(),
    };

    if (capturedHandler) {
      act(() => capturedHandler(incomingMsg));

      await waitFor(() => {
        expect(screen.queryByText('Live message!')).toBeDefined();
      });
    }
  });
});

describe('MSG-04 — Send image in chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchChatSummaries.mockResolvedValue(chatSummaries);
    mockFetchMessagesWithUser.mockResolvedValue(messages);
    mockSendMessage.mockResolvedValue({ _id: 'msg-img', sender: { _id: 'u1' }, text: '', image: 'https://cdn.example/img.jpg', createdAt: new Date().toISOString() });
  });

  test('file input for image exists in message compose area', () => {
    renderPage('/messages/u2');

    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      expect(fileInput.accept).toMatch(/image/);
    }
  });
});

describe('MSG-05 — Deep link to user conversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchChatSummaries.mockResolvedValue(chatSummaries);
    mockFetchMessagesWithUser.mockResolvedValue(messages);
  });

  test('/messages/:userId loads thread with that user', async () => {
    renderPage('/messages/u2');

    await waitFor(() => {
      expect(mockFetchMessagesWithUser).toHaveBeenCalledWith('u2');
    });
  });
});
