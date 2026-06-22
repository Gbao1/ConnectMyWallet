import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { api, apiForm } from '../api/client';
import SiteHeader from '../ui/SiteHeader';
import SiteFooter from '../ui/SiteFooter';
import { formatCurrencyWithCode } from '../utils/currency';
import { getDisplayName } from '../utils/displayName';

const STATUS_COLORS = {
  Active: 'bg-orange-50 text-[#F97316] border border-orange-200',
  'In Progress': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  Completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Cancelled: 'bg-rose-50 text-rose-700 border border-rose-200',
};

const formatMoney = (value, lang, baseCurrency = 'USD') => {
  if (value == null) return '—';
  return formatCurrencyWithCode(value, lang, baseCurrency, { maximumFractionDigits: 2 });
};

const formatTimeAgo = (val, t) => {
  if (!val) return '';
  const date = val.toDate ? val.toDate() : new Date(val);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return t('timeAgo.justNow');
  if (diff < 3600) return t('timeAgo.minutes', { count: Math.floor(diff / 60) });
  if (diff < 86400) return t('timeAgo.hours', { count: Math.floor(diff / 3600) });
  return t('timeAgo.days', { count: Math.floor(diff / 86400) });
};

const CATEGORY_FILTER = ['All', 'Home Repairs', 'Cleaning', 'Moving', 'Electrical', 'Plumbing', 'Painting', 'Gardening', 'Delivery', 'Tech Support', 'Tutoring'];

const getBidProviderId = (bid) =>
  bid?.providerId ||
  bid?.provider?._id ||
  bid?.provider?.id ||
  bid?.provider;

const getBidAmount = (bid) => {
  const raw = bid?.amount ?? bid?.price ?? bid?.bidAmount ?? null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
};

const currencyFromCountry = (country) => {
  const c = String(country || '').trim().toLowerCase();
  if (c === 'bangladesh') return 'BDT';
  if (c === 'india') return 'INR';
  if (c === 'pakistan') return 'PKR';
  return 'USD';
};

