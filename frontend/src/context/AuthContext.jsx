import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { fetchCsrfToken, resetCsrfToken } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimer, setSessionTimer] = useState(600);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {
      // Ignore network/session errors during local logout.
    }

    resetCsrfToken();
    await fetchCsrfToken(true);
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        await fetchCsrfToken(true);
        const { data } = await api.get('/auth/me');
        if (!cancelled) {
          setUser(data.user);
        }
      } catch (error) {
        if (!cancelled && error.response?.status !== 401) {
          console.error('Failed to restore session', error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    setSessionTimer(600);

    const interval = setInterval(() => {
      setSessionTimer((previous) => {
        if (previous <= 1) {
          logout();
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [user, logout]);

  const login = async (accountNumber, password) => {
    const { data } = await api.post('/auth/login', { accountNumber, password });
    return data;
  };

  const verifyTotp = async (preAuthToken, token) => {
    const { data } = await api.post('/auth/verify-totp', { preAuthToken, token });
    setUser(data.user);
    return data;
  };

  const confirmTotpSetup = async (preAuthToken, token) => {
    const { data } = await api.post('/auth/setup-totp/confirm', { preAuthToken, token });
    setUser(data.user);
    return data;
  };

  const refreshCurrentUser = useCallback(async () => {
    const { data } = await api.get('/auth/me');
    setUser(data.user);
    return data.user;
  }, []);

  const formatSessionTime = () => {
    const minutes = Math.floor(sessionTimer / 60);
    const seconds = sessionTimer % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        verifyTotp,
        confirmTotpSetup,
        logout,
        refreshCurrentUser,
        sessionTimer,
        formatSessionTime,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
