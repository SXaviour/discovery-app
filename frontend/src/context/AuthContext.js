// Keeps track of who is logged in and makes that info available to every page in the app

import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // user = the logged-in user's info, or null if nobody is logged in
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // When the app first opens, check if the user already has an active session from a previous visit
  useEffect(() => {
    api.get('/auth/me')
      .then(response => setUser(response.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Auth functions — called from the login, register, and logout pages
  const login = async (email, password, rememberMe = false) => {
    const response = await api.post('/auth/login', { email, password, rememberMe });
    setUser(response.data.user);
    return response.data;
  };

  const register = async (email, password, username) => {
    const response = await api.post('/auth/register', { email, password, username });
    setUser(response.data.user);
    return response.data;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  // Re-fetches the user from the server — used after profile updates like username changes
  const refreshUser = async () => {
    const response = await api.get('/auth/me');
    setUser(response.data.user);
  };

  // Don't show any page until we've finished checking the session
  // This stops pages from briefly showing the wrong content on load
  if (loading) return null;

  return (
    <AuthContext.Provider value={{ user, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// Shortcut hook — lets any page access auth with: const { user } = useAuth()
export function useAuth() {
  return useContext(AuthContext);
}
