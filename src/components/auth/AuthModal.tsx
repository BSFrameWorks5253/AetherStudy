import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  Mail,
  KeyRound,
  LogOut,
  Check,
  X,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  Lock,
  UserPlus,
  Shield,
  AlertCircle,
  Sparkles,
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
    addAdminUser,
  } = useAuth();

  // Authentication Flow State: 'email' (Step A) | 'otp' (Step B) | 'account' | 'manage'
  const [authStep, setAuthStep] = useState<'email' | 'otp' | 'account' | 'manage'>('email');
  const [emailInput, setEmailInput] = useState<string>('');
  const [otpInput, setOtpInput] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [maskedEmail, setMaskedEmail] = useState<string>('');
  const [devPasscode, setDevPasscode] = useState<string | null>(null);
  const [sandboxNotice, setSandboxNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Admin Management State
  const [newAdminEmail, setNewAdminEmail] = useState<string>('');
  const [isAddingAdmin, setIsAddingAdmin] = useState<boolean>(false);
  const [adminSuccessMsg, setAdminSuccessMsg] = useState<string | null>(null);

  // Academic Standard State (Default HSC Standard 12)
  const selectedStandard = '12';
  const SUPER_ADMIN_EMAIL = 'bs.framework5253@gmail.com';
  const isSuperAdminEmail = emailInput.trim().toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();

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
      if (res.devPasscode) setDevPasscode(res.devPasscode);
      if (res.sandboxNotice) setSandboxNotice(res.sandboxNotice);
      setAuthStep('otp');
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to send verification code. Please check your network.');
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
      await verifyOtp(emailInput.trim(), otpInput.trim(), token, isSuperAdminEmail ? 'ALL' : selectedStandard);
      setOtpInput('');
      setDevPasscode(null);
      setSandboxNotice(null);
      if (onClose) onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired passcode. Please try again.');
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
      if (res.devPasscode) setDevPasscode(res.devPasscode);
      if (res.sandboxNotice) setSandboxNotice(res.sandboxNotice);
    } catch (err: any) {
      setErrorMessage(err.message || 'Resend failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !addAdminUser) return;

    try {
      setIsAddingAdmin(true);
      setAdminSuccessMsg(null);
      const ok = await addAdminUser(newAdminEmail.trim(), 'ADMIN');
      if (ok) {
        setAdminSuccessMsg(`Successfully granted Admin upload permissions to ${newAdminEmail.trim()}`);
        setNewAdminEmail('');
        setTimeout(() => setAdminSuccessMsg(null), 4000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add administrator.');
    } finally {
      setIsAddingAdmin(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isGuardMode
          ? 'bg-slate-950/85 backdrop-blur-md'
          : 'bg-black/60 backdrop-blur-sm animate-fade-in'
      }`}
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 relative transition-all">
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {isAuthenticated ? 'Account & Permissions' : 'AetherStudy Student Portal'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {isAuthenticated ? 'Manage roles and upload access' : 'Passwordless secure student & faculty sign in'}
              </p>
            </div>
          </div>

          {!isGuardMode && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ---------------- STEP A: REQUEST EMAIL ---------------- */}
        {!isAuthenticated && authStep === 'email' && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Enter your email address to receive your 6-digit login passcode. No password needed.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="student@example.com"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  required
                  autoFocus
                />
              </div>
            </div>



            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] space-y-1 text-slate-500 dark:text-slate-400">
              <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-brand-500" />
                <span>Zero-Hassle Verification:</span>
              </div>
              <div>• Single-use 6-digit passcode sent directly to your inbox.</div>
              <div>• Instant access for students, teachers, and admins.</div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !emailInput.trim()}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/20 flex items-center justify-center space-x-1.5 transition-all"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Passcode...</span>
                </>
              ) : (
                <>
                  <span>Send Login Passcode</span>
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
              <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center mx-auto mb-2 border border-brand-100 dark:border-brand-900">
                <KeyRound className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Enter Your 6-Digit Passcode</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Sent to <strong className="text-slate-800 dark:text-slate-200">{maskedEmail || emailInput}</strong>
              </p>
              {!isSuperAdminEmail && (
                <div className="inline-block mt-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  Enrolled in: Standard {selectedStandard}
                </div>
              )}
            </div>

            {/* Sandbox / Testing Notice Banner (Displays passcode if test environment limits email) */}
            {devPasscode && (
              <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Instant Login Passcode:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setOtpInput(devPasscode)}
                    className="font-mono text-base font-black tracking-widest px-2.5 py-0.5 rounded-lg bg-amber-200/80 hover:bg-amber-300 dark:bg-amber-900/80 dark:hover:bg-amber-800 text-amber-950 dark:text-amber-100 border border-amber-300 dark:border-amber-700 transition-colors cursor-pointer"
                    title="Click to auto-fill passcode"
                  >
                    {devPasscode} (Fill)
                  </button>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                  {sandboxNotice || "Note: Free email sandbox is active. You can click the passcode above to sign in immediately."}
                </p>
              </div>
            )}

            <div>
              <input
                type="text"
                maxLength={6}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="••••••"
                className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-3 text-center text-2xl font-mono font-black tracking-[8px] focus:outline-none focus:ring-2 focus:ring-brand-500 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                required
                autoFocus
              />
              <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-1.5">
                Passcode is valid for 10 minutes.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || otpInput.length < 6}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/20 flex items-center justify-center space-x-1.5 transition-all"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Verifying Passcode...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Confirm Passcode & Sign In</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setAuthStep('email');
                  setDevPasscode(null);
                  setSandboxNotice(null);
                }}
                className="text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center gap-1 font-medium transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Change Email
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={isLoading}
                className="text-brand-600 dark:text-brand-400 hover:underline font-semibold"
              >
                Resend Passcode
              </button>
            </div>
          </form>
        )}

        {/* ---------------- ALREADY AUTHENTICATED: PROFILE / ADMIN MANAGEMENT ---------------- */}
        {isAuthenticated && currentUser && (
          <div className="space-y-4">
            {isSuperAdmin && (
              <div className="flex space-x-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-3">
                <button
                  onClick={() => setAuthStep('account')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    authStep === 'account'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  My Account
                </button>
                <button
                  onClick={() => setAuthStep('manage')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    authStep === 'manage'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Manage Admins & Students ({usersList.length})
                </button>
              </div>
            )}

            {authStep !== 'manage' ? (
              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Signed In As:</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.email}
                  </div>
                  <div className="flex items-center space-x-2 pt-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        currentUser.role === 'SUPER_ADMIN'
                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800'
                          : currentUser.role === 'ADMIN'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                      }`}
                    >
                      {currentUser.role === 'SUPER_ADMIN' ? 'Super Admin (Owner)' : currentUser.role === 'ADMIN' ? 'Admin' : 'Student'}
                    </span>
                    {currentUser.role !== 'USER' ? (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Upload Access Granted
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Student (Read-Only)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={logout}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                  {onClose && (
                    <button
                      onClick={onClose}
                      className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      Done
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Super Admin RBAC panel: Add Admin directly + Toggle Existing Users */
              <div className="space-y-3.5 animate-fade-in">
                {/* Form to directly grant Admin to any email */}
                <form onSubmit={handleAddNewAdmin} className="p-3.5 rounded-2xl bg-brand-50/60 dark:bg-brand-950/30 border border-brand-100 dark:border-brand-900/50 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
                    <span className="flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                      Make a User Admin
                    </span>
                    <span className="text-[10px] text-brand-600 dark:text-brand-400 font-medium">Allows Uploading</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      placeholder="teacher@school.edu or user@gmail.com"
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-brand-500 font-medium"
                      required
                    />
                    <button
                      type="submit"
                      disabled={isAddingAdmin || !newAdminEmail.trim()}
                      className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1 shrink-0"
                    >
                      {isAddingAdmin ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Check className="w-3 h-3" />
                      )}
                      <span>Grant Admin</span>
                    </button>
                  </div>
                  {adminSuccessMsg && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold animate-fade-in">
                      {adminSuccessMsg}
                    </p>
                  )}
                </form>

                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Registered Users & Roles:
                </div>

                <div className="max-h-52 overflow-y-auto space-y-2 pr-1">
                  {usersList.map((u) => {
                    const isSuper = u.role === 'SUPER_ADMIN';

                    return (
                      <div
                        key={u.email}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="truncate mr-2">
                          <div className="font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                            {u.email}
                            {isSuper && (
                              <span className="text-[9px] font-black uppercase text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-1.5 py-0.2 rounded-full">
                                Owner
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            {isSuper
                              ? 'Super Admin (Full upload & permissions)'
                              : u.role === 'ADMIN'
                              ? 'Admin (Can upload documents & exams)'
                              : 'Student (Read-only access)'}
                          </div>
                        </div>

                        {!isSuper ? (
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => updateUserRole(u.email, 'ADMIN')}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                                u.role === 'ADMIN'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-emerald-50'
                              }`}
                            >
                              Admin
                            </button>
                            <button
                              onClick={() => updateUserRole(u.email, 'USER')}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                                u.role === 'USER'
                                  ? 'bg-slate-700 dark:bg-slate-600 text-white shadow-sm'
                                  : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              Student
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black uppercase text-purple-600 dark:text-purple-400">
                            Super Admin
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
                      className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
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
export default AuthModal;
