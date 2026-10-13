import React, { useState, useEffect } from 'react';
import { 
  X, CheckCircle2, XCircle, Clock, FileText, User, 
  ArrowRight, RefreshCw, Eye, Sparkles, Filter, 
  AlertCircle
} from 'lucide-react';
import { api, ServerDocument } from '../../services/api';
import UniversalPdfViewer from '../common/UniversalPdfViewer';

interface DocumentReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewerEmail: string;
  onReviewsUpdated?: () => void;
}

export const DocumentReviewsModal: React.FC<DocumentReviewsModalProps> = ({
  isOpen,
  onClose,
  reviewerEmail,
  onReviewsUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'uploads' | 'renames'>('uploads');
  const [pendingUploads, setPendingUploads] = useState<ServerDocument[]>([]);
  const [pendingRenames, setPendingRenames] = useState<ServerDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  
  // Preview PDF state
  const [previewDoc, setPreviewDoc] = useState<ServerDocument | null>(null);
  const [rejectReason, setRejectReason] = useState<{ id: string; type: 'upload' | 'rename' } | null>(null);
  const [rejectInputText, setRejectInputText] = useState('');

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await api.getPendingReviews();
      setPendingUploads(res.pendingUploads);
      setPendingRenames(res.pendingRenames);
    } catch (err) {
      console.error('Failed to load pending reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPending();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApproveUpload = async (doc: ServerDocument) => {
    setActionInProgress(doc.id);
    try {
      await api.approveDocumentUpload(doc.id, reviewerEmail);
      await loadPending();
      onReviewsUpdated?.();
    } catch (err) {
      console.error('Failed to approve upload:', err);
      alert('Error approving document');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleConfirmRejectUpload = async (id: string) => {
    setActionInProgress(id);
    try {
      await api.rejectDocumentUpload(id, reviewerEmail, rejectInputText || 'Rejected by SuperAdmin');
      setRejectReason(null);
      setRejectInputText('');
      await loadPending();
      onReviewsUpdated?.();
    } catch (err) {
      console.error('Failed to reject upload:', err);
      alert('Error rejecting document');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleApproveRename = async (doc: ServerDocument) => {
    setActionInProgress(doc.id);
    try {
      await api.approveDocumentRename(doc.id, reviewerEmail);
      await loadPending();
      onReviewsUpdated?.();
    } catch (err) {
      console.error('Failed to approve rename:', err);
      alert('Error approving rename');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleConfirmRejectRename = async (id: string) => {
    setActionInProgress(id);
    try {
      await api.rejectDocumentRename(id, reviewerEmail, rejectInputText || 'Rename declined by SuperAdmin');
      setRejectReason(null);
      setRejectInputText('');
      await loadPending();
      onReviewsUpdated?.();
    } catch (err) {
      console.error('Failed to reject rename:', err);
      alert('Error rejecting rename');
    } finally {
      setActionInProgress(null);
    }
  };

  const totalPending = pendingUploads.length + pendingRenames.length;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-fade-in">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-scale-up">
          {/* Header */}
          <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-purple-500/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    SuperAdmin Review Desk
                  </h2>
                  {totalPending > 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500 text-white animate-bounce">
                      {totalPending} Pending
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      All Clear
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Review and authorize faculty Admin uploads and document rename requests
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadPending}
                disabled={loading}
                title="Refresh reviews"
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-3 bg-slate-50/50 dark:bg-slate-900/50 gap-4">
            <button
              onClick={() => setActiveTab('uploads')}
              className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
                activeTab === 'uploads'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Pending Uploads</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                pendingUploads.length > 0 
                  ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-bold' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}>
                {pendingUploads.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('renames')}
              className={`pb-3 px-2 text-sm font-semibold flex items-center gap-2 border-b-2 transition ${
                activeTab === 'renames'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>Pending Renames</span>
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                pendingRenames.length > 0 
                  ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 font-bold' 
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
              }`}>
                {pendingRenames.length}
              </span>
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {activeTab === 'uploads' && (
              <>
                {pendingUploads.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                      No Pending Uploads
                    </h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">
                      All admin uploaded documents have been reviewed or approved. Any new uploads by faculty admins will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3.5">
                    {pendingUploads.map(doc => (
                      <div
                        key={doc.id}
                        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-slate-900 dark:text-white truncate text-base">
                                {doc.name}
                              </h4>
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                Pending Approval
                              </span>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 dark:text-slate-400">
                              <span className="font-medium text-slate-700 dark:text-slate-300">
                                Subject: <span className="text-primary-600 dark:text-primary-400 font-semibold">{doc.subject}</span>
                              </span>
                              {(doc.chapterNumber || doc.chapterTitle) && (
                                <span>Chapter: {doc.chapterNumber ? `Ch ${doc.chapterNumber}` : ''} {doc.chapterTitle || ''}</span>
                              )}
                              <span>Size: {doc.size || `${((doc.sizeBytes || 0) / (1024 * 1024)).toFixed(1)} MB`}</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                <span>Uploaded by: <strong className="text-slate-700 dark:text-slate-200">{doc.uploadedBy || 'Admin'}</strong></span>
                              </div>
                              <span>•</span>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : 'Recently'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-1.5 transition"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Preview</span>
                          </button>
                          
                          <button
                            onClick={() => setRejectReason({ id: doc.id, type: 'upload' })}
                            disabled={actionInProgress === doc.id}
                            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 flex items-center gap-1.5 transition"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Reject</span>
                          </button>

                          <button
                            onClick={() => handleApproveUpload(doc)}
                            disabled={actionInProgress === doc.id}
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{actionInProgress === doc.id ? 'Approving...' : 'Approve & Publish'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'renames' && (
              <>
                {pendingRenames.length === 0 ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                      No Pending Renames
                    </h3>
                    <p className="text-sm text-slate-500 max-w-sm mx-auto">
                      All PDF rename requests from faculty admins have been resolved.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3.5">
                    {pendingRenames.map(doc => (
                      <div
                        key={doc.id}
                        className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 hover:shadow-md transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3.5 flex-1 min-w-0">
                          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 shrink-0">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                                Rename Request
                              </span>
                              <span className="text-xs text-slate-500">
                                Subject: <strong className="text-slate-700 dark:text-slate-300">{doc.subject}</strong>
                              </span>
                            </div>

                            {/* Rename Diff Comparison */}
                            <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Current Live Name</div>
                                <div className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate line-through opacity-75">
                                  {doc.name}
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-purple-500 hidden sm:block shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-[11px] text-purple-600 dark:text-purple-400 font-medium uppercase tracking-wider">Proposed Name</div>
                                <div className="text-sm text-purple-700 dark:text-purple-300 font-bold truncate">
                                  {doc.pendingRename}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 text-xs text-slate-500 dark:text-slate-400">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                <span>Requested by: <strong className="text-slate-700 dark:text-slate-200">{doc.pendingRenameBy || 'Admin'}</strong></span>
                              </div>
                              <span>•</span>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>{doc.pendingRenameAt ? new Date(doc.pendingRenameAt).toLocaleString() : 'Recently'}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/60 flex items-center gap-1.5 transition"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Preview</span>
                          </button>
                          
                          <button
                            onClick={() => setRejectReason({ id: doc.id, type: 'rename' })}
                            disabled={actionInProgress === doc.id}
                            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 flex items-center gap-1.5 transition"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Decline</span>
                          </button>

                          <button
                            onClick={() => handleApproveRename(doc)}
                            disabled={actionInProgress === doc.id}
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white flex items-center gap-1.5 shadow-md shadow-purple-600/20 transition disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{actionInProgress === doc.id ? 'Applying...' : 'Approve Rename'}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              Logged in as SuperAdmin ({reviewerEmail})
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 font-medium rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Reject Reason Confirmation Modal */}
      {rejectReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-up">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
              <AlertCircle className="w-6 h-6" />
              <h3 className="text-lg font-bold">
                {rejectReason.type === 'upload' ? 'Reject PDF Upload' : 'Decline Rename Request'}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Please enter an optional note or reason for rejection so the faculty admin knows why:
            </p>
            <input
              type="text"
              value={rejectInputText}
              onChange={(e) => setRejectInputText(e.target.value)}
              placeholder="e.g. Duplicate document, incorrect subject room, formatting issues"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 mb-4"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => { setRejectReason(null); setRejectInputText(''); }}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectReason.type === 'upload') {
                    handleConfirmRejectUpload(rejectReason.id);
                  } else {
                    handleConfirmRejectRename(rejectReason.id);
                  }
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition shadow-md shadow-rose-600/20"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Quick Preview Modal */}
      {previewDoc && (
        <UniversalPdfViewer
          url={previewDoc.streamUrl || previewDoc.serverUrl || previewDoc.url || ''}
          title={previewDoc.name}
          subtitle={`${previewDoc.subject || 'General'} • Class ${previewDoc.standard || '12'}`}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </>
  );
};

export default DocumentReviewsModal;
