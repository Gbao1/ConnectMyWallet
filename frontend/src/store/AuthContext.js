import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, setStoredToken, getStoredToken } from '../api/client';
import { assertRecaptchaBeforeAuth, getRecaptchaToken } from '../utils/recaptcha';
import { syncDeviceFingerprint } from '../utils/deviceFingerprint';

const AuthContext = createContext({
  user: null,
  initializing: true,
  login: async () => {},
  register: async () => {},
  loginWithGoogleAccessToken: async () => {},
  loginWithFacebookAccessToken: async () => {},
  completeRoleSelection: async () => {},
  updateProfile: async () => {},
  resendVerification: async () => {},
  resendVerificationByEmail: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getStoredToken()) {
        setInitializing(false);
        return;
      }
      try {
        const { user: u } = await api('/api/auth/me');
        if (!cancelled) setUser(u);
      } catch {
        setStoredToken(null);
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const register = useCallback(async (payload) => {
    await assertRecaptchaBeforeAuth('register');
    const {
      firstName,
      lastName,
      preferredName,
      email,
      password,
      role = 'user',
      skills,
    } = payload;
    const recaptchaToken = await getRecaptchaToken('register');
    const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
    return api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: fullName,
        firstName,
        lastName,
        preferredName,
        email,
        password,
        role,
        skills,
        ...(recaptchaToken ? { recaptchaToken } : {}),
      }),
    });
  }, []);

  const hydrateUser = useCallback(async () => {
    const { user: u } = await api('/api/auth/me');
    setUser(u);
    return u;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    await assertRecaptchaBeforeAuth('login');
    const recaptchaToken = await getRecaptchaToken('login');
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        ...(recaptchaToken ? { recaptchaToken } : {}),
      }),
    });
    setStoredToken(data.token);
    const user = await hydrateUser();
    await syncDeviceFingerprint();
    return { user };
  }, [hydrateUser]);

  const loginWithGoogleAccessToken = useCallback(async (accessToken, role) => {
    const data = await api('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({
        accessToken,
        ...(role ? { role } : {}),
      }),
    });
    setStoredToken(data.token);
    const user = await hydrateUser();
    await syncDeviceFingerprint();
    const needsRole = Boolean(data.needsRole);
    return { user, isNewUser: needsRole };
  }, [hydrateUser]);

  const loginWithFacebookAccessToken = useCallback(async (accessToken, role) => {
    const data = await api('/api/auth/facebook', {
      method: 'POST',
      body: JSON.stringify({
        accessToken,
        ...(role ? { role } : {}),
      }),
    });
    setStoredToken(data.token);
    const user = await hydrateUser();
    await syncDeviceFingerprint();
    const needsRole = Boolean(data.needsRole);
    return { user, isNewUser: needsRole };
  }, [hydrateUser]);

  const resendVerificationByEmail = useCallback(async (email) => {
    return api('/api/auth/resend-verification-email', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }, []);

  const resendVerification = useCallback(async () => {
    return api('/api/auth/resend-verification', { method: 'POST', body: '{}' });
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  const completeRoleSelection = useCallback(async (role) => {
    const data = await api('/api/auth/role', {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
    setUser(data.user);
    return data.user;
  }, []);

  const updateProfile = useCallback(
    async (updates = {}) => {
      if (!user?.id) throw new Error('No authenticated user');
      const data = await api('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      setUser(data.user);
      return data.user;
    },
    [user?.id]
  );

  const value = useMemo(
    () => ({
      user,
      initializing,
      login,
      register,
      loginWithGoogleAccessToken,
      loginWithFacebookAccessToken,
      completeRoleSelection,
      updateProfile,
      resendVerification,
      resendVerificationByEmail,
      logout,
    }),
    [
      user,
      initializing,
      login,
      register,
      loginWithGoogleAccessToken,
      loginWithFacebookAccessToken,
      completeRoleSelection,
      updateProfile,
      resendVerification,
      resendVerificationByEmail,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
