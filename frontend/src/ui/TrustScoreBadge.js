export default function TrustScoreBadge({ score = 0, size = 'md' }) {
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const tone =
    safeScore >= 80
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : safeScore >= 60
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-rose-50 text-rose-700 border-rose-200';

  const sizing =
    size === 'sm'
      ? 'px-3 py-1.5 text-xs'
      : 'px-4 py-2 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-semibold ${tone} ${sizing}`}
      title="Trust score combines ratings, KYC status, and completion rate"
    >
      <span>Trust</span>
      <span>{safeScore}/100</span>
    </span>
  );
}
