import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import { api } from '../api/client';
import SiteHeader from '../ui/SiteHeader';
import SiteFooter from '../ui/SiteFooter';
import { formatCurrencyWithCode } from '../utils/currency';

const formatMoney = (value, lang, baseCurrency = 'USD') => {
  if (value == null) return '—';
  return formatCurrencyWithCode(value, lang, baseCurrency, { maximumFractionDigits: 2 });
};

const normalizeBangladeshMobileNumber = (value = '') => value.replace(/[\s-]/g, '');
const isValidBangladeshMobileNumber = (value = '') => /^(?:\+88|88)?01[3-9]\d{8}$/.test(normalizeBangladeshMobileNumber(value));

export default function ProviderWalletPage() {
  const { i18n } = useTranslation();
  const { user, initializing } = useAuth();
  const navigate = useNavigate();

  const [wallet, setWallet] = useState({ walletBalance: 0, walletPending: 0 });
  const [payouts, setPayouts] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [selectedDestinationId, setSelectedDestinationId] = useState('');
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState('');
  const [walletNotice, setWalletNotice] = useState('');
  const [withdrawingId, setWithdrawingId] = useState('');
  const [withdrawingAll, setWithdrawingAll] = useState(false);
  const [destinationForm, setDestinationForm] = useState({
    label: '',
    country: 'BD',
    type: 'mobile_banking',
    mobileBankingProvider: 'bkash',
    mobileNumber: '',
    isDefault: true,
  });
  const [savingDestination, setSavingDestination] = useState(false);

  useEffect(() => {
    if (initializing) return;
    if (!user) {
      navigate('/auth?mode=login', { replace: true });
      return;
    }
    if (user.role !== 'provider') {
      navigate('/dashboard', { replace: true });
    }
  }, [initializing, user, navigate]);

  useEffect(() => {
    if (!user?.id && !user?._id) return undefined;
    let cancelled = false;
    const loadWallet = async () => {
      try {
        if (!cancelled) setWalletError('');
        const [walletRes, historyRes, destinationsRes] = await Promise.all([
          api('/api/payouts/wallet'),
          api('/api/payouts/history?page=1&limit=20'),
          api('/api/payouts/destinations'),
        ]);
        if (cancelled) return;
        setWallet({
          walletBalance: Number(walletRes?.walletBalance || 0),
          walletPending: Number(walletRes?.walletPending || 0),
        });
        setPayouts(Array.isArray(historyRes?.payouts) ? historyRes.payouts : []);
        const destinationItems = Array.isArray(destinationsRes?.destinations) ? destinationsRes.destinations : [];
        setDestinations(destinationItems);
        const defaultDestination = destinationItems.find((d) => d.isDefault) || destinationItems[0];
        setSelectedDestinationId((prev) => prev || defaultDestination?._id || '');
      } catch (err) {
        if (!cancelled) setWalletError(err.message || 'Failed to load wallet');
      } finally {
        if (!cancelled) setWalletLoading(false);
      }
    };
    loadWallet();
    const id = setInterval(loadWallet, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [user?.id, user?._id]);

  const availablePayouts = useMemo(
    () => payouts.filter((p) => p.status === 'available'),
    [payouts]
  );

  const walletTotal = Number(wallet.walletBalance || 0) + Number(wallet.walletPending || 0);

  const refreshPayoutData = async () => {
    const [walletRes, historyRes, destinationsRes] = await Promise.all([
      api('/api/payouts/wallet'),
      api('/api/payouts/history?page=1&limit=20'),
      api('/api/payouts/destinations'),
    ]);
    setWallet({
      walletBalance: Number(walletRes?.walletBalance || 0),
      walletPending: Number(walletRes?.walletPending || 0),
    });
    setPayouts(Array.isArray(historyRes?.payouts) ? historyRes.payouts : []);
    const destinationItems = Array.isArray(destinationsRes?.destinations) ? destinationsRes.destinations : [];
    setDestinations(destinationItems);
    if (!selectedDestinationId) {
      const defaultDestination = destinationItems.find((d) => d.isDefault) || destinationItems[0];
      setSelectedDestinationId(defaultDestination?._id || '');
    }
  };

  const handleSaveDestination = async () => {
    if (!destinationForm.label.trim() || !destinationForm.mobileNumber.trim()) {
      setWalletError('Please fill destination label and mobile number.');
      return;
    }
    if (destinationForm.country === 'BD' && !isValidBangladeshMobileNumber(destinationForm.mobileNumber)) {
      setWalletError('Please enter a valid Bangladesh mobile number (e.g. 017XXXXXXXX or +8801XXXXXXXXX).');
      return;
    }
    setSavingDestination(true);
    setWalletError('');
    try {
      const result = await api('/api/payouts/destinations', {
        method: 'POST',
        body: JSON.stringify({
          ...destinationForm,
          mobileNumber: normalizeBangladeshMobileNumber(destinationForm.mobileNumber),
        }),
      });
      const items = Array.isArray(result?.destinations) ? result.destinations : [];
      setDestinations(items);
      const defaultDestination = items.find((d) => d.isDefault) || items[0];
      setSelectedDestinationId(defaultDestination?._id || '');
      setDestinationForm((prev) => ({ ...prev, label: '', mobileNumber: '' }));
      setWalletNotice('Destination saved.');
    } catch (err) {
      setWalletError(err.message || 'Failed to save destination');
    } finally {
      setSavingDestination(false);
    }
  };

  const handleWithdraw = async (payoutId) => {
    if (!selectedDestinationId) {
      setWalletError('Please save/select a payout destination first.');
      return;
    }
    setWithdrawingId(payoutId);
    setWalletError('');
    try {
      await api(`/api/payouts/${payoutId}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ destinationId: selectedDestinationId }),
      });
      setWalletNotice('Withdrawal request submitted.');
      await refreshPayoutData();
    } catch (err) {
      setWalletError(err.message || 'Withdrawal failed');
    } finally {
      setWithdrawingId('');
    }
  };

  const handleWithdrawAll = async () => {
    if (!selectedDestinationId) {
      setWalletError('Please save/select a payout destination first.');
      return;
    }
    setWithdrawingAll(true);
    setWalletError('');
    try {
      await api('/api/payouts/withdraw-all', {
        method: 'POST',
        body: JSON.stringify({ destinationId: selectedDestinationId }),
      });
      setWalletNotice('Withdrawal request submitted for all available payouts.');
      await refreshPayoutData();
    } catch (err) {
      setWalletError(err.message || 'Withdraw all failed');
    } finally {
      setWithdrawingAll(false);
    }
  };

  if (initializing) return <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] text-gray-500">Loading...</div>;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAFAFA]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]">Provider Wallet</h1>
              <p className="text-sm text-gray-500">Track payout statuses and withdraw available funds.</p>
            </div>
            <button
              onClick={handleWithdrawAll}
              disabled={withdrawingAll || availablePayouts.length === 0 || !selectedDestinationId}
              className="rounded-full bg-[#F97316] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {withdrawingAll ? 'Submitting…' : 'Withdraw All Available'}
            </button>
          </div>

          {walletError && <div className="mb-3 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">{walletError}</div>}
          {walletNotice && <div className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{walletNotice}</div>}

          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Available Balance</p>
              <p className="mt-1 text-2xl font-bold text-[#0F172A]">{formatMoney(wallet.walletBalance, i18n.language, 'BDT')}</p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Pending in Escrow</p>
              <p className="mt-1 text-2xl font-bold text-[#0F172A]">{formatMoney(wallet.walletPending, i18n.language, 'BDT')}</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Total Balance</p>
              <p className="mt-1 text-2xl font-bold text-[#0F172A]">{formatMoney(walletTotal, i18n.language, 'BDT')}</p>
            </div>
          </div>

          <div className="mb-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h2 className="mb-3 text-sm font-bold text-[#0F172A]">Add Mobile Banking Destination</h2>
              <div className="space-y-2">
                <input value={destinationForm.label} onChange={(e) => setDestinationForm((s) => ({ ...s, label: e.target.value }))} placeholder="Label (e.g. My bKash)" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
                <select value={destinationForm.mobileBankingProvider} onChange={(e) => setDestinationForm((s) => ({ ...s, mobileBankingProvider: e.target.value }))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="rocket">Rocket</option>
                </select>
                <input value={destinationForm.mobileNumber} onChange={(e) => setDestinationForm((s) => ({ ...s, mobileNumber: e.target.value }))} placeholder="Mobile number" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm" />
                <p className="text-xs text-gray-500">Use a valid Bangladesh number, e.g. 017XXXXXXXX or +8801XXXXXXXXX.</p>
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input type="checkbox" checked={destinationForm.isDefault} onChange={(e) => setDestinationForm((s) => ({ ...s, isDefault: e.target.checked }))} />
                  Set as default
                </label>
                <button type="button" onClick={handleSaveDestination} disabled={savingDestination} className="rounded-lg bg-[#0F172A] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
                  {savingDestination ? 'Saving…' : 'Save Destination'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <h2 className="mb-3 text-sm font-bold text-[#0F172A]">Withdraw Destination</h2>
              {destinations.length === 0 ? (
                <p className="text-sm text-gray-500">No saved destination yet. Add one to withdraw.</p>
              ) : (
                <select value={selectedDestinationId} onChange={(e) => setSelectedDestinationId(e.target.value)} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm">
                  {destinations.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.label || d.mobileBankingProvider || d.bankName} {d.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-2 text-xs text-gray-500">Withdrawals are only allowed for payouts with status <span className="font-semibold">available</span>.</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Payout</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Gross</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Commission</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Net</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {walletLoading ? (
                  <tr><td colSpan={6} className="px-3 py-4 text-gray-500">Loading wallet…</td></tr>
                ) : payouts.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-4 text-gray-500">No payouts yet.</td></tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.payoutId}>
                      <td className="px-3 py-2 font-medium text-[#0F172A]">{p.payoutId}</td>
                      <td className="px-3 py-2"><span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">{p.status}</span></td>
                      <td className="px-3 py-2">{formatMoney(p.grossAmount, i18n.language, p.currency || 'BDT')}</td>
                      <td className="px-3 py-2">{formatMoney(p.commissionAmount, i18n.language, p.currency || 'BDT')}</td>
                      <td className="px-3 py-2 font-semibold">{formatMoney(p.netAmount, i18n.language, p.currency || 'BDT')}</td>
                      <td className="px-3 py-2">
                        {p.status === 'available' ? (
                          <button onClick={() => handleWithdraw(p.payoutId)} disabled={!selectedDestinationId || withdrawingId === p.payoutId} className="rounded-md bg-[#F97316] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                            {withdrawingId === p.payoutId ? 'Submitting…' : 'Withdraw'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">No action</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
