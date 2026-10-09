export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export interface UserProfile {
  email: string;
  role: UserRole;
  standard?: string; // '10' | '12' | '9' | '11' | 'ALL'
  lastLogin: string;
}

export interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  canUpload: boolean;
  activeStandard: string;
  setActiveStandard: (standard: string) => void;
  login: (email: string) => Promise<UserProfile>;
  sendOtp: (email: string, standard?: string) => Promise<{ token: string; maskedEmail: string; devPasscode?: string; sandboxNotice?: string }>;
  verifyOtp: (email: string, otp: string, token: string, standard?: string) => Promise<UserProfile>;
  logout: () => void;
  usersList: UserProfile[];
  updateUserRole: (targetEmail: string, newRole: UserRole, standard?: string) => Promise<boolean>;
  addAdminUser: (email: string, role?: UserRole, standard?: string) => Promise<boolean>;
  refreshUsers: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}
