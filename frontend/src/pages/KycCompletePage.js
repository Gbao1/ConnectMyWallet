import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';

export default function KycCompletePage() {
  const { t } = useTranslation();
  const { user, initializing } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (initializing) return;
    const status = searchParams.get('kyc_status');
    const query = status ? `?kyc_status=${encodeURIComponent(status)}` : '';

    if (!user) {
      navigate('/auth?mode=login', { replace: true });
      return;
    }

    if ((user.role ?? '').toLowerCase() === 'provider') {
      navigate(`/provider/profile${query}`, { replace: true });
      return;
    }

    navigate(`/profile${query}`, { replace: true });
  }, [initializing, navigate, searchParams, user]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 text-secondary">
      {t('kyc.finalizing', { defaultValue: 'Finalizing verification…' })}
    </div>
  );
}
