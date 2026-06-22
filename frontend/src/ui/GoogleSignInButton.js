import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import SocialRoleOverlay from './SocialRoleOverlay';
import { GOOGLE_CLIENT_ID } from '../config';

function loadGsi() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const existing = document.querySelector('script[data-google-gsi]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.dataset.googleGsi = '1';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Google Sign-In'));
    document.head.appendChild(s);
  });
}

function isRoleRequiredError(err) {
  return err?.status === 409 && (err?.code === 'ROLE_REQUIRED' || err?.data?.code === 'ROLE_REQUIRED');
}

export default function GoogleSignInButton({ mode = 'login', label }) {
  const { loginWithGoogleAccessToken } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRoleOverlay, setShowRoleOverlay] = useState(false);
  const [overlayBusy, setOverlayBusy] = useState(false);
  const pendingAccessTokenRef = useRef(null);
  const pendingSignupRoleRef = useRef(null);

  const finishSignIn = (user) => {
    const nextRoute =
      (user?.role ?? '').toLowerCase() === 'provider' ? '/provider-dashboard' : '/dashboard';
    navigate(nextRoute, { replace: true });
  };

  const exchangeToken = async (accessToken, role) => {
    const result = await loginWithGoogleAccessToken(accessToken, role);
    finishSignIn(result.user);
  };

  const runGoogleOAuth = (signupRole) => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Client ID is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    pendingSignupRoleRef.current = signupRole ?? null;

    void loadGsi()
      .then(() => {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'openid email profile',
          callback: async (tokenResponse) => {
            try {
              if (tokenResponse.error) {
                if (tokenResponse.error === 'popup_closed_by_user') return;
                setError(tokenResponse.error);
                return;
              }
              const accessToken = tokenResponse.access_token;
              const roleForRequest = pendingSignupRoleRef.current || undefined;
              try {
                await exchangeToken(accessToken, roleForRequest);
              } catch (err) {
                if (isRoleRequiredError(err)) {
                  pendingAccessTokenRef.current = accessToken;
                  setShowRoleOverlay(true);
                  return;
                }
                setError(err instanceof Error ? err.message : 'Google sign-in failed');
              }
            } finally {
              setLoading(false);
              pendingSignupRoleRef.current = null;
            }
          },
        });
        client.requestAccessToken();
      })
      .catch((err) => {
        setLoading(false);
        pendingSignupRoleRef.current = null;
        setError(err instanceof Error ? err.message : 'Google sign-in failed');
      });
  };

  const handleClick = () => {
    if (mode === 'signup') {
      setShowRoleOverlay(true);
      return;
    }
    runGoogleOAuth();
  };

  const handleSignupRoleSelect = (role) => {
    setShowRoleOverlay(false);
    runGoogleOAuth(role);
  };

  const handleLoginRoleSelect = async (role) => {
    const accessToken = pendingAccessTokenRef.current;
    if (!accessToken) return;
    setOverlayBusy(true);
    setError(null);
    try {
      await exchangeToken(accessToken, role);
      pendingAccessTokenRef.current = null;
      setShowRoleOverlay(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    } finally {
      setOverlayBusy(false);
    }
  };

  const handleOverlaySelect = async (role) => {
    if (pendingAccessTokenRef.current) {
      await handleLoginRoleSelect(role);
    } else {
      handleSignupRoleSelect(role);
    }
  };

  const handleOverlayCancel = () => {
    if (overlayBusy || loading) return;
    setShowRoleOverlay(false);
    pendingAccessTokenRef.current = null;
    pendingSignupRoleRef.current = null;
  };

  const resolvedLabel =
    label || (mode === 'signup' ? t('authSocial.googleSignup') : t('authSocial.googleLogin'));

  return (
    <div>
      <button
        type="button"
        className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 transition-colors"
        onClick={handleClick}
        disabled={loading || overlayBusy}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {loading ? t('authSocial.signingIn') : resolvedLabel}
      </button>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {showRoleOverlay && (
        <SocialRoleOverlay
          busy={overlayBusy || loading}
          onSelect={handleOverlaySelect}
          onCancel={handleOverlayCancel}
        />
      )}
    </div>
  );
}
