import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Users,
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  Search,
  RefreshCw,
  Crown,
  GraduationCap,
  Clock,
  UserPlus,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserProfile, UserRole } from '../../types/auth';

interface UsersManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UsersManagerModal: React.FC<UsersManagerModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, isSuperAdmin, usersList, refreshUsers, updateUserRole, addAdminUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'admins' | 'students' | 'active'>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [updatingEmail, setUpdatingEmail] = useState<string | null>(null);

  // Quick invite / promote new user state
  const [newEmail, setNewEmail] = useState<string>('');
  const [newRole, setNewRole] = useState<UserRole>('ADMIN');
  const [isSubmittingNew, setIsSubmittingNew] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen && isSuperAdmin) {
      refreshUsers();
    }
  }, [isOpen, isSuperAdmin]);

  if (!isOpen || !isSuperAdmin) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshUsers();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Helper to check if user has been active within the last 14 days
  const isUserActive = (user: UserProfile) => {
    const timestamp = user.lastActive || user.lastLogin;
    if (!timestamp) return false;
    const diffDays = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 14;
  };

  // Filter & search users
  const filteredUsers = useMemo(() => {
    return usersList.filter((user) => {
      // Tab filter
      if (filterTab === 'admins') {
        if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') return false;
      } else if (filterTab === 'students') {
        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return false;
      } else if (filterTab === 'active') {
        if (!isUserActive(user)) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesEmail = user.email.toLowerCase().includes(q);
        const matchesName = (user.name || '').toLowerCase().includes(q);
        const matchesRole = user.role.toLowerCase().includes(q);
        if (!matchesEmail && !matchesName && !matchesRole) return false;
      }

      return true;
    });
  }, [usersList, filterTab, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = usersList.length;
    const active = usersList.filter(isUserActive).length;
    const admins = usersList.filter((u) => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN').length;
    const students = total - admins;
    return { total, active, admins, students };
  }, [usersList]);

  const handleToggleRole = async (targetUser: UserProfile) => {
    if (targetUser.email.toLowerCase() === 'bs.framework5253@gmail.com' || targetUser.role === 'SUPER_ADMIN') {
      alert('Primary Super Admin privileges cannot be modified.');
      return;
    }

    const newTargetRole: UserRole = targetUser.role === 'ADMIN' ? 'USER' : 'ADMIN';
    const actionLabel = newTargetRole === 'ADMIN' ? 'make this user an Admin' : 'remove Admin privileges';

    if (!window.confirm(`Are you sure you want to ${actionLabel} for ${targetUser.email}?`)) {
      return;
    }

    setUpdatingEmail(targetUser.email);
    setStatusMessage(null);
    try {
      const success = await updateUserRole(targetUser.email, newTargetRole, targetUser.standard);
      if (success) {
        setStatusMessage({
          text: `Successfully ${newTargetRole === 'ADMIN' ? 'promoted to Admin' : 'reverted to Student'}: ${targetUser.email}`,
          type: 'success',
        });
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } finally {
      setUpdatingEmail(null);
    }
  };

  const handleCreateOrPromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setStatusMessage({ text: 'Please provide a valid email address.', type: 'error' });
      return;
    }

    setIsSubmittingNew(true);
    setStatusMessage(null);
    try {
      const success = await addAdminUser(newEmail.trim().toLowerCase(), newRole);
      if (success) {
        setStatusMessage({
          text: `User ${newEmail} updated with ${newRole} role successfully!`,
          type: 'success',
        });
        setNewEmail('');
        setTimeout(() => setStatusMessage(null), 4000);
      }
    } finally {
      setIsSubmittingNew(false);
    }
  };

  const formatTimeAgo = (iso?: string) => {
    if (!iso) return 'Never';
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-lg">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-brand-500/25 shrink-0">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                  User Directory & Role Manager
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                View all registered students, active accounts, emails, and promote users to Admin.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Refresh User Directory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats Metric Cards */}
        <div className="p-4 sm:px-6 sm:pt-5 sm:pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 shrink-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Users</p>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {stats.total}
                </p>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active</p>
                <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight">
                  {stats.active}
                </p>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Admins</p>
                <p className="text-base sm:text-lg font-black text-purple-600 dark:text-purple-400 leading-tight">
                  {stats.admins}
                </p>
              </div>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Students</p>
                <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {stats.students}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Notification Toast */}
        {statusMessage && (
          <div
            className={`mx-4 sm:mx-6 mt-3 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 border animate-fade-in ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Search, Filter & Quick Admin Invite Toolbar */}
        <div className="p-4 sm:p-6 space-y-3.5 shrink-0 border-b border-slate-100 dark:border-slate-800/80">
          {/* Top Row: Search and Tabs */}
          <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email, name, or role..."
                className="w-full pl-9.5 pr-8 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white text-xs border border-transparent focus:border-brand-500 focus:bg-white dark:focus:bg-slate-900 outline-none transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Segmented Filter Pills */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterTab === 'active'
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Active ({stats.active})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('admins')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterTab === 'admins'
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Admins ({stats.admins})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('students')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  filterTab === 'students'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Students ({stats.students})
              </button>
            </div>
          </div>

          {/* Quick Promote / Invite Admin Strip */}
          <form
            onSubmit={handleCreateOrPromote}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 sm:p-3 rounded-2xl bg-brand-500/5 dark:bg-brand-500/10 border border-brand-500/20"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300 shrink-0">
              <UserPlus className="w-4 h-4 text-brand-500" />
              <span>Make Admin by Email:</span>
            </div>

            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter student or teacher email address..."
              required
              className="flex-1 min-w-0 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 focus:border-brand-500 outline-none placeholder:text-slate-400"
            />

            <div className="flex items-center gap-2 shrink-0">
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 outline-none"
              >
                <option value="ADMIN">Assign Admin</option>
                <option value="USER">Assign Student</option>
              </select>

              <button
                type="submit"
                disabled={isSubmittingNew || !newEmail.trim()}
                className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
              >
                {isSubmittingNew ? 'Saving...' : 'Apply Role'}
              </button>
            </div>
          </form>
        </div>

        {/* Users List Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No users match your criteria
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? `No accounts found matching "${searchQuery}". Try searching by another keyword.`
                  : 'No accounts registered under this tab filter yet.'}
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const active = isUserActive(user);
              const isOwner =
                user.email.toLowerCase() === 'bs.framework5253@gmail.com' ||
                user.role === 'SUPER_ADMIN';
              const isCurrentUser =
                currentUser?.email?.toLowerCase() === user.email.toLowerCase();
              const isUpdating = updatingEmail === user.email;

              // Generate initials
              const initials = user.email.slice(0, 2).toUpperCase();

              return (
                <div
                  key={user.email}
                  className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Left: User Identity */}
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black text-white shadow-2xs ${
                          isOwner
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                            : user.role === 'ADMIN'
                            ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                            : 'bg-gradient-to-br from-slate-600 to-slate-800'
                        }`}
                      >
                        {initials}
                      </div>
                      {/* Active Status Indicator Dot */}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                          active ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                        }`}
                        title={active ? 'Active recently' : 'Inactive'}
                      />
                    </div>

                    {/* Email and Meta */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {user.email}
                        </span>

                        {isCurrentUser && (
                          <span className="px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500">
                            You
                          </span>
                        )}

                        {/* Role Badges */}
                        {isOwner ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25 flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-500" />
                            <span>Super Admin</span>
                          </span>
                        ) : user.role === 'ADMIN' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/25 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-purple-500" />
                            <span>Admin</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 text-blue-500" />
                            <span>Student</span>
                          </span>
                        )}

                        {/* Standard Badge */}
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          Class {user.standard || '12'}
                        </span>
                      </div>

                      {/* Timestamps */}
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Last active: {formatTimeAgo(user.lastActive || user.lastLogin)}</span>
                        </span>
                        <span className="hidden xs:inline">•</span>
                        <span className={active ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}>
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {isOwner ? (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-bold px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/40">
                        Primary Owner
                      </span>
                    ) : user.role === 'ADMIN' ? (
                      <button
                        type="button"
                        onClick={() => handleToggleRole(user)}
                        disabled={isUpdating}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                        title="Demote from Admin to regular Student"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>{isUpdating ? 'Updating...' : 'Revoke Admin'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleRole(user)}
                        disabled={isUpdating}
                        className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
                        title="Grant Administrator privileges to this user"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{isUpdating ? 'Updating...' : 'Make Admin'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:px-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-950/30 shrink-0">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-500" />
            <span>Admins have upload, deletion, and paper request fulfillment authority.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsersManagerModal;
