import React, { useState, useEffect } from 'react';
import {
  X,
  FileQuestion,
  CheckCircle2,
  Clock,
  Trash2,
  Mail,
  Send,
  Search,
  RefreshCw,
} from 'lucide-react';
import { api, PaperRequest } from '../../services/api';
import { firebasePaperRequests } from '../../services/firebase';

interface PaperRequestsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestCountChange?: (count: number) => void;
}

export const PaperRequestsManagerModal: React.FC<PaperRequestsManagerModalProps> = ({
  isOpen,
  onClose,
  onRequestCountChange,
}) => {
  const [requests, setRequests] = useState<PaperRequest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'fulfilled' | 'dismissed'>('all');
  const [actionNotice, setActionNotice] = useState<string>('');

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await api.getPaperRequests();
      setRequests(data);
      if (onRequestCountChange) {
        onRequestCountChange(data.filter((r) => r.status === 'pending').length);
      }
    } catch (err) {
      console.warn('Failed to load paper requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadRequests();

    // Subscribe to real-time incoming requests via Firebase RTDB
    const unsub = firebasePaperRequests.subscribe((cloudList) => {
      if (Array.isArray(cloudList) && cloudList.length > 0) {
        setRequests((prev) => {
          const merged = [...prev];
          for (const item of cloudList) {
            const index = merged.findIndex((m) => m.id === item.id);
            if (index >= 0) {
              merged[index] = { ...merged[index], ...item };
            } else {
              merged.unshift(item as PaperRequest);
            }
          }
          merged.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
          if (onRequestCountChange) {
            onRequestCountChange(merged.filter((r) => r.status === 'pending').length);
          }
          return merged;
        });
      }
    });

    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdateStatus = async (id: string, status: 'pending' | 'fulfilled' | 'dismissed') => {
    await api.updatePaperRequestStatus(id, status);
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
    setActionNotice(`Request status updated to ${status}.`);
    setTimeout(() => setActionNotice(''), 3000);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this paper request permanently?')) return;
    await api.deletePaperRequest(id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
    setActionNotice('Paper request deleted.');
    setTimeout(() => setActionNotice(''), 3000);
  };

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const query = searchFilter.toLowerCase().trim();
    const matchesSearch =
      !query ||
      r.email.toLowerCase().includes(query) ||
      r.subject.toLowerCase().includes(query) ||
      r.year.toLowerCase().includes(query) ||
      (r.notes && r.notes.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-brand-500/5 via-indigo-500/5 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-xs">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Student Paper Requests Manager
                </h2>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    {pendingCount} Pending
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time queue of past papers and chapter solutions requested by students
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadRequests}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Refresh Queue"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Notice Toast */}
        {actionNotice && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Filter Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by student email, subject, year, or notes..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(['all', 'pending', 'fulfilled', 'dismissed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === st
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 min-h-[300px]">
          {isLoading && requests.length === 0 ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-brand-500" />
              <p className="text-xs font-semibold">Loading paper requests from cloud...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 flex flex-col items-center justify-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <FileQuestion className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  No paper requests found
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {searchFilter
                    ? 'Try adjusting your search criteria.'
                    : 'When students submit paper requests, they will instantly appear here.'}
                </p>
              </div>
            </div>
          ) : (
            filteredRequests.map((req) => {
              const isPending = req.status === 'pending';
              const isFulfilled = req.status === 'fulfilled';

              return (
                <div
                  key={req.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isPending
                      ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30'
                      : isFulfilled
                      ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {req.subject}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-brand-500/15 text-brand-700 dark:text-brand-300">
                        {req.year}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                          isPending
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300'
                            : isFulfilled
                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                            : 'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(req.submittedAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="py-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">Student:</span>
                      <a
                        href={`mailto:${req.email}?subject=${encodeURIComponent(
                          `[AetherStudy] Update on your request for ${req.subject} (${req.year})`
                        )}`}
                        className="font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                        title="Click to email student"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{req.email}</span>
                      </a>
                    </div>

                    {req.notes && (
                      <div className="p-2.5 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-black/5 dark:border-white/5 text-slate-700 dark:text-slate-300 italic">
                        "{req.notes}"
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <a
                        href={`mailto:${req.email}?subject=${encodeURIComponent(
                          `[AetherStudy] ${req.subject} (${req.year}) Past Paper Update`
                        )}&body=${encodeURIComponent(
                          `Hi,\n\nWe have received your paper request for ${req.subject} (${req.year}) on AetherStudy.\n\n`
                        )}`}
                        className="px-2.5 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <Send className="w-3 h-3" />
                        <span>Email Student</span>
                      </a>

                      {!isFulfilled && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(req.id, 'fulfilled')}
                          className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Mark Fulfilled</span>
                        </button>
                      )}

                      {isFulfilled && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(req.id, 'pending')}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold transition-all cursor-pointer"
                        >
                          Mark as Pending
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {req.status !== 'dismissed' && (
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(req.id, 'dismissed')}
                          className="px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                        >
                          Dismiss
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(req.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                        title="Delete Request"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Total Requests: <strong>{requests.length}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
