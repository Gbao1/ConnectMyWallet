import { useTranslation } from 'react-i18next';

/**
 * Full-screen fade overlay with user vs provider choice (after social button click).
 */
export default function SocialRoleOverlay({ onSelect, onCancel, busy = false }) {
  const { t } = useTranslation();

  const roles = [
    {
      value: 'user',
      label: t('authForm.signup.roleUser', { defaultValue: 'I need tasks done' }),
    },
    {
      value: 'provider',
      label: t('authForm.signup.roleProvider', { defaultValue: "I'm a provider" }),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="social-role-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="social-role-title" className="text-center text-lg font-bold text-[#0F172A]">
          {t('authSocial.roleOverlayTitle', { defaultValue: 'How will you use ConnectMyTask?' })}
        </h2>
        <p className="mt-1 text-center text-sm text-gray-500">
          {t('authSocial.roleOverlaySubtitle', { defaultValue: 'Choose one to continue' })}
        </p>

        <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {roles.map((role) => (
            <button
              key={role.value}
              type="button"
              disabled={busy}
              onClick={() => onSelect(role.value)}
              className="rounded-lg border-2 border-gray-200 px-3 py-3 text-sm font-medium text-gray-700 transition hover:border-[#F97316] hover:bg-[#FFF7ED] hover:text-[#F97316] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {role.label}
            </button>
          ))}
        </div>

        {onCancel && (
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="mt-4 w-full text-sm text-gray-500 hover:text-gray-700 disabled:opacity-60"
          >
            {t('authSocial.roleOverlayCancel', { defaultValue: 'Cancel' })}
          </button>
        )}
      </div>
    </div>
  );
}
