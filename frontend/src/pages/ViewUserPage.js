import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteHeader from '../ui/SiteHeader';
import SiteFooter from '../ui/SiteFooter';
import { api } from '../api/client';

export default function ViewUserPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [profileRes, tasksRes] = await Promise.allSettled([
          api(`/api/auth/profile/${id}`),
          api('/api/tasks'),
        ]);
        const data = profileRes.status === 'fulfilled' ? profileRes.value : null;
        const taskPayload = tasksRes.status === 'fulfilled' ? tasksRes.value : [];
        const allTasks = Array.isArray(taskPayload) ? taskPayload : taskPayload?.tasks || [];
        if (!cancelled) {
          setUser(data || null);
          setTasks(allTasks);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t('viewUser.errorLoad', { defaultValue: 'Failed to load user profile' }));
          setUser(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const userTaskStats = useMemo(() => {
    if (!user) {
      return { total: 0, active: 0, inProgress: 0, completed: 0 };
    }
    const userId = user._id || user.id;
    const mine = tasks.filter((task) => {
      const ownerId = task?.user?._id || task?.user?.id || task?.userId || task?.user;
      return String(ownerId) === String(userId);
    });
    return {
      total: mine.length,
      active: mine.filter((t) => t.status === 'Active').length,
      inProgress: mine.filter((t) => t.status === 'In Progress').length,
      completed: mine.filter((t) => t.status === 'Completed').length,
    };
  }, [tasks, user]);

  const displayName = user?.name || user?.firstName || user?.email || t('viewUser.fallbackUser', { defaultValue: 'User' });
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || t('viewUser.fallbackInitial', { defaultValue: 'U' });

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {loading ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-sm text-gray-500 shadow-sm">{t('viewUser.loading', { defaultValue: 'Loading profile…' })}</div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-8 text-sm text-rose-700 shadow-sm">{error}</div>
        ) : !user ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 text-sm text-gray-500 shadow-sm">{t('viewUser.notFound', { defaultValue: 'User not found.' })}</div>
        ) : (
          <section className="space-y-6">
            <article className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mb-4 inline-flex items-center rounded-full border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 hover:border-[#F97316] hover:text-[#F97316]"
              >
                {t('common.back', { defaultValue: 'Back' })}
              </button>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#F97316] text-lg font-bold text-white">
                    {initials}
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('viewUser.requesterProfile', { defaultValue: 'Task requester profile' })}</p>
                    <h1 className="mt-1 text-3xl font-bold text-[#0F172A]">{displayName}</h1>
                    <p className="mt-1 text-sm text-gray-500">{t('viewUser.memberAccount', { defaultValue: 'Member account' })}</p>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  <p><span className="font-medium text-gray-700">{t('viewUser.location', { defaultValue: 'Location:' })}</span> {user.location?.country || t('common.notProvided', { defaultValue: 'Not provided' })}</p>
                  <p><span className="font-medium text-gray-700">{t('viewUser.memberSince', { defaultValue: 'Member since:' })}</span> {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : t('common.unknown', { defaultValue: 'Unknown' })}</p>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{t('viewUser.aboutRequests', { defaultValue: 'About requests' })}</p>
                <p className="mt-2 text-sm text-gray-700">
                  {user.about?.trim() || t('viewUser.aboutEmpty', { defaultValue: 'This member has not added request preferences yet.' })}
                </p>
              </div>
            </article>

            <article className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-[#0F172A]">{t('viewUser.taskActivity', { defaultValue: 'Task activity' })}</h2>
              <p className="mt-1 text-sm text-gray-500">{t('viewUser.taskActivitySub', { defaultValue: 'Recent platform activity for this requester.' })}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: t('viewUser.stats.totalPosted', { defaultValue: 'Total posted' }), value: userTaskStats.total },
                  { label: t('viewUser.stats.active', { defaultValue: 'Active' }), value: userTaskStats.active },
                  { label: t('viewUser.stats.inProgress', { defaultValue: 'In progress' }), value: userTaskStats.inProgress },
                  { label: t('viewUser.stats.completed', { defaultValue: 'Completed' }), value: userTaskStats.completed },
                ].map((card) => (
                  <div key={card.label} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
                    <p className="mt-1 text-2xl font-bold text-[#0F172A]">{card.value}</p>
                  </div>
                ))}
              </div>
            </article>

            <div className="flex">
              <Link to="/provider-dashboard" className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:border-[#F97316] hover:text-[#F97316]">
                {t('viewUser.backDashboard', { defaultValue: 'Back to dashboard' })}
              </Link>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
