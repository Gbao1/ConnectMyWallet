import { useState } from 'react';

const roles = [
  {
    value: 'user',
    title: 'I need tasks done',
    description: 'Post tasks and hire trusted providers to get things done.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    value: 'provider',
    title: "I'm a provider",
    description: 'Browse tasks, submit bids, and earn money doing what you do best.',
    icon: (
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export default function RoleSelectionModal({ onSelect }) {
  const [selected, setSelected] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!selected || submitting) return;
    setSubmitting(true);
    await onSelect(selected);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF7ED]">
            <svg className="h-6 w-6 text-[#F97316]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="mt-4 text-xl font-bold text-[#0F172A]">How will you use ConnectMyTask?</h2>
          <p className="mt-1 text-sm text-gray-500">Choose your role to personalize your experience.</p>
        </div>

        <div className="mt-6 space-y-3">
          {roles.map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => setSelected(role.value)}
              className={`flex w-full items-start gap-4 rounded-xl border-2 p-4 text-left transition ${
                selected === role.value
                  ? 'border-[#F97316] bg-[#FFF7ED]'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`flex-shrink-0 rounded-lg p-2 ${selected === role.value ? 'bg-[#F97316] text-white' : 'bg-gray-100 text-gray-500'}`}>
                {role.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">{role.title}</p>
                <p className="mt-0.5 text-xs text-gray-500">{role.description}</p>
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={!selected || submitting}
          onClick={handleContinue}
          className="mt-6 w-full rounded-xl bg-[#F97316] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#ea580c] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Setting up your account…' : 'Continue'}
        </button>

        <p className="mt-3 text-center text-xs text-gray-400">You can change this later in your profile settings.</p>
      </div>
    </div>
  );
}
