import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, AuthContextType } from '../types/auth';
import { api } from '../services/api';
import { AuthModal } from '../components/auth/AuthModal';

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

  const [activeStandard, setActiveStandardState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('aetherstudy_user');
      if (saved) {
        const u = JSON.parse(saved);
        if (u.standard && u.standard !== 'ALL') return u.standard;
      }
      return localStorage.getItem('aetherstudy_active_standard') || '12';
    } catch {
      return '12';
    }
  });

  const setActiveStandard = (std: string) => {
    setActiveStandardState(std);
    localStorage.setItem('aetherstudy_active_standard', std);
  };

  useEffect(() => {
    if (currentUser?.standard && currentUser.standard !== 'ALL') {
      setActiveStandardState(currentUser.standard);
    }
  }, [currentUser]);

  const isSuperAdmin =
    currentUser?.role === 'SUPER_ADMIN' ||
    currentUser?.email?.trim().toLowerCase() === 'bs.framework5253@gmail.com';
  const isAdmin = currentUser?.role === 'ADMIN' || isSuperAdmin;
  const canUpload = isAdmin; // Super Admin AND Admin can upload! Regular students/users cannot upload.

  const sendOtp = async (email: string) => {
    const res = await api.generateOtp(email);
    return {
      token: res.token,
      maskedEmail: res.maskedEmail,
      devPasscode: res.devPasscode,
      sandboxNotice: res.sandboxNotice,
    };
  };

  const verifyOtp = async (email: string, otp: string, token: string, standard?: string): Promise<UserProfile> => {
    const res = await api.verifyOtp(email, otp, token, standard);
    setCurrentUser(res.user);
    if (res.user.standard && res.user.standard !== 'ALL') {
      setActiveStandard(res.user.standard);
    } else if (standard && standard !== 'ALL') {
      setActiveStandard(standard);
    }
    localStorage.setItem('aetherstudy_user', JSON.stringify(res.user));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aetherstudy_user_change', { detail: { user: res.user } }));
    }
    return res.user;
  };

  const login = async (email: string): Promise<UserProfile> => {
    const profile = await api.login(email);
    setCurrentUser(profile);
    localStorage.setItem('aetherstudy_user', JSON.stringify(profile));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aetherstudy_user_change', { detail: { user: profile } }));
    }
    return profile;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('aetherstudy_user');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aetherstudy_user_change', { detail: { user: null } }));
    }
  };

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

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

  const updateUserRole = async (targetEmail: string, newRole: UserRole, standard?: string): Promise<boolean> => {
    if (!currentUser || !isSuperAdmin) return false;
    try {
      const res = await api.updateUserRole(currentUser.email, targetEmail, newRole);
      if (res.success) {
        setUsersList((prev) =>
          prev.map((u) => (u.email.toLowerCase() === targetEmail.toLowerCase() ? { ...u, role: newRole, ...(standard ? { standard } : {}) } : u))
        );
        return true;
      }
      return false;
    } catch (err) {
      alert((err as Error).message || 'Failed to update user role');
      return false;
    }
  };

  const addAdminUser = async (email: string, role: UserRole = 'ADMIN', standard?: string): Promise<boolean> => {
    if (!currentUser || !isSuperAdmin) return false;
    try {
      const res = await api.addAdminUser(currentUser.email, email, role);
      if (res.success) {
        setUsersList(
          res.users.map((u) => (u.email.toLowerCase() === email.toLowerCase() && standard ? { ...u, standard } : u))
        );
        return true;
      }
      return false;
    } catch (err) {
      alert((err as Error).message || 'Failed to add administrator');
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
        activeStandard,
        setActiveStandard,
        login,
        sendOtp,
        verifyOtp,
        logout,
        usersList,
        updateUserRole,
        addAdminUser,
        refreshUsers,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
      {/* Global Auth Modal rendered directly so any component can trigger it */}
      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
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
