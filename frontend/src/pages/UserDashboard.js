import { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { api } from '../api/client';
import { initiateTaskPayment } from '../api/services';
import TaskComments from '../components/TaskComments';
import SiteHeader from '../ui/SiteHeader';
import SiteFooter from '../ui/SiteFooter';
import { formatCurrencyWithCode } from '../utils/currency';
import StarRatingInput from '../ui/StarRatingInput';
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

const formatDate = (value) => {
  if (!value) return '—';
  try {
    const date = value.toDate ? value.toDate() : new Date(value);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
};

const formatTimeAgo = (val) => {
  if (!val) return '';
  const date = typeof val === 'string' ? new Date(val) : val.toDate ? val.toDate() : new Date(val);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const getBidAmount = (bid) => {
  const raw = bid?.amount ?? bid?.price ?? bid?.bidAmount ?? null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
};

function BidsPanel({ task, onAccept }) {
  const { i18n, t } = useTranslation();
  const bids = task.bids || [];
  const [accepting, setAccepting] = useState(null);

  const handleAccept = async (bid) => {
    setAccepting(bid.providerId);
    await onAccept(task.id, bid);
    setAccepting(null);
  };

  if (bids.length === 0) {
    return (
      <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-400">{t('userDashboard.bids.empty', { defaultValue: 'No bids yet. Providers will see your task and submit their bids.' })}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <h4 className="text-sm font-semibold text-[#0F172A]">{t('userDashboard.bids.title', { count: bids.length, defaultValue: `Bids (${bids.length})` })}</h4>
      {bids.map((bid, i) => (
        <div key={`${bid._id || bid.id || i}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
          {(() => {
            const providerId = bid.providerId || bid.provider?._id || bid.provider?.id || bid.provider || null;
            const providerName = bid.providerName || bid.provider?.name || 'Provider';
            const providerInitial = providerName[0]?.toUpperCase() || 'P';
            return (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F97316] text-xs font-bold text-white">{providerInitial}</span>
                {providerId ? (
                  <Link to={`/providers/${providerId}`} className="text-sm font-semibold text-[#0F172A] hover:text-[#F97316] hover:underline">
                    {providerName}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-[#0F172A]">{providerName}</span>
                )}
                <span className="text-xs text-gray-400">{formatTimeAgo(bid.createdAt)}</span>
              </div>
              <p className="mb-2 text-sm text-gray-600">{bid.message}</p>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                <span className="font-semibold text-[#0F172A]">{formatMoney(getBidAmount(bid), i18n.language, task.currency || 'USD')}</span>
                {bid.timeline && <span>{t('userDashboard.bids.timeline', { defaultValue: 'Timeline' })}: {bid.timeline}</span>}
              </div>
            </div>
            <div className="flex gap-2 sm:flex-shrink-0">
              {task.status === 'Active' && (
                <button
                  onClick={() => handleAccept(bid)}
                  disabled={accepting === providerId}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  {accepting === providerId
                    ? t('userDashboard.bids.accepting', { defaultValue: 'Accepting…' })
                    : t('userDashboard.bids.accept', { defaultValue: 'Accept Bid' })}
                </button>
              )}
              {task.status === 'In Progress' && task.acceptedBid?.providerId === providerId && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-600 border border-emerald-200">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {t('userDashboard.bids.accepted', { defaultValue: 'Accepted' })}
                </span>
              )}
            </div>
          </div>
            );
          })()}
        </div>
      ))}
    </div>
  );
}

function ReviewModal({ task, onClose, onSubmit }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    communication: 5,
    punctuality: 5,
    quality: 5,
    professionalism: 5,
    comment: '',
    recommend: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setRating = (key) => (value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        rating: Math.round(
          (form.communication + form.punctuality + form.quality + form.professionalism) / 4
        ),
        subRatings: {
          communication: form.communication,
          punctuality: form.punctuality,
          quality: form.quality,
          professionalism: form.professionalism,
        },
        comment: form.comment.trim(),
        recommend: Boolean(form.recommend),
      });
      onClose();
    } catch (err) {
      setError(err.message || t('userDashboard.review.error', { defaultValue: 'Failed to submit review' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="text-lg font-bold text-[#0F172A]">{t('userDashboard.review.title', { defaultValue: 'Complete task and rate provider' })}</h3>
          <p className="text-sm text-gray-500">
            {t('userDashboard.review.taskLabel', { defaultValue: 'Task' })}: {task.title} - {task.acceptedBid?.providerName || t('userDashboard.review.providerFallback', { defaultValue: 'Provider' })}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <StarRatingInput
              label={t('userDashboard.review.communication', { defaultValue: 'Communication' })}
              value={form.communication}
              onChange={setRating('communication')}
            />
            <StarRatingInput
              label={t('userDashboard.review.punctuality', { defaultValue: 'Punctuality' })}
              value={form.punctuality}
              onChange={setRating('punctuality')}
            />
            <StarRatingInput label={t('userDashboard.review.quality', { defaultValue: 'Quality' })} value={form.quality} onChange={setRating('quality')} />
            <StarRatingInput
              label={t('userDashboard.review.professionalism', { defaultValue: 'Professionalism' })}
              value={form.professionalism}
              onChange={setRating('professionalism')}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">{t('userDashboard.review.comment', { defaultValue: 'Comment (optional)' })}</label>
            <textarea
              rows={4}
              value={form.comment}
              onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none"
              placeholder={t('userDashboard.review.commentPlaceholder', { defaultValue: 'Share your experience with this provider' })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.recommend}
              onChange={(e) => setForm((prev) => ({ ...prev, recommend: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-[#F97316] focus:ring-[#F97316]"
            />
            {t('userDashboard.review.recommend', { defaultValue: 'I recommend this provider' })}
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600"
              disabled={saving}
            >
              {t('common.cancel', { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#F97316] px-4 py-2 text-sm font-semibold text-white"
              disabled={saving}
            >
              {saving
                ? t('common.submitting', { defaultValue: 'Submitting...' })
                : t('userDashboard.review.submit', { defaultValue: 'Submit review' })}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserDashboard() {
  const { i18n, t } = useTranslation();
  const { user, initializing } = useAuth();
  const navigate = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [expandedTask, setExpandedTask] = useState(null);
  const [reviewTask, setReviewTask] = useState(null);

  const displayName = getDisplayName(user, t('userDashboard.fallbackName', { defaultValue: 'there' }));

  useEffect(() => {
    if (initializing) return;
    if (!user) { navigate('/auth?mode=login', { replace: true }); return; }
  }, [initializing, user, navigate]);

  useEffect(() => {
    const authUserId = user?.id || user?._id;
    if (!authUserId) return undefined;
    let cancelled = false;
    const load = async () => {
      try {
        const tasksResponse = await api('/api/tasks');
        const allTasks = Array.isArray(tasksResponse) ? tasksResponse : tasksResponse?.tasks || [];
        const items = allTasks
          .filter((task) => {
            const ownerId = task?.user?._id || task?.user?.id || task?.userId;
            return String(ownerId) === String(authUserId);
          })
          .map((task) => ({
            ...task,
            id: task.id || task._id,
          }));
        const sorted = [...items].sort((a, b) => {
          const ta = new Date(a.createdAt ?? 0);
          const tb = new Date(b.createdAt ?? 0);
          return tb - ta;
        });
        if (!cancelled) {
          setTasks(sorted);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load tasks:', err);
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.id, user?._id]);

  const handleAcceptBid = async (taskId, bid) => {
    try {
      const bidId = bid._id || bid.id;
      if (!bidId) throw new Error(t('userDashboard.errors.bidIdMissing', { defaultValue: 'Bid id missing' }));
      const selectedTask = tasks.find((item) => (item.id || item._id) === taskId);
      await api(`/api/tasks/${taskId}/acceptBid/${bidId}`, {
        method: 'PUT',
      });
              setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId || task._id === taskId
            ? {
                ...task,
                status: 'In Progress',
                assignedProvider: bid.provider || bid.providerId,
                acceptedBid: {
                  providerId: bid.providerId || bid.provider?._id || bid.provider,
                  providerName: bid.providerName || bid.provider?.name,
                  providerEmail: bid.provider?.email || null,
                  amount: bid.amount || bid.price,
                  timeline: bid.timeline || bid.estimatedTime || null,
                },
              }
            : task
        )
      );
      const amount = Number(bid.amount ?? bid.price ?? 0);
      const currency = selectedTask?.currency || 'BDT';
      const paymentInit = await initiateTaskPayment({ taskId, amount, currency });
      if (!paymentInit?.paymentUrl || !paymentInit?.transactionId) {
        throw new Error(t('userDashboard.errors.paymentRedirectMissing', { defaultValue: 'Missing payment redirect data' }));
      }
      sessionStorage.setItem('pendingTransactionId', paymentInit.transactionId);
      window.location.assign(paymentInit.paymentUrl);
    } catch (err) {
      console.error('Failed to accept bid', err);
    }
  };

  const filteredTasks = useMemo(() => {
    let list = [...tasks];
    if (statusFilter !== 'All') list = list.filter((t) => t.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
    }
    return list;
  }, [tasks, search, statusFilter]);

  const totalBids = useMemo(() => tasks.reduce((sum, t) => sum + (t.bids?.length || 0), 0), [tasks]);
  const stats = useMemo(() => ({
    total: tasks.length,
    active: tasks.filter((t) => t.status === 'Active').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
  }), [tasks]);

  const handleCompleteTaskWithReview = async (task, payload) => {
    await api(`/api/tasks/${task.id}/completeTask`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setTasks((prev) =>
      prev.map((item) =>
        item.id === task.id
          ? {
              ...item,
              status: 'Completed',
              review: {
                rating: payload.rating,
                comment: payload.comment,
                subRatings: payload.subRatings,
                recommend: payload.recommend,
              },
            }
          : item
      )
    );
  };

  const handleDeleteTask = async (task) => {
    const taskId = task.id || task._id;
    if (!taskId) return;
    const confirmed = window.confirm(
      t('userDashboard.delete.confirm', {
        title: task.title,
        defaultValue: `Delete task "${task.title}"? This cannot be undone.`,
      })
    );
    if (!confirmed) return;
    try {
      await api(`/api/tasks/${taskId}`, { method: 'DELETE' });
      setTasks((prev) => prev.filter((t) => (t.id || t._id) !== taskId));
      if (expandedTask === taskId) setExpandedTask(null);
    } catch (err) {
      console.error('Failed to delete task', err);
      window.alert(err.message || t('userDashboard.delete.error', { defaultValue: 'Failed to delete task' }));
    }
  };

  if (initializing) return <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] text-gray-500">{t('common.loading', { defaultValue: 'Loading…' })}</div>;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
      <SiteHeader />

      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0F172A]">{t('userDashboard.header.welcome', { name: displayName, defaultValue: `Welcome back, ${displayName} 👋` })}</h1>
          <p className="mt-1 text-gray-500">{t('userDashboard.header.subtitle', { defaultValue: "Here's an overview of your tasks and activity." })}</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: t('userDashboard.stats.totalTasks', { defaultValue: 'Total Tasks' }), value: stats.total, accent: 'border-[#F97316]/20 bg-[#FFF7ED]' },
            { label: t('userDashboard.stats.active', { defaultValue: 'Active' }), value: stats.active, accent: 'border-orange-200 bg-orange-50' },
            { label: t('userDashboard.stats.inProgress', { defaultValue: 'In Progress' }), value: stats.inProgress, accent: 'border-indigo-200 bg-indigo-50' },
            { label: t('userDashboard.stats.completed', { defaultValue: 'Completed' }), value: stats.completed, accent: 'border-emerald-200 bg-emerald-50' },
            { label: t('userDashboard.stats.totalBids', { defaultValue: 'Total Bids' }), value: totalBids, accent: 'border-purple-200 bg-purple-50' },
          ].map((card) => (
            <div key={card.label} className={`rounded-2xl border p-5 shadow-sm ${card.accent}`}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
              <p className="text-3xl font-bold text-[#0F172A]">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mb-8 flex flex-wrap gap-3">
          <Link to="/tasks/new" className="inline-flex items-center gap-2 rounded-full bg-[#F97316] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#ea580c]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            {t('userDashboard.actions.postTask', { defaultValue: 'Post a New Task' })}
          </Link>
          <Link to="/find-tasks" className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-[#0F172A] transition hover:border-[#F97316] hover:text-[#F97316]">
            {t('userDashboard.actions.browseProviders', { defaultValue: 'Browse Providers' })}
          </Link>
        </div>

        {/* Tasks */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#0F172A]">{t('userDashboard.tasks.title', { defaultValue: 'My Tasks' })}</h2>
              <p className="text-sm text-gray-500">{t('userDashboard.tasks.count', { count: filteredTasks.length, defaultValue: `${filteredTasks.length} task${filteredTasks.length !== 1 ? 's' : ''}` })}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('userDashboard.tasks.search', { defaultValue: 'Search tasks…' })} className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm focus:border-[#F97316] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 sm:w-56" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-[#F97316] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20">
                <option value="All">{t('userDashboard.tasks.filters.all', { defaultValue: 'All Status' })}</option>
                <option value="Active">{t('userDashboard.tasks.filters.active', { defaultValue: 'Active' })}</option>
                <option value="In Progress">{t('userDashboard.tasks.filters.inProgress', { defaultValue: 'In Progress' })}</option>
                <option value="Completed">{t('userDashboard.tasks.filters.completed', { defaultValue: 'Completed' })}</option>
                <option value="Cancelled">{t('userDashboard.tasks.filters.cancelled', { defaultValue: 'Cancelled' })}</option>
              </select>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex min-h-[200px] items-center justify-center text-gray-400">{t('userDashboard.tasks.loading', { defaultValue: 'Loading tasks…' })}</div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-200 p-12 text-center">
                <span className="text-4xl">📭</span>
                <div>
                  <h3 className="text-lg font-semibold text-[#0F172A]">{tasks.length === 0 ? t('userDashboard.tasks.empty.none', { defaultValue: 'No tasks yet' }) : t('userDashboard.tasks.empty.noMatch', { defaultValue: 'No matching tasks' })}</h3>
                  <p className="mt-1 text-sm text-gray-500">{tasks.length === 0 ? t('userDashboard.tasks.empty.noneDesc', { defaultValue: 'Post your first task and get matched with providers.' }) : t('userDashboard.tasks.empty.noMatchDesc', { defaultValue: 'Try adjusting your search or filter.' })}</p>
                </div>
                {tasks.length === 0 && <Link to="/tasks/new" className="rounded-full bg-[#F97316] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ea580c]">{t('userDashboard.actions.postTaskShort', { defaultValue: 'Post a Task' })}</Link>}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTasks.map((task) => {
                  const bidCount = (task.bids || []).length;
                  const isExpanded = expandedTask === task.id;
                  const assignedProviderId =
                    task?.acceptedBid?.providerId ||
                    task?.assignedProvider?._id ||
                    task?.assignedProvider?.id ||
                    task?.assignedProvider ||
                    null;
                  const assignedProviderName =
                    task?.acceptedBid?.providerName ||
                    task?.assignedProvider?.name ||
                    'Provider';
                  const hasAssignedProvider = Boolean(
                    assignedProviderId && task.status !== 'Active'
                  );
                  return (
                    <div key={task.id} className="rounded-xl border border-gray-100 p-5 transition hover:border-gray-200 hover:shadow-sm">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-[#0F172A]">{task.title}</h3>
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[task.status] ?? 'bg-gray-100 text-gray-600 border border-gray-200'}`}>{task.status}</span>
                            {task.urgency === 'urgent' && <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600 border border-red-200">🔥 Urgent</span>}
                            {task.urgency === 'soon' && <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-600 border border-amber-200">⏰ Soon</span>}
                          </div>
                          <p className="mb-2 text-sm text-gray-500 line-clamp-2">{task.description}</p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                            <span>{task.category}</span>
                            {task.budget != null && <span className="font-semibold text-[#0F172A]">{formatMoney(task.budget, i18n.language, task.currency || 'USD')}</span>}
                            {task.dueDate && <span>Due {task.dueDate}</span>}
                            <span>Posted {formatDate(task.createdAt)}</span>
                          </div>
                          {hasAssignedProvider && (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                {t('userDashboard.assignedTo', { name: assignedProviderName, defaultValue: `Assigned to ${assignedProviderName}` })}
                                {task?.acceptedBid?.amount != null ? ` — ${formatMoney(task.acceptedBid.amount, i18n.language, task.currency || 'USD')}` : ''}
                              </span>
                              {assignedProviderId ? (
                                <Link
                                  to={`/providers/${assignedProviderId}`}
                                  className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-[#F97316] hover:text-[#F97316]"
                                >
                                  {t('userDashboard.actions.viewProviderProfile', { defaultValue: 'View Provider Profile' })}
                                </Link>
                              ) : null}
                              {assignedProviderId ? (
                                <Link
                                  to={`/messages/${assignedProviderId}`}
                                  className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:border-[#F97316] hover:text-[#F97316]"
                                >
                                  {t('userDashboard.actions.messageProvider', { defaultValue: 'Message Provider' })}
                                </Link>
                              ) : null}
                              {task.status === 'In Progress' && task?.completionSubmission?.status === 'pending_approval' ? (
                                <button
                                  type="button"
                                  onClick={() => setReviewTask(task)}
                                  className="inline-flex items-center rounded-full border border-[#F97316]/30 bg-[#FFF7ED] px-3 py-1 text-xs font-semibold text-[#F97316] hover:bg-[#F97316] hover:text-white"
                                >
                                  {t('userDashboard.actions.completeTask', { defaultValue: 'Complete Task' })}
                                </button>
                              ) : null}
                              {task.status === 'Completed' && task?.review ? (
                                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600">
                                  {t('userDashboard.review.reviewed', { defaultValue: 'Reviewed' })}
                                </span>
                              ) : null}
                            </div>
                          )}
                          {!hasAssignedProvider ? (
                            <div className="mt-2">
                              <button
                                type="button"
                                onClick={() => handleDeleteTask(task)}
                                className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                {t('userDashboard.actions.deleteTask', { defaultValue: 'Delete Task' })}
                              </button>
                            </div>
                          ) : null}
                        </div>
                        {!hasAssignedProvider ? (
                          <div className="flex items-center gap-2 sm:flex-shrink-0">
                            <button
                              onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                                bidCount > 0
                                  ? 'border-[#F97316] bg-[#FFF7ED] text-[#F97316] hover:bg-[#F97316] hover:text-white'
                                  : 'border-gray-200 text-gray-600 hover:border-[#F97316] hover:text-[#F97316]'
                              }`}
                            >
                              🤝 {t('userDashboard.bids.count', { count: bidCount, defaultValue: `${bidCount} Bid${bidCount !== 1 ? 's' : ''}` })}
                              <svg className={`h-3.5 w-3.5 transition ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                          </div>
                        ) : null}
                      </div>
                      {!hasAssignedProvider && isExpanded && (
                        <>
                          <BidsPanel task={task} onAccept={handleAcceptBid} />
                          <TaskComments taskId={task.id || task._id} />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <SiteFooter />
      {reviewTask ? (
        <ReviewModal
          task={reviewTask}
          onClose={() => setReviewTask(null)}
          onSubmit={(payload) => handleCompleteTaskWithReview(reviewTask, payload)}
        />
      ) : null}
    </div>
  );
}
