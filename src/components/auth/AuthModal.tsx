import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SUPER_ADMIN_EMAIL } from '../../types/auth';
import { ShieldCheck, Mail, LogOut, Check, X } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    isAuthenticated,
    isSuperAdmin,
    login,
    logout,
    usersList,
    updateUserRole,
  } = useAuth();

  const [emailInput, setEmailInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'account' | 'manage'>('account');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    try {
      setIsLoading(true);
      await login(emailInput.trim());
      setEmailInput('');
    } catch (err) {
      alert((err as Error).message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md liquid-glass rounded-3xl p-6 shadow-2xl text-slate-800 dark:text-slate-100 border border-white/70 dark:border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10 mb-4">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-brand-500" />
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Passwordless Email Sign-In
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* If user is super admin, show tab switcher to manage users */}
        {isAuthenticated && isSuperAdmin && (
          <div className="flex space-x-1 p-1 liquid-glass-subtle rounded-xl mb-4">
            <button
              onClick={() => setActiveTab('account')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'account' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              My Account
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'manage' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500'
              }`}
            >
              Manage Users ({usersList.length})
            </button>
          </div>
        )}

        {/* Not authenticated: Sign In Form */}
        {!isAuthenticated ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Enter your email address to sign in immediately. Zero password friction.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                Your Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@university.edu"
                  className="w-full liquid-glass-subtle rounded-xl pl-9 pr-3 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl liquid-glass-subtle text-[11px] space-y-1 text-slate-500 dark:text-slate-400">
              <div className="font-bold text-slate-700 dark:text-slate-200">Access Roles & Rules:</div>
              <div>• <strong>{SUPER_ADMIN_EMAIL}</strong> has Super Admin rights.</div>
              <div>• Normal users have complete access to read & solve tests.</div>
              <div>• Uploading documents & test papers requires Admin access.</div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/30 glass-pill"
            >
              {isLoading ? 'Signing In...' : 'Instant Email Sign-In'}
            </button>
          </form>
        ) : activeTab === 'account' && currentUser ? (
          /* User Profile View */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl liquid-glass-subtle border border-white/50 dark:border-white/10 space-y-2">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Signed In As:</div>
              <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                {currentUser.email}
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    currentUser.role === 'SUPER_ADMIN'
                      ? 'bg-purple-500/20 text-purple-600 dark:text-purple-300 border-purple-500/40'
                      : currentUser.role === 'ADMIN'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/40'
                  }`}
                >
                  Role: {currentUser.role}
                </span>

                {currentUser.role !== 'USER' ? (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Uploads Allowed
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400 font-medium">
                    (Viewer Mode)
                  </span>
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={logout}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl liquid-glass-subtle text-xs font-bold text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>

              <button
                onClick={onClose}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl glass-pill"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Super Admin User Role Manager */
          <div className="space-y-3">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              As the owner (<code>{SUPER_ADMIN_EMAIL}</code>), you can grant or revoke Admin permissions for any user below:
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {usersList.map((u) => {
                const isSuper = u.email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

                return (
                  <div
                    key={u.email}
                    className="p-3 rounded-xl liquid-glass-subtle flex items-center justify-between text-xs"
                  >
                    <div className="truncate mr-2">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {u.email}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {isSuper ? 'Primary Owner' : `Current Role: ${u.role}`}
                      </div>
                    </div>

                    {!isSuper ? (
                      <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => updateUserRole(u.email, 'ADMIN')}
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                            u.role === 'ADMIN'
                              ? 'bg-emerald-600 text-white'
                              : 'liquid-glass hover:bg-emerald-500/20 text-slate-500'
                          }`}
                        >
                          Admin
                        </button>
                        <button
                          onClick={() => updateUserRole(u.email, 'USER')}
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                            u.role === 'USER'
                              ? 'bg-slate-700 text-white'
                              : 'liquid-glass hover:bg-slate-500/20 text-slate-500'
                          }`}
                        >
                          User
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] font-black uppercase text-purple-500">
                        Owner
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl glass-pill"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
