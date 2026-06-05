import React, { createContext, useContext, useState } from 'react';
import { authService } from '../services/apiService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse user from localStorage', e);
        return null;
      }
    }
    return null;
  });

  const login = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUserState(userData);
  };

  const logout = () => {
    authService.logout();
    setUserState(null);
  };

  const updateUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUserState(userData);
  };

  const isLoggedIn = !!user;

  return (
    <AuthContext.Provider value={{ user, isLoggedIn, login, logout, updateUser, setUser: updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
