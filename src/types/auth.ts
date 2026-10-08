export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export interface UserProfile {
  email: string;
  role: UserRole;
  lastLogin: string;
}

export interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  canUpload: boolean;
  login: (email: string) => Promise<UserProfile>;
  logout: () => void;
  usersList: UserProfile[];
  updateUserRole: (targetEmail: string, newRole: UserRole) => Promise<boolean>;
  refreshUsers: () => Promise<void>;
}
