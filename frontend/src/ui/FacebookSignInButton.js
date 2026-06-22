import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../store/AuthContext';
import SocialRoleOverlay from './SocialRoleOverlay';
import { FACEBOOK_APP_ID } from '../config';

let fbSdkPromise = null;

function ensureFacebookSdk(appId) {
  if (window.FB) return Promise.resolve();
  if (!fbSdkPromise) {
    fbSdkPromise = new Promise((resolve, reject) => {
      window.fbAsyncInit = () => {
        try {
          window.FB.init({
            appId,
            cookie: true,
            xfbml: true,
            version: 'v21.0',
          });
          resolve();
        } catch (e) {
          reject(e);
        }
      };
      const s = document.createElement('script');
      s.src = 'https://connect.facebook.net/en_US/sdk.js';
      s.async = true;
      s.defer = true;
      s.crossOrigin = 'anonymous';
      s.onerror = () => reject(new Error('Failed to load Facebook SDK'));
      document.head.appendChild(s);
    });
  }
  return fbSdkPromise;
}

function isRoleRequiredError(err) {
  return err?.status === 409 && (err?.code === 'ROLE_REQUIRED' || err?.data?.code === 'ROLE_REQUIRED');
}

export default function FacebookSignInButton({ mode = 'login', label }) {
  const { loginWithFacebookAccessToken } = useAuth();
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
    const result = await loginWithFacebookAccessToken(accessToken, role);
    finishSignIn(result.user);
  };

  const handleFacebookResponseAsync = async (response) => {
    try {
      if (response.status !== 'connected' || !response.authResponse?.accessToken) {
        return;
      }
      const accessToken = response.authResponse.accessToken;
      const roleForRequest = pendingSignupRoleRef.current || undefined;
      try {
        await exchangeToken(accessToken, roleForRequest);
      } catch (err) {
        if (isRoleRequiredError(err)) {
          pendingAccessTokenRef.current = accessToken;
          setShowRoleOverlay(true);
          return;
        }
        setError(err instanceof Error ? err.message : 'Facebook sign-in failed');
      }
    } finally {
      setLoading(false);
      pendingSignupRoleRef.current = null;
    }
  };

  const runFacebookOAuth = (signupRole) => {
    if (!FACEBOOK_APP_ID) {
      setError('Facebook App ID is not configured.');
      return;
    }
    setLoading(true);
    setError(null);
    pendingSignupRoleRef.current = signupRole ?? null;

    void ensureFacebookSdk(FACEBOOK_APP_ID)
      .then(() => {
        window.FB.login(
          (response) => {
            void handleFacebookResponseAsync(response);
          },
          { scope: 'email,public_profile' }
        );
      })
      .catch((err) => {
        setLoading(false);
        pendingSignupRoleRef.current = null;
        setError(err instanceof Error ? err.message : 'Facebook sign-in failed');
      });
  };

  const handleClick = () => {
    if (mode === 'signup') {
      setShowRoleOverlay(true);
      return;
    }
    runFacebookOAuth();
  };

  const handleSignupRoleSelect = (role) => {
    setShowRoleOverlay(false);
    runFacebookOAuth(role);
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
      setError(err instanceof Error ? err.message : 'Facebook sign-in failed');
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
    label || (mode === 'signup' ? t('authSocial.facebookSignup') : t('authSocial.facebookLogin'));

  return (
    <div>
      <button
        type="button"
        className="w-full bg-white border border-gray-300 text-gray-700 rounded-lg px-3 py-2.5 flex items-center justify-center gap-2 text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F97316]/40 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
        onClick={handleClick}
        disabled={loading || overlayBusy}
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#1877F2"
            d="M22.675 0h-21.35C.597 0 0 .597 0 1.326v21.348C0 23.402.597 24 1.326 24h11.494v-9.294H9.691v-3.622h3.129V8.41c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.794.143v3.24l-1.918.001c-1.504 0-1.796.715-1.796 1.763v2.312h3.587l-.467 3.622h-3.12V24h6.116C23.403 24 24 23.402 24 22.674V1.326C24 .597 23.403 0 22.675 0z"
          />
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
