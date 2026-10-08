import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api, AdminNotification } from '../../services/api';
import {
  Bell,
  X,
  Plus,
  Trash2,
  Send,
  Shield,
  Calendar,
  Megaphone,
} from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotificationsCountChange?: (count: number) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  onNotificationsCountChange,
}) => {
  const { currentUser, isSuperAdmin, canUpload, activeStandard } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isComposing, setIsComposing] = useState<boolean>(false);

  // Compose form state
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [targetStandard, setTargetStandard] = useState<string>(activeStandard === 'ALL' ? '12' : activeStandard);
  const [priority, setPriority] = useState<'urgent' | 'important' | 'info'>('important');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await api.getNotifications(isSuperAdmin ? undefined : activeStandard);
      setNotifications(data);
      if (onNotificationsCountChange) {
        onNotificationsCountChange(data.length);
      }
    } catch (e) {
      console.warn('Could not load notifications:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, activeStandard, isSuperAdmin]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const newNotif = await api.createNotification({
        title: title.trim(),
        message: message.trim(),
        standard: isSuperAdmin ? targetStandard : (currentUser?.standard || activeStandard || '12'),
        priority,
        senderEmail: currentUser?.email || 'admin@aetherstudy.internal',
        senderName: isSuperAdmin ? 'Super Administrator' : 'Faculty Administrator',
      });

      setNotifications((prev) => [newNotif, ...prev]);
      setTitle('');
      setMessage('');
      setIsComposing(false);
      if (onNotificationsCountChange) {
        onNotificationsCountChange(notifications.length + 1);
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to dispatch notification.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await api.deleteNotification(id, currentUser?.email || '');
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (onNotificationsCountChange) {
        onNotificationsCountChange(notifications.length - 1);
      }
    } catch (err: any) {
      alert(err.message || 'Could not delete notification.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-text">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Official Announcements & Notices
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Standard {activeStandard}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Important broadcasts from administrators and board faculty
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {canUpload && !isComposing && (
              <button
                onClick={() => setIsComposing(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-brand-500/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Broadcast Notice</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Admin Composer Drawer */}
          {isComposing && (
            <form
              onSubmit={handleCreate}
              className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-brand-200 dark:border-brand-800/80 space-y-3.5 animate-fade-in shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                  <span>Draft Announcement</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setIsComposing(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>

              {submitError && (
                <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs font-medium">
                  {submitError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notice Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. HSC Board Practical Exam Time Table Announced"
                  required
                  className="w-full bg-white dark:bg-slate-900 rounded-xl px-3.5 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Standard
                  </label>
                  <select
                    value={targetStandard}
                    onChange={(e) => setTargetStandard(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="12">Standard 12 (HSC)</option>
                    <option value="10">Standard 10 (SSC)</option>
                    <option value="11">Standard 11 (FYJC)</option>
                    <option value="9">Standard 9</option>
                    <option value="ALL">All Standards (Universal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-white dark:bg-slate-900 rounded-xl px-3 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="urgent">🔴 Urgent Alert</option>
                    <option value="important">🟡 Important Notice</option>
                    <option value="info">🔵 General Information</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Announcement Message
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide clear details, instructions, or links..."
                  required
                  className="w-full bg-white dark:bg-slate-900 rounded-xl px-3.5 py-2 text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !message.trim()}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-brand-500/20 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Broadcasting...' : 'Broadcast to Students'}</span>
              </button>
            </form>
          )}

          {/* Notifications Feed */}
          {isLoading ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Loading announcements...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                <Bell className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                No active announcements for Standard {activeStandard}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                You will be notified whenever faculty posts time tables, syllabus revisions, or test schedules.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isUrgent = notif.priority === 'urgent';
              const isImportant = notif.priority === 'important';

              return (
                <div
                  key={notif.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isUrgent
                      ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60'
                      : isImportant
                      ? 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                      : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          isUrgent
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200 border-rose-300 dark:border-rose-800 animate-pulse'
                            : isImportant
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/80 dark:text-blue-200 border-blue-300 dark:border-blue-800'
                        }`}
                      >
                        {notif.priority}
                      </span>

                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        Target: {notif.standard === 'ALL' ? 'Universal (All Grades)' : `Class ${notif.standard}`}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(notif.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>

                      {canUpload && (
                        <button
                          onClick={() => handleDelete(notif.id)}
                          className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                          title="Delete notice"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                    {notif.title}
                  </h4>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed whitespace-pre-wrap">
                    {notif.message}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 font-medium">
                      <Shield className="w-3 h-3 text-brand-500" />
                      Broadcast by {notif.senderName || 'Administration'}
                    </span>
                    <span>
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
