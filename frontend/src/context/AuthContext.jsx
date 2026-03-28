import { createContext, useContext, useState, useCallback } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext(null);

function parseToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem('token');
    return t ? parseToken(t) : null;
  });

  const persist = useCallback((jwt) => {
    localStorage.setItem('token', jwt);
    setToken(jwt);
    setUser(parseToken(jwt));
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await apiClient.post('/auth/register', { name, email, password });
    persist(data.data.token);
  }, [persist]);

  const login = useCallback(async (email, password) => {
    const { data } = await apiClient.post('/auth/login', { email, password });
    persist(data.data.token);
  }, [persist]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
