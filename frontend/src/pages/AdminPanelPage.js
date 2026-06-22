import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { adminApi } from '../api/services';
import SiteHeader from '../ui/SiteHeader';
import SiteFooter from '../ui/SiteFooter';

export default function AdminPanelPage() {
  const { t } = useTranslation();
  const { user, initializing } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [providers, setProviders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initializing) return;
    if (!user) navigate('/auth?mode=login', { replace: true });
    else if (user.role !== 'admin') navigate('/dashboard', { replace: true });
  }, [user, initializing, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (tab === 'users') {
          const data = await adminApi.users();
          if (!cancelled) setUsers(Array.isArray(data) ? data : []);
        } else if (tab === 'providers') {
          const data = await adminApi.providers();
          if (!cancelled) setProviders(Array.isArray(data) ? data : []);
        } else if (tab === 'tasks') {
          const data = await adminApi.tasks();
          if (!cancelled) setTasks(Array.isArray(data) ? data : []);
        } else if (tab === 'fraud') {
          const data = await adminApi.flaggedAccounts();
          if (!cancelled) setFlagged(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || t('adminPanel.errors.loadData'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, tab, t]);

  const handleVerify = async (id) => {
    try {
      await adminApi.verifyUser(id);
      setUsers((prev) => prev.map((u) => (u._id === id || u.id === id ? { ...u, isVerified: true } : u)));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm(t('adminPanel.confirm.deleteUser'))) return;
    try {
      await adminApi.deleteUser(id);
      setUsers((prev) => prev.filter((u) => (u._id || u.id) !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTask = async (id) => {
    if (!window.confirm(t('adminPanel.confirm.deleteTask'))) return;
    try {
      await adminApi.deleteTask(id);
      setTasks((prev) => prev.filter((t) => (t._id || t.id) !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  if (initializing || !user || user.role !== 'admin') return null;

  const tabs = [
    { id: 'users', label: t('adminPanel.tabs.users') },
    { id: 'providers', label: t('adminPanel.tabs.providers') },
    { id: 'tasks', label: t('adminPanel.tabs.tasks') },
    { id: 'fraud', label: t('adminPanel.tabs.flaggedAccounts') },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('adminPanel.title')}</h1>
            <p className="text-sm text-slate-600">{t('adminPanel.subtitle')}</p>
          </div>
          <Link
            to="/admin/fraud"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-[#F97316]"
          >
            {t('adminPanel.fraudDashboardCta')}
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setTab(tabItem.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                tab === tabItem.id ? 'bg-[#F97316] text-white' : 'bg-white text-slate-700 border border-slate-200'
              }`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>

        {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}
        {loading ? <p className="text-sm text-slate-500">{t('adminPanel.loading')}</p> : null}

        {tab === 'users' && !loading ? (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">{t('adminPanel.table.name')}</th>
                  <th className="px-4 py-3">{t('adminPanel.table.email')}</th>
                  <th className="px-4 py-3">{t('adminPanel.table.role')}</th>
                  <th className="px-4 py-3">{t('adminPanel.table.verified')}</th>
                  <th className="px-4 py-3">{t('adminPanel.table.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const id = u._id || u.id;
                  return (
                    <tr key={id} className="border-b border-slate-100">
                      <td className="px-4 py-3">{u.name}</td>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">{u.role}</td>
                      <td className="px-4 py-3">{u.isVerified ? t('adminPanel.common.yes') : t('adminPanel.common.no')}</td>
                      <td className="px-4 py-3 space-x-2">
                        {!u.isVerified ? (
                          <button type="button" onClick={() => handleVerify(id)} className="text-emerald-600 hover:underline">
                            {t('adminPanel.actions.verify')}
                          </button>
                        ) : null}
                        <button type="button" onClick={() => handleDeleteUser(id)} className="text-rose-600 hover:underline">
                          {t('adminPanel.actions.delete')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {tab === 'providers' && !loading ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {providers.map((p) => (
              <li key={p._id || p.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="font-semibold text-slate-900">{p.name}</p>
                <p className="text-sm text-slate-600">{p.email}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {t('adminPanel.providers.skills')}: {(p.skills || []).join(', ') || '—'}
                </p>
              </li>
            ))}
          </ul>
        ) : null}

        {tab === 'tasks' && !loading ? (
          <ul className="space-y-3">
            {tasks.map((task) => {
              const id = task._id || task.id;
              return (
                <li key={id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
                  <div>
                    <p className="font-semibold text-slate-900">{task.title}</p>
                    <p className="text-xs text-slate-500">{task.status} · {task.category}</p>
                  </div>
                  <button type="button" onClick={() => handleDeleteTask(id)} className="text-sm text-rose-600 hover:underline">
                    {t('adminPanel.actions.delete')}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}

        {tab === 'fraud' && !loading ? (
          <ul className="space-y-3">
            {flagged.map((u) => (
              <li key={u._id || u.id} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                <p className="font-semibold">{u.name} · {u.email}</p>
                <p className="text-xs text-amber-800">
                  {t('adminPanel.flagged.flagged')}: {u.fraudFlags?.isFlagged ? t('adminPanel.common.yes') : t('adminPanel.common.no')} —{' '}
                  {(u.fraudFlags?.reasonCodes || []).join(', ') || t('adminPanel.flagged.noReason')}
                </p>
                <p className="text-xs text-slate-600">
                  {t('adminPanel.flagged.devices')}: {(u.deviceFingerprints || []).length}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
