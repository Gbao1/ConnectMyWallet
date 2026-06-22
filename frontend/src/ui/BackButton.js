import { useNavigate } from 'react-router-dom';

export default function BackButton({ className = '', label = 'Back' }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className={`inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white/70 px-4 py-2 text-sm font-medium text-[#64748B] transition hover:border-[#2563EB] hover:text-[#2563EB] ${className}`.trim()}
    >
      <span aria-hidden="true">←</span>
      <span>{label}</span>
    </button>
  );
}
