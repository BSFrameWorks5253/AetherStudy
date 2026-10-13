import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole, AuthContextType } from '../types/auth';
import { api, setAuthToken } from '../services/api';
import { firebaseUsers } from '../services/firebase';
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

  const [usersList, setUsersList] = useState<UserProfile[]>(() => {
    const defaultOwner: UserProfile = {
      email: 'bs.framework5253@gmail.com',
      role: 'SUPER_ADMIN',
      name: 'Burhanuddin Sounasath (Super Admin)',
      standard: 'ALL',
      status: 'active',
      lastLogin: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    try {
      const cached = localStorage.getItem('aether_cached_users');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const map = new Map<string, UserProfile>();
          parsed.forEach((u) => {
            if (u && u.email) map.set(u.email.toLowerCase().trim(), u);
          });
          map.set('bs.framework5253@gmail.com', defaultOwner);
          return Array.from(map.values());
        }
      }
    } catch {}
    return [defaultOwner];
  });

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
    setAuthToken(null);
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
        if (Array.isArray(users) && users.length > 0) {
          setUsersList(users);
        }
      } catch (err) {
        console.warn('Could not fetch user list', err);
      }
    }
  };

  const updateUserRole = async (targetEmail: string, newRole: UserRole, standard?: string): Promise<boolean> => {
    if (!currentUser || !isSuperAdmin) return false;
    const cleanEmail = targetEmail.trim().toLowerCase();

    // 1. Instant optimistic state update
    setUsersList((prev) =>
      prev.map((u) => (u.email.toLowerCase() === cleanEmail ? { ...u, role: newRole, ...(standard ? { standard } : {}) } : u))
    );

    try {
      const res = await api.updateUserRole(currentUser.email, cleanEmail, newRole, standard);
      if (res && res.updatedUser) {
        setUsersList((prev) =>
          prev.map((u) => (u.email.toLowerCase() === cleanEmail ? { ...u, ...res.updatedUser } : u))
        );
      }
      return true;
    } catch (err) {
      console.warn('Failed to update user role:', err);
      return true;
    }
  };

  const addAdminUser = async (email: string, role: UserRole = 'ADMIN', standard?: string): Promise<boolean> => {
    if (!currentUser || !isSuperAdmin) return false;
    const cleanEmail = email.trim().toLowerCase();
    const now = new Date().toISOString();

    // 1. Instant optimistic state update in UI
    setUsersList((prev) => {
      const map = new Map<string, UserProfile>();
      prev.forEach((u) => {
        if (u && u.email) map.set(u.email.toLowerCase().trim(), u);
      });
      const existing = map.get(cleanEmail);
      map.set(cleanEmail, {
        ...(existing || {}),
        email: cleanEmail,
        role,
        standard: standard || existing?.standard || '12',
        lastLogin: existing?.lastLogin || now,
        lastActive: now,
        status: 'active',
      });
      return Array.from(map.values());
    });

    try {
      const res = await api.addAdminUser(currentUser.email, cleanEmail, role, standard);
      if (res && res.success && Array.isArray(res.users)) {
        setUsersList((prev) => {
          const map = new Map<string, UserProfile>();
          prev.forEach((u) => {
            if (u && u.email) map.set(u.email.toLowerCase().trim(), u);
          });
          res.users.forEach((u) => {
            if (u && u.email) {
              const k = u.email.toLowerCase().trim();
              const existing = map.get(k);
              map.set(k, { ...(existing || {}), ...u });
            }
          });
          return Array.from(map.values());
        });
      }
      return true;
    } catch (err) {
      console.warn('Failed to add user remotely:', err);
      return true;
    }
  };

  // Proactively record active session to Firebase Realtime Database
  useEffect(() => {
    if (currentUser?.email) {
      firebaseUsers.recordUser(currentUser).catch(() => {});
    }
  }, [currentUser]);

  // Live real-time synchronizer strictly for Super Admin to monitor registered students & active users
  useEffect(() => {
    if (!isSuperAdmin) {
      setUsersList([]);
      return;
    }
    refreshUsers();
    const unsub = firebaseUsers.subscribe((cloudUsers) => {
      if (Array.isArray(cloudUsers) && cloudUsers.length > 0) {
        setUsersList((prev) => {
          const map = new Map<string, UserProfile>();
          cloudUsers.forEach((u) => {
            if (u && u.email) map.set(u.email.toLowerCase(), u);
          });
          prev.forEach((u) => {
            if (u && u.email && !map.has(u.email.toLowerCase())) {
              map.set(u.email.toLowerCase(), u);
            }
          });
          return Array.from(map.values());
        });
      }
    });
    return () => unsub();
  }, [isSuperAdmin, currentUser?.email]);

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
