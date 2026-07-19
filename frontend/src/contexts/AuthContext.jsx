import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('splitroom_token');
    if (token) {
      authAPI
        .getProfile()
        .then((res) => setUser(res.data.user))
        .catch(() => localStorage.removeItem('splitroom_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('splitroom_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (name, email, password, phone) => {
    const res = await authAPI.register({ name, email, password, phone });
    localStorage.setItem('splitroom_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('splitroom_token');
    setUser(null);
  };

  const updateUser = (updates) =>
    setUser((prev) => ({ ...prev, ...updates }));

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
