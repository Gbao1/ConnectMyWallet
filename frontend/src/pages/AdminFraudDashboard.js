import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { api } from '../api/client';
import SiteHeader from '../ui/SiteHeader';
import SiteFooter from '../ui/SiteFooter';

function Pill({ children, color }) {
  const colors = {
    gray: 'bg-gray-100 text-gray-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-rose-50 text-rose-700',
    amber: 'bg-amber-50 text-amber-700',
    blue: 'bg-sky-50 text-sky-700',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[color] || colors.gray}`}>
      {children}
    </span>
  );
}

export default function AdminFraudDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ byStatus: [], byType: [] });
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [reviewStatusFilter, setReviewStatusFilter] = useState('pending');
  const [reviewItems, setReviewItems] = useState([]);
  const [reviewUpdatingId, setReviewUpdatingId] = useState(null);
  const [activeTab, setActiveTab] = useState('fraud');
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutUpdatingId, setPayoutUpdatingId] = useState(null);
  const [payoutReason, setPayoutReason] = useState({});

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(limit));
        if (typeFilter) params.set('type', typeFilter);
        if (statusFilter) params.set('status', statusFilter);
        if (search.trim()) params.set('search', search.trim());
        const [listRes, statsRes] = await Promise.all([
          api(`/api/admin/fraud?${params.toString()}`),
          api('/api/admin/fraud/stats'),
        ]);
        if (cancelled) return;
        setItems(listRes.items || []);
        setPage(listRes.page || 1);
        setTotal(listRes.total || 0);
        setStats({
          byStatus: statsRes.byStatus || [],
          byType: statsRes.byType || [],
        });
      } catch (err) {
        // Some deployments don't include the newer fraud endpoints yet.
        // Keep the screen usable instead of showing a persistent 404 banner.
        if (!cancelled) {
          if (err?.status === 404) {
            setItems([]);
            setPage(1);
            setTotal(0);
            setStats({ byStatus: [], byType: [] });
            setError(null);
          } else {
            setError(err.message || t('adminFraud.errors.loadData', { defaultValue: 'Failed to load data' }));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [user, page, limit, typeFilter, statusFilter, search, t]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api(
          `/api/reviews/moderation/queue?status=${encodeURIComponent(reviewStatusFilter)}&limit=100`
        );
        if (!cancelled) setReviewItems(res.reviews || []);
      } catch (err) {
        if (cancelled) return;
        if (err?.status === 404) {
          try {
            // Backward-compatible fallback for older backend route shape.
            const flagged = await api('/api/admin/reviews/flagged');
            const mapped = (flagged || []).map((item) => ({
              id: item._id,
              createdAt: item.createdAt,
              reviewerName: item.reviewer?.name || t('adminFraud.fallback.reviewer'),
              providerName: item.provider?.name || t('adminFraud.fallback.provider'),
              overallRating: item.rating ?? '-',
              status: 'pending',
            }));
            const filtered =
              reviewStatusFilter === 'all' || reviewStatusFilter === 'pending'
                ? mapped
                : [];
            setReviewItems(filtered);
          } catch (fallbackErr) {
            setError(fallbackErr.message || t('adminFraud.errors.loadReviewQueue', { defaultValue: 'Failed to load review moderation queue' }));
          }
        } else {
          setError(err.message || t('adminFraud.errors.loadReviewQueue', { defaultValue: 'Failed to load review moderation queue' }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, reviewStatusFilter, t]);

  useEffect(() => {
    if (!user || user.role !== 'admin' || activeTab !== 'payouts') return;
    let cancelled = false;
    (async () => {
      setPayoutLoading(true);
      try {
        const res = await api('/api/payouts/admin/pending?page=1&limit=100');
        if (!cancelled) setPendingPayouts(res.payouts || []);
      } catch (err) {
        if (!cancelled) setError(err.message || t('adminFraud.errors.loadPendingPayouts', { defaultValue: 'Failed to load pending payouts' }));
      } finally {
        if (!cancelled) setPayoutLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, activeTab, t]);

  const summary = useMemo(() => {
    const statusMap = Object.fromEntries(stats.byStatus.map((s) => [s.status, s.count]));
    const highSeverity = items.filter((i) => i.severity === 'high').length;
    const uniqueIps = new Set(items.map((i) => i.ip).filter(Boolean)).size;
    return {
      total: total,
      newCount: statusMap.new || 0,
      highSeverity,
      uniqueIps,
    };
  }, [stats.byStatus, items, total]);

  async function updateStatus(id, status) {
    setUpdatingId(id);
    try {
      const res = await api(`/api/admin/fraud/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setItems((prev) => prev.map((it) => (it.id === id ? res.item : it)));
      if (selected?.id === id) setSelected(res.item);
    } catch (err) {
      setError(err.message || t('adminFraud.errors.updateStatus', { defaultValue: 'Failed to update status' }));
    } finally {
      setUpdatingId(null);
    }
  }

  async function moderateReview(id, status) {
    setReviewUpdatingId(id);
    try {
      const res = await api(`/api/reviews/${id}/moderate`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setReviewItems((prev) => prev.map((item) => (item.id === id ? res.review : item)));
    } catch (err) {
      if (err?.status === 404) {
        try {
          if (status === 'approved') {
            await api(`/api/admin/reviews/${id}/dismiss`, {
              method: 'PATCH',
              body: JSON.stringify({ moderationNote: t('adminFraud.moderation.fallbackNote') }),
            });
            setReviewItems((prev) =>
              prev.map((item) => (item.id === id ? { ...item, status: 'approved' } : item))
            );
          } else if (status === 'rejected') {
            await api(`/api/admin/reviews/${id}`, { method: 'DELETE' });
            setReviewItems((prev) => prev.filter((item) => item.id !== id));
          } else {
            setReviewItems((prev) =>
              prev.map((item) => (item.id === id ? { ...item, status: 'pending' } : item))
            );
          }
        } catch (fallbackErr) {
          setError(fallbackErr.message || t('adminFraud.errors.updateReviewStatus', { defaultValue: 'Failed to update review moderation status' }));
        }
      } else {
        setError(err.message || t('adminFraud.errors.updateReviewStatus', { defaultValue: 'Failed to update review moderation status' }));
      }
    } finally {
      setReviewUpdatingId(null);
    }
  }

  async function approvePayout(payoutId) {
    setPayoutUpdatingId(payoutId);
    setError(null);
    try {
      await api(`/api/payouts/admin/${payoutId}/approve`, { method: 'POST', body: '{}' });
      setPendingPayouts((prev) => prev.filter((p) => p.payoutId !== payoutId));
      const res = await api('/api/payouts/admin/pending?page=1&limit=100');
      setPendingPayouts(res.payouts || []);
    } catch (err) {
      setError(err.message || t('adminFraud.errors.approvePayout', { defaultValue: 'Failed to approve payout' }));
    } finally {
      setPayoutUpdatingId(null);
    }
  }

  async function rejectPayout(payoutId) {
    setPayoutUpdatingId(payoutId);
    setError(null);
    try {
      await api(`/api/payouts/admin/${payoutId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: payoutReason[payoutId] || t('adminFraud.payouts.rejectDefaultReason') }),
      });
      setPendingPayouts((prev) => prev.filter((p) => p.payoutId !== payoutId));
      const res = await api('/api/payouts/admin/pending?page=1&limit=100');
      setPendingPayouts(res.payouts || []);
    } catch (err) {
      setError(err.message || t('adminFraud.errors.rejectPayout', { defaultValue: 'Failed to reject payout' }));
    } finally {
      setPayoutUpdatingId(null);
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">{t('common.redirectingLogin', { defaultValue: 'Redirecting to login...' })}</p>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50">
        <SiteHeader />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="max-w-md rounded-2xl bg-white p-8 shadow-sm">
            <h1 className="mb-2 text-xl font-semibold text-slate-900">{t('common.notAuthorized', { defaultValue: 'Not authorized' })}</h1>
            <p className="text-sm text-slate-500">
              {t('adminFraud.notAuthorizedDesc', { defaultValue: 'This area is restricted to admin users. If you believe this is a mistake, contact the site owner.' })}
            </p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('adminFraud.title', { defaultValue: 'Fraud & Abuse Monitoring' })}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {t('adminFraud.subtitle', { defaultValue: 'Review suspicious login attempts, reCAPTCHA failures, and other security signals in real time.' })}
            </p>
          </div>
        </header>

        <section className="rounded-2xl bg-white p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('fraud')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                activeTab === 'fraud' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {t('adminFraud.tabs.fraud', { defaultValue: 'Fraud Events' })}
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                activeTab === 'reviews' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {t('adminFraud.tabs.reviews', { defaultValue: 'Review Moderation' })}
            </button>
            <button
              onClick={() => setActiveTab('payouts')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                activeTab === 'payouts' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {t('adminFraud.tabs.payouts', { defaultValue: 'Pending Approvals' })}
            </button>
          </div>
        </section>

        {activeTab === 'fraud' && (
          <>
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('adminFraud.cards.totalEvents', { defaultValue: 'Total events' })}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.total}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('adminFraud.cards.newUnreviewed', { defaultValue: 'New / Unreviewed' })}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.newCount}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('adminFraud.cards.highSeverity', { defaultValue: 'High severity' })}</p>
            <p className="mt-2 text-2xl font-semibold text-rose-600">{summary.highSeverity}</p>
          </div>
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('adminFraud.cards.uniqueIps', { defaultValue: 'Unique IPs (page)' })}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{summary.uniqueIps}</p>
          </div>
        </section>

        <section className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1 rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700">
                  <option value="">{t('adminFraud.filters.allStatuses')}</option>
                  <option value="new">{t('adminFraud.status.new')}</option>
                  <option value="reviewed">{t('adminFraud.status.reviewed')}</option>
                  <option value="ignored">{t('adminFraud.status.ignored')}</option>
                  <option value="escalated">{t('adminFraud.status.escalated')}</option>
                </select>
                <select value={typeFilter} onChange={(e) => { setPage(1); setTypeFilter(e.target.value); }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700">
                  <option value="">{t('adminFraud.filters.allTypes')}</option>
                  {stats.byType.map((t) => (
                    <option key={t.type} value={t.type}>
                      {t.type} ({t.count})
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="search"
                placeholder={t('adminFraud.filters.searchPlaceholder')}
                value={search}
                onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 sm:w-52"
              />
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-100">
              <div className="max-h-[420px] overflow-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">{t('adminFraud.table.time')}</th>
                      <th className="px-3 py-2 font-medium">{t('adminFraud.table.type')}</th>
                      <th className="px-3 py-2 font-medium">{t('adminFraud.table.userIp')}</th>
                      <th className="px-3 py-2 font-medium">{t('adminFraud.table.severity')}</th>
                      <th className="px-3 py-2 font-medium">{t('adminFraud.table.status')}</th>
                      <th className="px-3 py-2 font-medium text-right">{t('adminFraud.table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-xs text-slate-400">
                          {loading ? t('adminFraud.loadingEvents') : t('adminFraud.emptyEvents')}
                        </td>
                      </tr>
                    )}
                    {items.map((item) => {
                      const severityColor =
                        item.severity === 'high' ? 'red' : item.severity === 'medium' ? 'amber' : 'green';
                      const statusColor =
                        item.status === 'new'
                          ? 'amber'
                          : item.status === 'escalated'
                            ? 'red'
                            : item.status === 'ignored'
                              ? 'gray'
                              : 'green';
                      return (
                        <tr key={item.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setSelected(item)}>
                          <td className="whitespace-nowrap px-3 py-2 align-top text-[11px] text-slate-500">
                            {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
                          </td>
                          <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-medium">{item.type}</span>
                              {item.reason && <span className="text-[10px] text-slate-500">{item.reason}</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top text-[11px] text-slate-700">
                            <div className="flex flex-col gap-0.5">
                              <span>{item.userEmail || t('adminFraud.fallback.guestUser')}</span>
                              {item.ip && <span className="text-[10px] text-slate-500">{item.ip}</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <Pill color={severityColor}>{item.severity || t('adminFraud.severity.low')}</Pill>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <Pill color={statusColor}>{item.status || t('adminFraud.status.new')}</Pill>
                          </td>
                          <td className="px-3 py-2 align-top text-right">
                            <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <button disabled={updatingId === item.id} onClick={() => updateStatus(item.id, 'reviewed')} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-50">{t('adminFraud.actions.markReviewed')}</button>
                              <button disabled={updatingId === item.id} onClick={() => updateStatus(item.id, 'ignored')} className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-50">{t('adminFraud.actions.ignore')}</button>
                              <button disabled={updatingId === item.id} onClick={() => updateStatus(item.id, 'escalated')} className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-medium text-rose-600 hover:bg-rose-100 disabled:opacity-50">{t('adminFraud.actions.escalate')}</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <aside className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-sm lg:w-80">
            <h2 className="mb-2 text-sm font-semibold text-slate-900">{t('adminFraud.details.title')}</h2>
            {!selected ? <p className="text-xs text-slate-500">{t('adminFraud.details.selectPrompt')}</p> : <pre className="max-h-96 overflow-auto rounded bg-slate-900 p-2 text-[10px] text-slate-100">{JSON.stringify(selected, null, 2)}</pre>}
          </aside>
        </section>
        </>
        )}

        {activeTab === 'reviews' && (
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{t('adminFraud.reviews.title')}</h2>
              <p className="text-xs text-slate-500">{t('adminFraud.reviews.subtitle')}</p>
            </div>
            <select
              value={reviewStatusFilter}
              onChange={(e) => setReviewStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700"
            >
              <option value="pending">{t('adminFraud.status.pending')}</option>
              <option value="approved">{t('adminFraud.status.approved')}</option>
              <option value="rejected">{t('adminFraud.status.rejected')}</option>
              <option value="all">{t('adminFraud.filters.all')}</option>
            </select>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-100">
            <div className="max-h-[320px] overflow-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t('adminFraud.table.time')}</th>
                    <th className="px-3 py-2 font-medium">{t('adminFraud.reviews.reviewer')}</th>
                    <th className="px-3 py-2 font-medium">{t('adminFraud.reviews.provider')}</th>
                    <th className="px-3 py-2 font-medium">{t('adminFraud.reviews.overall')}</th>
                    <th className="px-3 py-2 font-medium">{t('adminFraud.table.status')}</th>
                    <th className="px-3 py-2 font-medium text-right">{t('adminFraud.table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reviewItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-xs text-slate-400">{t('adminFraud.reviews.empty')}</td>
                    </tr>
                  ) : (
                    reviewItems.map((item) => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 text-[11px] text-slate-500">{item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}</td>
                        <td className="px-3 py-2 text-[11px] text-slate-700">{item.reviewerName}</td>
                        <td className="px-3 py-2 text-[11px] text-slate-700">{item.providerName}</td>
                        <td className="px-3 py-2 text-[11px] font-medium text-slate-800">{item.overallRating}/5</td>
                        <td className="px-3 py-2">
                          <Pill color={item.status === 'approved' ? 'green' : item.status === 'rejected' ? 'red' : 'amber'}>
                            {item.status}
                          </Pill>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <button disabled={reviewUpdatingId === item.id} onClick={() => moderateReview(item.id, 'approved')} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">{t('adminFraud.actions.approve')}</button>
                            <button disabled={reviewUpdatingId === item.id} onClick={() => moderateReview(item.id, 'pending')} className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50">{t('adminFraud.status.pending')}</button>
                            <button disabled={reviewUpdatingId === item.id} onClick={() => moderateReview(item.id, 'rejected')} className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50">{t('adminFraud.actions.reject')}</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        )}

        {activeTab === 'payouts' && (
          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-slate-900">{t('adminFraud.payouts.title')}</h2>
              <p className="text-xs text-slate-500">
                {t('adminFraud.payouts.subtitle')}
              </p>
            </div>
            <div className="space-y-4">
              {payoutLoading ? (
                <div className="rounded-xl border border-slate-100 p-4 text-xs text-slate-500">{t('adminFraud.payouts.loading')}</div>
              ) : pendingPayouts.length === 0 ? (
                <div className="rounded-xl border border-slate-100 p-4 text-xs text-slate-500">{t('adminFraud.payouts.empty')}</div>
              ) : (
                pendingPayouts.map((payout) => {
                  const task = payout.taskId || {};
                  const requester = task.user || {};
                  const provider = payout.providerId || {};
                  const assignedProviderId = task.assignedProvider?._id || task.assignedProvider;
                  const providerBid = (task.bids || []).find((b) => {
                    const bidProviderId = b?.provider?._id || b?.provider;
                    return String(bidProviderId) === String(assignedProviderId);
                  });
                  return (
                    <article key={payout.payoutId} className="rounded-xl border border-slate-100 p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-semibold text-slate-900">{task.title || t('adminFraud.payouts.untitledTask')}</div>
                        <Pill color="amber">{payout.status}</Pill>
                      </div>
                      <div className="grid gap-3 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                        <div><span className="font-medium text-slate-700">{t('adminFraud.payouts.fields.payout')}:</span> {payout.payoutId}</div>
                        <div><span className="font-medium text-slate-700">{t('adminFraud.payouts.fields.provider')}:</span> {provider.name || '-'} ({provider.email || '-'})</div>
                        <div><span className="font-medium text-slate-700">{t('adminFraud.payouts.fields.requester')}:</span> {requester.name || '-'} ({requester.email || '-'})</div>
                        <div><span className="font-medium text-slate-700">{t('adminFraud.payouts.fields.net')}:</span> {payout.netAmount} {payout.currency}</div>
                      </div>

                      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
                        <p className="mb-1 font-medium text-slate-800">{t('adminFraud.payouts.taskDescription')}</p>
                        <p>{task.description || t('adminFraud.payouts.noDescription')}</p>
                      </div>

                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        <div className="rounded-lg border border-slate-100 p-3">
                          <p className="mb-1 text-xs font-medium text-slate-800">{t('adminFraud.payouts.providerContext')}</p>
                          <p className="text-xs text-slate-600"><span className="font-medium">{t('adminFraud.payouts.bidComment')}:</span> {providerBid?.comment || t('adminFraud.payouts.noProviderComment')}</p>
                          <p className="mt-1 text-xs text-slate-600"><span className="font-medium">{t('adminFraud.payouts.bidEta')}:</span> {providerBid?.estimatedTime || '-'}</p>
                          <p className="mt-1 text-xs text-slate-600"><span className="font-medium">{t('adminFraud.payouts.customerReview')}:</span> {task.review?.comment || t('adminFraud.payouts.noReviewComment')}</p>
                        </div>
                        <div className="rounded-lg border border-slate-100 p-3">
                          <p className="mb-1 text-xs font-medium text-slate-800">{t('adminFraud.payouts.completionImages')}</p>
                          {(task.images || []).length === 0 ? (
                            <p className="text-xs text-slate-500">{t('adminFraud.payouts.noImages')}</p>
                          ) : (
                            <div className="grid grid-cols-3 gap-2">
                              {task.images.slice(0, 6).map((src, idx) => (
                                <a key={`${payout.payoutId}-img-${idx}`} href={src} target="_blank" rel="noreferrer">
                                  <img src={src} alt={t('adminFraud.payouts.taskImageAlt', { index: idx + 1 })} className="h-16 w-full rounded object-cover" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 rounded-lg border border-slate-100 p-3">
                        <p className="mb-1 text-xs font-medium text-slate-800">{t('adminFraud.payouts.taskComments')}</p>
                        {(task.comments || []).length === 0 ? (
                          <p className="text-xs text-slate-500">{t('adminFraud.payouts.noComments')}</p>
                        ) : (
                          <div className="space-y-1">
                            {task.comments.slice(-3).map((c) => (
                              <p key={c._id} className="text-xs text-slate-600">
                                • {c.text}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          value={payoutReason[payout.payoutId] || ''}
                          onChange={(e) =>
                            setPayoutReason((prev) => ({ ...prev, [payout.payoutId]: e.target.value }))
                          }
                          placeholder={t('adminFraud.payouts.rejectReasonPlaceholder')}
                          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 sm:max-w-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => approvePayout(payout.payoutId)}
                            disabled={payoutUpdatingId === payout.payoutId}
                            className="rounded-full bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {t('adminFraud.actions.approve')}
                          </button>
                          <button
                            onClick={() => rejectPayout(payout.payoutId)}
                            disabled={payoutUpdatingId === payout.payoutId}
                            className="rounded-full bg-rose-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                          >
                            {t('adminFraud.actions.reject')}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        )}

        {error && <p className="text-xs text-rose-600">{error}</p>}
      </main>
      <SiteFooter />
    </div>
  );
}