function BidModal({ task, user, onClose, onSubmit }) {
  const { i18n, t } = useTranslation();
  const taskCurrency = task.currency || 'USD';
  const roundToTwo = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  const initialBid = task.budget ? String(roundToTwo(task.budget)) : '';
  const [bidAmount, setBidAmount] = useState(initialBid);
  const [message, setMessage] = useState('');
  const [timeline, setTimeline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!bidAmount || Number(bidAmount) <= 0) { setError(t('providerDashboard.bidModal.errorAmount')); return; }
    if (!message.trim()) { setError(t('providerDashboard.bidModal.errorMessage')); return; }
    setSubmitting(true);
    setError(null);
    try {
      const bidAmountInTaskCurrency = roundToTwo(Number(bidAmount));
      const bid = {
        providerId: user.id,
        providerName: user.displayName || `${user.firstName} ${user.lastName}`.trim(),
        providerEmail: user.email,
        amount: bidAmountInTaskCurrency,
        message: message.trim(),
        timeline: timeline.trim() || null,
        createdAt: new Date().toISOString(),
      };
      await api(`/api/tasks/${task.id}/bid`, {
        method: 'POST',
        body: JSON.stringify({
          price: bid.amount,
          estimatedTime: bid.timeline || 'Flexible',
          comment: bid.message,
        }),
      });
      onSubmit();
    } catch (err) {
      console.error('Failed to submit bid', err);
      setError(err.message || t('providerDashboard.bidModal.errorSubmit'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputBase = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-[#0F172A]">{t('providerDashboard.bidModal.title')}</h2>
          <p className="text-sm text-gray-500">{t('providerDashboard.bidModal.subtitle', { title: task.title })}</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5">
          {error && <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

          <div className="space-y-4">
            {/* Task summary */}
            <div className="rounded-xl bg-gray-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">{t('providerDashboard.bidModal.clientBudget')}</span>
                <span className="text-sm font-bold text-[#0F172A]">
                  {task.budget ? formatMoney(task.budget, i18n.language, taskCurrency) : t('providerDashboard.bidModal.notSpecified')}
                </span>
              </div>
              {task.dueDate && (
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">{t('providerDashboard.bidModal.dueDate')}</span>
                  <span className="text-sm text-gray-700">{task.dueDate}</span>
                </div>
              )}
            </div>

            {/* Bid amount */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('providerDashboard.bidModal.bidAmount', { currency: taskCurrency })}</label>
              <input type="number" min="1" step="0.01" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder={t('providerDashboard.bidModal.bidPlaceholder')} className={inputBase} />
              <p className="mt-1 text-xs text-gray-500">
                {t('providerDashboard.bidModal.bidNote', { currency: taskCurrency })}
              </p>
            </div>

            {/* Timeline */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('providerDashboard.bidModal.timelineLabel')}</label>
              <input value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder={t('providerDashboard.bidModal.timelinePlaceholder')} className={inputBase} />
            </div>

            {/* Message */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('providerDashboard.bidModal.messageLabel')}</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder={t('providerDashboard.bidModal.messagePlaceholder')} className={inputBase} />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-[#F97316] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#ea580c] disabled:opacity-60">
              {submitting ? t('providerDashboard.bidModal.submitting') : t('providerDashboard.bidModal.submit')}
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 transition hover:border-gray-300">
              {t('providerDashboard.bidModal.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CompleteJobModal({ task, onClose, onSubmit }) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    setImages(files.slice(0, 5));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!notes.trim() && images.length === 0) {
      setError(t('providerDashboard.completion.errorMissing', { defaultValue: 'Please add notes or at least one completion image.' }));
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('notes', notes.trim());
      images.forEach((file) => formData.append('images', file));
      await onSubmit(formData);
    } catch (err) {
      setError(err.message || t('providerDashboard.completion.errorSubmit', { defaultValue: 'Failed to submit completion proof' }));
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-[#0F172A]">{t('providerDashboard.completion.title', { defaultValue: 'Submit Job Completion' })}</h2>
          <p className="text-sm text-gray-500">{t('providerDashboard.completion.taskLabel', { defaultValue: 'Task' })}: {task.title}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error ? <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div> : null}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('providerDashboard.completion.notes', { defaultValue: 'Completion notes' })}</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('providerDashboard.completion.notesPlaceholder', { defaultValue: 'Describe what was completed, what was delivered, and any follow-up details.' })}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('providerDashboard.completion.images', { defaultValue: 'Completion images (up to 5)' })}</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
            />
            {images.length > 0 ? <p className="mt-1 text-xs text-gray-500">{t('providerDashboard.completion.imagesSelected', { count: images.length, defaultValue: `${images.length} file(s) selected` })}</p> : null}
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60">
              {submitting
                ? t('common.submitting', { defaultValue: 'Submitting…' })
                : t('providerDashboard.completion.submit', { defaultValue: 'Submit for Review' })}
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 transition hover:border-gray-300">
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProviderDashboard() {
  const { i18n, t } = useTranslation();
  const { user, initializing } = useAuth();
  const navigate = useNavigate();

  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [tab, setTab] = useState('available');
  const [bidTask, setBidTask] = useState(null);
  const [completeTask, setCompleteTask] = useState(null);
  const [bidSuccess, setBidSuccess] = useState(null);
  const [completionNotice, setCompletionNotice] = useState(null);
  const [payoutStatusByTaskId, setPayoutStatusByTaskId] = useState({});

  const displayName = getDisplayName(user, t('providerDashboard.fallbackName'));
  const providerKycVerified =
    user?.isVerified === true || user?.kycStatus === 'verified';

  const handleStartBid = (task) => {
    if (!providerKycVerified) {
      const go = window.confirm(
        t('providerDashboard.kycRequired.confirm', {
          defaultValue:
            'You must complete identity (KYC) verification before bidding. Open your profile to start verification?',
        })
      );
      if (go) navigate('/provider/profile');
      return;
    }
    setBidTask(task);
  };

  useEffect(() => {
    if (initializing) return;
    if (!user) navigate('/auth?mode=login', { replace: true });
  }, [initializing, user, navigate]);

  const loadTasks = useCallback(async (opts = {}) => {
    const authUserId = user?.id || user?._id;
    if (!authUserId) return;
    const { cancelledRef } = opts;
    try {
      if (!cancelledRef?.current) setLoading(true);
      const [tasksResponse, payoutHistory] = await Promise.all([
        api('/api/tasks/alltasks/web'),
        api('/api/payouts/history?page=1&limit=200'),
      ]);
      const items = Array.isArray(tasksResponse) ? tasksResponse : tasksResponse?.tasks || [];
      const normalized = items.map((task) => ({
        ...task,
        id: task.id || task._id,
        userId: task.user?._id || task.user?.id || task.user || null,
        userName:
          task.userName ||
          task.user?.displayName ||
          task.user?.name ||
          [task.user?.firstName, task.user?.lastName].filter(Boolean).join(' ').trim() ||
          task.user?.email ||
          'User',
        userEmail: task.user?.email || '',
        currency: task.currency || currencyFromCountry(task.user?.location?.country),
      }));
      const sorted = [...normalized].sort((a, b) => {
        const ta = new Date(a.createdAt ?? 0);
        const tb = new Date(b.createdAt ?? 0);
        return tb - ta;
      });
      const payouts = Array.isArray(payoutHistory?.payouts) ? payoutHistory.payouts : [];
      const nextPayoutMap = {};
      payouts.forEach((p) => {
        const taskId = p?.task?._id || p?.task?.id;
        if (taskId) nextPayoutMap[String(taskId)] = p.status;
      });
      if (!cancelledRef?.current) {
        setAllTasks(sorted);
        setPayoutStatusByTaskId(nextPayoutMap);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      if (!cancelledRef?.current) setLoading(false);
    }
  }, [user?.id, user?._id]);

  useEffect(() => {
    const authUserId = user?.id || user?._id;
    if (!authUserId) return undefined;
    const cancelledRef = { current: false };
    const load = async () => {
      try {
        await loadTasks({ cancelledRef });
      } catch (err) {
        console.error('Failed to load tasks:', err);
      }
    };
    load();
    const id = setInterval(load, 15000);
    return () => {
      cancelledRef.current = true;
      clearInterval(id);
    };
  }, [loadTasks, user?.id, user?._id]);


  const availableTasks = useMemo(() => allTasks.filter((t) => t.status === 'Active'), [allTasks]);
  const myBids = useMemo(
    () =>
      allTasks.filter(
        (t) =>
          t.status === 'Active' &&
          (t.bids || []).some(
            (b) => String(getBidProviderId(b)) === String(user?.id || user?._id)
          )
      ),
    [allTasks, user?.id, user?._id]
  );
  const myJobs = useMemo(
    () =>
      allTasks.filter(
        (t) =>
          (t.status === 'In Progress' || t.status === 'Completed') &&
          String(t.assignedProvider?._id || t.assignedProvider || t.acceptedBid?.providerId) ===
            String(user?.id || user?._id)
      ),
    [allTasks, user?.id, user?._id]
  );

  const handleSubmitCompletion = async (taskId, formData) => {
    try {
      await apiForm(`/api/tasks/${taskId}/providerComplete`, formData, {
        method: 'PATCH',
      });
      await loadTasks();
      setCompletionNotice(t('providerDashboard.completion.notice', { defaultValue: 'Completion submitted for review.' }));
      setCompleteTask(null);
    } catch (err) {
      console.error('Failed to submit completion:', err);
      throw err;
    }
  };

  const getMyBid = (task) =>
    (task.bids || []).find(
      (b) => String(getBidProviderId(b)) === String(user?.id || user?._id)
    );

  const filtered = useMemo(() => {
    let list = tab === 'available' ? [...availableTasks] : tab === 'bids' ? [...myBids] : [...myJobs];
    if (categoryFilter !== 'All') list = list.filter((t) => t.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q) || t.userName?.toLowerCase().includes(q));
    }
    return list;
  }, [availableTasks, myBids, myJobs, search, categoryFilter, tab]);

  const stats = useMemo(() => ({
    available: availableTasks.length,
    bids: myBids.length,
    jobs: myJobs.length,
    urgent: availableTasks.filter((t) => t.urgency === 'urgent').length,
  }), [availableTasks, myBids, myJobs]);


  if (initializing) return <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] text-gray-500">{t('providerDashboard.loading')}</div>;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
      <SiteHeader />

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0F172A]">{t('providerDashboard.title')}</h1>
          <p className="mt-1 text-gray-500">{t('providerDashboard.subtitle', { name: displayName })}</p>
        </div>

        {!providerKycVerified ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-900">
            {t('providerDashboard.kycRequired.banner', {
              defaultValue:
                'Complete KYC verification on your profile before you can bid on tasks.',
            })}{' '}
            <button
              type="button"
              onClick={() => navigate('/provider/profile')}
              className="font-semibold text-[#F97316] underline"
            >
              {t('providerDashboard.kycRequired.cta', { defaultValue: 'Verify now' })}
            </button>
          </div>
        ) : null}

        {/* Bid success toast */}
        {bidSuccess && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3">
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            <p className="text-sm font-medium text-emerald-800">{t('providerDashboard.bidToast', { title: bidSuccess })}</p>
            <button onClick={() => setBidSuccess(null)} className="ml-auto text-xs text-emerald-600 hover:underline">{t('providerDashboard.dismiss')}</button>
          </div>
        )}
        {completionNotice && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3">
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium text-emerald-800">{completionNotice}</p>
            <button onClick={() => setCompletionNotice(null)} className="ml-auto text-xs text-emerald-600 hover:underline">Dismiss</button>
          </div>
        )}

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-4">
          {[
            { label: t('providerDashboard.stats.available'), value: stats.available, accent: 'border-[#F97316]/20 bg-[#FFF7ED]' },
            { label: t('providerDashboard.stats.bids'), value: stats.bids, accent: 'border-indigo-200 bg-indigo-50' },
            { label: t('providerDashboard.stats.jobs'), value: stats.jobs, accent: 'border-emerald-200 bg-emerald-50' },
            { label: t('providerDashboard.stats.urgent'), value: stats.urgent, accent: 'border-red-200 bg-red-50' },
          ].map((card) => (
            <div key={card.label} className={`rounded-2xl border p-5 shadow-sm ${card.accent}`}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
              <p className="text-3xl font-bold text-[#0F172A]">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-gray-100 p-1 sm:w-fit">
          {[
            { key: 'available', label: t('providerDashboard.tabs.available', { count: availableTasks.length }) },
            { key: 'bids', label: t('providerDashboard.tabs.bids', { count: myBids.length }) },
            { key: 'jobs', label: t('providerDashboard.tabs.jobs', { count: myJobs.length }) },
          ].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-lg px-5 py-2.5 text-sm font-medium transition ${tab === t.key ? 'bg-white text-[#0F172A] shadow-sm' : 'text-gray-500 hover:text-[#0F172A]'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('providerDashboard.searchPlaceholder')} className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-4 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20">
            {CATEGORY_FILTER.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? t('providerDashboard.categories.all') : c}
              </option>
            ))}
          </select>
        </div>

        <p className="mb-4 text-sm text-gray-500">{t('providerDashboard.resultsCount', { count: filtered.length })}</p>

        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center text-gray-400">{t('providerDashboard.loadingTasks')}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-white p-16 text-center">
            <span className="text-4xl">{tab === 'jobs' ? '💼' : tab === 'available' ? '📭' : '🤝'}</span>
            <h3 className="text-lg font-semibold text-[#0F172A]">
              {tab === 'jobs' ? t('providerDashboard.empty.jobsTitle') : tab === 'available' ? t('providerDashboard.empty.availableTitle') : t('providerDashboard.empty.bidsTitle')}
            </h3>
            <p className="text-sm text-gray-500">
              {tab === 'jobs' ? t('providerDashboard.empty.jobsSubtitle') : tab === 'available' ? t('providerDashboard.empty.availableSubtitle') : t('providerDashboard.empty.bidsSubtitle')}
            </p>
            {(tab === 'bids' || tab === 'jobs') && (
              <button onClick={() => setTab('available')} className="rounded-full bg-[#F97316] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ea580c]">{t('providerDashboard.actions.browse')}</button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((task) => {
              const hasBid = (task.bids || []).some(
                (b) => String(getBidProviderId(b)) === String(user?.id || user?._id)
              );
              const myBid = getMyBid(task);
              const payoutStatus = payoutStatusByTaskId[String(task.id)];
              const isAssignedToMe =
                String(task.assignedProvider?._id || task.assignedProvider || task.acceptedBid?.providerId) ===
                String(user?.id || user?._id);
              return (
                <div key={task.id} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:shadow-md">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-bold text-[#0F172A]">{task.title}</h3>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[task.status] ?? 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{t(`providerDashboard.status.${task.status === 'In Progress' ? 'inProgress' : task.status.toLowerCase()}`)}</span>
                        {task.urgency === 'urgent' && <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600 border border-red-200">🔥 {t('providerDashboard.urgency.urgent')}</span>}
                        {task.urgency === 'soon' && <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-600 border border-amber-200">⏰ {t('providerDashboard.urgency.soon')}</span>}
                        {(task.bids || []).length > 0 && <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-600 border border-indigo-200">{t('providerDashboard.bidsCount', { count: (task.bids || []).length })}</span>}
                      </div>
                      <p className="mb-3 text-sm text-gray-500 line-clamp-2">{task.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                        <span className="rounded-full bg-[#FFF7ED] px-2.5 py-1 font-medium text-[#F97316]">{task.category}</span>
                        {task.budget != null && <span className="font-semibold text-[#0F172A]">{formatMoney(task.budget, i18n.language, task.currency || 'USD')}</span>}
                        {task.dueDate && <span>{t('providerDashboard.meta.due', { date: task.dueDate })}</span>}
                        <span>{formatTimeAgo(task.createdAt, t)}</span>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[9px] font-bold text-gray-500">{(task.userName || 'U')[0].toUpperCase()}</span>
                        {t('providerDashboard.meta.postedBy')}{' '}
                        {task.userId ? (
                          <Link to={`/users/${task.userId}`} className="font-medium text-gray-600 hover:text-[#F97316] hover:underline">
                            {task.userName || t('providerDashboard.meta.userFallback')}
                          </Link>
                        ) : (
                          <span className="font-medium text-gray-600">{task.userName || t('providerDashboard.meta.userFallback')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 flex-col gap-2 sm:items-end">
                      {task.budget != null && <p className="text-xl font-bold text-[#0F172A] sm:text-right">{formatMoney(task.budget, i18n.language, task.currency || 'USD')}</p>}
                      {task.status === 'Completed' && isAssignedToMe ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-600 border border-emerald-200">
                            ✅ {t('providerDashboard.status.completed')}
                          </span>
                          {myBid && <span className="text-xs text-gray-400">{t('providerDashboard.meta.earned')}: <span className="font-semibold text-[#0F172A]">{formatMoney(getBidAmount(myBid), i18n.language, task.currency || 'USD')}</span></span>}
                          <span className="text-xs text-gray-400">
                            {t('providerDashboard.meta.client')}:{' '}
                            {task.userId ? (
                              <Link to={`/users/${task.userId}`} className="font-medium text-gray-600 hover:text-[#F97316] hover:underline">
                                {task.userName || t('providerDashboard.meta.userFallback')}
                              </Link>
                            ) : (
                              task.userName || t('providerDashboard.meta.userFallback')
                            )}
                          </span>
                        </div>
                      ) : task.status === 'In Progress' && isAssignedToMe ? (
                        <div className="flex flex-col items-end gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-4 py-2 text-xs font-semibold text-indigo-600 border border-indigo-200">
                            💼 {t('providerDashboard.status.inProgress')}
                          </span>
                          {myBid && <span className="text-xs text-gray-400">{t('providerDashboard.meta.agreed')}: <span className="font-semibold text-[#0F172A]">{formatMoney(getBidAmount(myBid), i18n.language, task.currency || 'USD')}</span></span>}
                          {myBid?.timeline && <span className="text-xs text-gray-400">{t('providerDashboard.meta.timeline', { value: myBid.timeline })}</span>}
                          <span className="text-xs text-gray-400">
                            {t('providerDashboard.meta.client')}:{' '}
                            {task.userId ? (
                              <Link to={`/users/${task.userId}`} className="font-medium text-gray-600 hover:text-[#F97316] hover:underline">
                                {task.userName || t('providerDashboard.meta.userFallback')}
                              </Link>
                            ) : (
                              task.userName || t('providerDashboard.meta.userFallback')
                            )}
                          </span>
                          {task.userId ? (
                            <Link
                              to={`/messages/${task.userId}`}
                              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-[#F97316] hover:text-[#F97316]"
                            >
                              {t('providerDashboard.actions.messageRequester', { defaultValue: 'Message Requester' })}
                            </Link>
                          ) : task.userEmail ? (
                            <a
                              href={`mailto:${task.userEmail}`}
                              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition hover:border-[#F97316] hover:text-[#F97316]"
                            >
                              {t('providerDashboard.actions.emailRequester', { defaultValue: 'Email Requester' })}
                            </a>
                          ) : null}
                          {payoutStatus ? (
                            <span className="text-xs text-gray-500">
                              Payout status: <span className="font-semibold text-[#0F172A]">{payoutStatus}</span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">Payout status: not created yet</span>
                          )}
                          {task.completionSubmission?.status === 'pending_approval' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 border border-amber-200">
                              {t('providerDashboard.completion.pending', { defaultValue: 'Completion submitted (pending approval)' })}
                            </span>
                          ) : null}
                          <button
                            onClick={() => setCompleteTask(task)}
                            disabled={task.completionSubmission?.status === 'pending_approval'}
                            className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                          >
                            ✓ {task.completionSubmission?.status === 'pending_approval'
                              ? t('providerDashboard.completion.submitted', { defaultValue: 'Submitted' })
                              : t('providerDashboard.actions.markComplete')}
                          </button>
                        </div>
                      ) : hasBid ? (
                        <div className="flex flex-col items-end gap-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-600 border border-emerald-200">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            {t('providerDashboard.bidSubmitted')}
                          </span>
                          {myBid && <span className="text-xs text-gray-400">{t('providerDashboard.meta.yourBid')}: <span className="font-semibold text-[#0F172A]">{formatMoney(getBidAmount(myBid), i18n.language, task.currency || 'USD')}</span></span>}
                          {myBid?.timeline && <span className="text-xs text-gray-400">{t('providerDashboard.meta.timeline', { value: myBid.timeline })}</span>}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartBid(task)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#F97316] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#ea580c]"
                        >
                          {t('providerDashboard.actions.submitBid')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <SiteFooter />

      {bidTask && (
        <BidModal
          task={bidTask}
          user={user}
          onClose={() => setBidTask(null)}
          onSubmit={async () => {
            await loadTasks();
            setBidSuccess(bidTask.title);
            setBidTask(null);
            setTimeout(() => setBidSuccess(null), 5000);
          }}
        />
      )}
      {completeTask && (
        <CompleteJobModal
          task={completeTask}
          onClose={() => setCompleteTask(null)}
          onSubmit={(formData) => handleSubmitCompletion(completeTask.id, formData)}
        />
      )}
    </div>
  );
}
