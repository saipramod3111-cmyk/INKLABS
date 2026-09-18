import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const d = await api.post('/api/auth/login', { email, password });
    setUser(d.user);
    return d.user;
  };

  const signup = async (name, email, password) => {
    const d = await api.post('/api/auth/signup', { name, email, password });
    setUser(d.user);
    return d.user;
  };

  const logout = async () => {
    await api.post('/api/auth/logout');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
