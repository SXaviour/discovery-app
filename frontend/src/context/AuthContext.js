import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // When the app first loads, check if the user is already logged in
  // (their session might still be active from a previous visit)
  useEffect(() => {
    api.get('/auth/me')
      .then(response => setUser(response.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Login function
  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    setUser(response.data.user);
    return response.data;
  };

  // Register function
  const register = async (email, password, username) => {
    const response = await api.post('/auth/register', { email, password, username });
    setUser(response.data.user);
    return response.data;
  };

  // Logout function
  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  // Don't render anything until we know whether the user is logged in or not
  // This prevents pages from briefly showing the wrong content on load
  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Shortcut so any page can just write: const { user } = useAuth()
export function useAuth() {
  return useContext(AuthContext);
}
