import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { API_BASE_URL } from '../config';
import { fetchChatSummaries, fetchMessagesWithUser, sendMessage } from '../api/services';
import { useChatSocket } from '../hooks/useSocket';
import SiteHeader from '../ui/SiteHeader';
import SiteFooter from '../ui/SiteFooter';

function toAbsoluteUrl(path) {
  if (!path || typeof path !== 'string') return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL.replace(/\/$/, '')}/${path.replace(/^\/+/, '')}`;
}

export default function MessagesPage() {
  const { t } = useTranslation();
  const { userId: paramUserId } = useParams();
  const { user, initializing } = useAuth();
  const navigate = useNavigate();
  const myId = user?.id || user?._id;
  const [summaries, setSummaries] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeId, setActiveId] = useState(paramUserId || null);
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (initializing) return;
    if (!user) navigate('/auth?mode=login', { replace: true });
  }, [initializing, user, navigate]);

  useEffect(() => {
    if (paramUserId) setActiveId(paramUserId);
  }, [paramUserId]);

  const loadSummaries = useCallback(async () => {
    try {
      const list = await fetchChatSummaries();
      setSummaries(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || t('messages.errors.loadConversations'));
    }
  }, [t]);

  const loadThread = useCallback(async (otherId) => {
    if (!otherId) return;
    try {
      const list = await fetchMessagesWithUser(otherId);
      setMessages(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(err.message || t('messages.errors.loadMessages'));
    }
  }, [t]);

  useEffect(() => {
    if (!myId) return undefined;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadSummaries();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [myId, loadSummaries]);

  useEffect(() => {
    if (!activeId) return;
    loadThread(activeId);
  }, [activeId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useChatSocket(myId, (payload) => {
    const senderId = String(payload?.sender?._id || payload?.sender || '');
    const receiverId = String(payload?.receiver?._id || payload?.receiver || '');
    const other =
      senderId === String(myId) ? receiverId : senderId;
    if (activeId && String(other) === String(activeId)) {
      setMessages((prev) => [
        ...prev,
        {
          sender: payload.sender,
          receiver: payload.receiver,
          text: payload.text,
          image: payload.image,
          timestamp: payload.timestamp || new Date().toISOString(),
        },
      ]);
    }
    loadSummaries();
  });

  const handleSend = async (e) => {
    e.preventDefault();
    if (!activeId || (!text.trim() && !imageFile)) return;
    setSending(true);
    setError(null);
    try {
      await sendMessage({ receiverId: activeId, text, imageFile });
      setText('');
      setImageFile(null);
      await loadThread(activeId);
      await loadSummaries();
    } catch (err) {
      setError(err.message || t('messages.errors.sendMessage'));
    } finally {
      setSending(false);
    }
  };

  const activeSummary = summaries.find((s) => String(s.userId) === String(activeId));

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-8 md:flex-row">
        <aside className="w-full rounded-2xl border border-gray-200 bg-white md:w-80">
          <div className="border-b border-gray-100 px-4 py-3">
            <h1 className="text-lg font-bold text-[#0F172A]">{t('messages.title')}</h1>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-gray-500">{t('messages.loading')}</p>
          ) : summaries.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">{t('messages.emptyConversations')}</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {summaries.map((s) => (
                <li key={String(s.userId)}>
                  <button
                    type="button"
                    onClick={() => {
                      const id = String(s.userId);
                      setActiveId(id);
                      navigate(`/messages/${id}`);
                    }}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-orange-50 ${
                      String(activeId) === String(s.userId) ? 'bg-orange-50' : ''
                    }`}
                  >
                    {s.profilePhoto ? (
                      <img src={toAbsoluteUrl(s.profilePhoto)} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F97316] text-sm font-bold text-white">
                        {(s.name || '?')[0]}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold text-[#0F172A]">{s.name}</span>
                        {s.unreadCount > 0 ? (
                          <span className="rounded-full bg-[#F97316] px-2 py-0.5 text-xs text-white">{s.unreadCount}</span>
                        ) : null}
                      </span>
                      <span className="line-clamp-1 text-xs text-gray-500">{s.lastMessage || t('messages.fallback.image')}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="flex min-h-[400px] flex-1 flex-col rounded-2xl border border-gray-200 bg-white">
          {!activeId ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-gray-500">
              {t('messages.selectPrompt')}
            </div>
          ) : (
            <>
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="font-semibold text-[#0F172A]">{activeSummary?.name || t('messages.fallback.chat')}</h2>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m, i) => {
                  const sid = String(m.sender?._id || m.sender || '');
                  const mine = sid === String(myId);
                  return (
                    <div key={m._id || i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          mine ? 'bg-[#F97316] text-white' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {m.image ? (
                          <img src={toAbsoluteUrl(m.image)} alt="" className="mb-1 max-h-40 rounded-lg" />
                        ) : null}
                        <p>{m.text}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              {error ? <p className="px-4 text-xs text-rose-600">{error}</p> : null}
              <form onSubmit={handleSend} className="border-t border-gray-100 p-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={t('messages.inputPlaceholder')}
                    className="flex-1 rounded-xl border border-gray-200 px-4 py-2 text-sm"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    className="text-xs"
                  />
                  <button
                    type="submit"
                    disabled={sending}
                    className="rounded-xl bg-[#F97316] px-6 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {t('messages.send')}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
