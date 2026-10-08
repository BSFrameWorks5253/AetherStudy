import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SUPER_ADMIN_EMAIL } from '../../types/auth';
import {
  ShieldCheck,
  Mail,
  KeyRound,
  LogOut,
  Check,
  X,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Lock,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  isGuardMode?: boolean; // When true, exclusively guards the screen until authenticated
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  isGuardMode = false,
}) => {
  const {
    currentUser,
    isAuthenticated,
    isSuperAdmin,
    sendOtp,
    verifyOtp,
    logout,
    usersList,
    updateUserRole,
  } = useAuth();

  // Authentication Flow State: 'email' (Step A) | 'otp' (Step B) | 'account' | 'manage'
  const [authStep, setAuthStep] = useState<'email' | 'otp' | 'account' | 'manage'>('email');
  const [emailInput, setEmailInput] = useState<string>('');
  const [otpInput, setOtpInput] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen && !isGuardMode) return null;
  if (isGuardMode && isAuthenticated) return null;

  // Step A: Request 6-digit OTP code from server
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await sendOtp(emailInput.trim());
      setToken(res.token);
      setMaskedEmail(res.maskedEmail);
      setAuthStep('otp');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step B: Submit 6-digit OTP for server validation
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim() || !token) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      await verifyOtp(emailInput.trim(), otpInput.trim(), token);
      setOtpInput('');
      if (onClose) onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await sendOtp(emailInput.trim());
      setToken(res.token);
      setOtpInput('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Resend failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isGuardMode
          ? 'bg-slate-950/90 backdrop-blur-2xl'
          : 'bg-black/60 backdrop-blur-md animate-fade-in'
      }`}
    >
      <div className="w-full max-w-md liquid-glass rounded-3xl p-6 md:p-8 shadow-2xl text-slate-100 border border-white/70 dark:border-white/10 relative">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-none">
                {isAuthenticated ? 'Security & Identity' : 'Identity Verification'}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                Server-Side Cryptographic OTP Engine
              </p>
            </div>
          </div>

          {!isGuardMode && onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error notification banner */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold animate-fade-in">
            {errorMessage}
          </div>
        )}

        {/* ---------------- STEP A: REQUEST EMAIL ---------------- */}
        {!isAuthenticated && authStep === 'email' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Enter your email address to receive a secure, server-generated single-use verification passcode.
            </p>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                Authorized Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="name@university.edu"
                  className="w-full liquid-glass-subtle rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div className="p-3 rounded-2xl liquid-glass-subtle text-[11px] space-y-1 text-slate-500 dark:text-slate-400">
              <div className="font-bold text-slate-700 dark:text-slate-200">Security Architecture:</div>
              <div>• OTP is generated strictly within the serverless environment.</div>
              <div>• Zero passwords stored; tokens are signed using HMAC-SHA256.</div>
              <div>• Owner privileges automatically bind to the authorized Super Admin account.</div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/30 glass-pill flex items-center justify-center space-x-1.5"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Code...</span>
                </>
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ---------------- STEP B: 6-DIGIT OTP INPUT ---------------- */}
        {!isAuthenticated && authStep === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-4 animate-fade-in">
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-500 flex items-center justify-center mx-auto mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Enter 6-Digit Passcode</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Dispatched to <strong className="text-slate-700 dark:text-slate-200">{maskedEmail || emailInput}</strong>
              </p>
            </div>

            <div>
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="••••••"
                className="w-full liquid-glass-subtle rounded-2xl p-3 text-center text-2xl font-mono font-black tracking-[8px] focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white"
                required
                autoFocus
              />
              <p className="text-[10px] text-center text-slate-500 mt-1.5">
                Valid for 10 minutes. Cryptographically checked on server.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || otpInput.length < 6}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/30 glass-pill flex items-center justify-center space-x-1.5"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Code on Server...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Verify Passcode & Enter</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setAuthStep('email')}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 font-semibold"
              >
                <ArrowLeft className="w-3 h-3" /> Change Email
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading}
                className="text-brand-600 dark:text-brand-400 hover:underline font-semibold"
              >
                Resend Code
              </button>
            </div>
          </form>
        )}

        {/* ---------------- ALREADY AUTHENTICATED: PROFILE / USER ROLES ---------------- */}
        {isAuthenticated && currentUser && (
          <div className="space-y-4">
            {isSuperAdmin && (
              <div className="flex space-x-1 p-1 liquid-glass-subtle rounded-xl mb-3">
                <button
                  onClick={() => setAuthStep('account')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    authStep === 'account' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500'
                  }`}
                >
                  My Account
                </button>
                <button
                  onClick={() => setAuthStep('manage')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    authStep === 'manage' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-500'
                  }`}
                >
                  User RBAC ({usersList.length})
                </button>
              </div>
            )}

            {authStep !== 'manage' ? (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl liquid-glass-subtle border border-white/50 dark:border-white/10 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500">Authenticated Identity:</div>
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
                          : 'bg-slate-500/20 text-slate-500 border-slate-500/40'
                      }`}
                    >
                      Role: {currentUser.role}
                    </span>
                    {currentUser.role !== 'USER' && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Upload Privileges Granted
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
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl glass-pill"
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Super Admin RBAC panel */
              <div className="space-y-3">
                <p className="text-[11px] text-slate-500">
                  Grant or revoke Admin upload access for registered student accounts:
                </p>
                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {usersList.map((u) => {
                    const isSuper =
                      u.role === 'SUPER_ADMIN' ||
                      (Boolean(SUPER_ADMIN_EMAIL) && u.email.toLowerCase() === SUPER_ADMIN_EMAIL);

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
                            {isSuper ? 'Primary Owner' : `Role: ${u.role}`}
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
                {onClose && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={onClose}
                      className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl glass-pill"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
