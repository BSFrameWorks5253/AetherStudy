import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, SUPER_ADMIN_EMAIL } from '../types/auth';
import { api } from '../services/api';

export interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  canUpload: boolean;
  login: (email: string) => Promise<UserProfile>;
  sendOtp: (email: string) => Promise<{ token: string; maskedEmail: string }>;
  verifyOtp: (email: string, otp: string, token: string) => Promise<UserProfile>;
  logout: () => void;
  usersList: UserProfile[];
  updateUserRole: (targetEmail: string, newRole: UserRole) => Promise<boolean>;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('aetherstudy_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [usersList, setUsersList] = useState<UserProfile[]>([]);

  const isSuperAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    Boolean(SUPER_ADMIN_EMAIL && currentUser?.email.toLowerCase() === SUPER_ADMIN_EMAIL);
  const isAdmin = currentUser?.role === 'ADMIN' || isSuperAdmin;
  const canUpload = isAdmin;

  const sendOtp = async (email: string) => {
    const res = await api.generateOtp(email);
    return { token: res.token, maskedEmail: res.maskedEmail };
  };

  const verifyOtp = async (email: string, otp: string, token: string): Promise<UserProfile> => {
    const res = await api.verifyOtp(email, otp, token);
    setCurrentUser(res.user);
    localStorage.setItem('aetherstudy_user', JSON.stringify(res.user));
    return res.user;
  };

  const login = async (email: string): Promise<UserProfile> => {
    const profile = await api.login(email);
    setCurrentUser(profile);
    localStorage.setItem('aetherstudy_user', JSON.stringify(profile));
    return profile;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('aetherstudy_user');
  };

  const refreshUsers = async () => {
    if (isSuperAdmin) {
      try {
        const users = await api.getUsers();
        setUsersList(users);
      } catch (err) {
        console.warn('Could not fetch user list', err);
      }
    }
  };

  const updateUserRole = async (targetEmail: string, newRole: UserRole): Promise<boolean> => {
    if (!currentUser || !isSuperAdmin) return false;
    try {
      const res = await api.updateUserRole(currentUser.email, targetEmail, newRole);
      if (res.success) {
        setUsersList((prev) =>
          prev.map((u) => (u.email.toLowerCase() === targetEmail.toLowerCase() ? { ...u, role: newRole } : u))
        );
        return true;
      }
      return false;
    } catch (err) {
      alert((err as Error).message || 'Failed to update user role');
      return false;
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      refreshUsers();
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isSuperAdmin,
        isAdmin,
        canUpload,
        login,
        sendOtp,
        verifyOtp,
        logout,
        usersList,
        updateUserRole,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
