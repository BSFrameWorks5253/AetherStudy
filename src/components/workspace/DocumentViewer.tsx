import React, { useState, useEffect, useRef } from 'react';
import { api, ServerDocument } from '../../services/api';
import {
  Upload,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  Server,
  Trash2,
  CheckCircle,
  ChevronDown,
  ExternalLink,
  Plus,
  BookOpen,
  Filter,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const DocumentViewer: React.FC = () => {
  const [documents, setDocuments] = useState<ServerDocument[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('All');
  const [activeDoc, setActiveDoc] = useState<ServerDocument | null>(null);
  
  // Viewer state
  const [zoom, setZoom] = useState<number>(100);
  const [rotation, setRotation] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [showDocMenu, setShowDocMenu] = useState<boolean>(false);

  // Upload modal state with subject selection & creation
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [uploadSubject, setUploadSubject] = useState<string>('');
  const [isCreatingSubject, setIsCreatingSubject] = useState<boolean>(false);
  const [newSubjectInput, setNewSubjectInput] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents and subjects from server
  const loadData = async () => {
    try {
      const [docList, subjList] = await Promise.all([api.getDocuments(), api.getSubjects()]);
      setDocuments(docList);
      setSubjects(subjList);
      if (subjList.length > 0 && !uploadSubject) {
        setUploadSubject(subjList[0]);
      }
      if (docList.length > 0 && !activeDoc) {
        setActiveDoc(docList[0]);
      }
    } catch (err) {
      console.warn('Could not connect to server storage:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateNewSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectInput.trim()) return;

    try {
      const res = await api.createSubject(newSubjectInput.trim());
      setSubjects(res.subjects);
      setUploadSubject(res.created);
      setNewSubjectInput('');
      setIsCreatingSubject(false);
    } catch (err) {
      console.error('Failed to create subject:', err);
    }
  };

  const { currentUser, canUpload } = useAuth();

  const handleConfirmUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    if (!canUpload) {
      alert('Upload restricted: Only administrators or the account owner can upload materials.');
      return;
    }

    try {
      setIsUploading(true);
      const chosenSubject = uploadSubject || (subjects.length > 0 ? subjects[0] : 'General');
      let newDoc: any;
      try {
        const driveRes = await api.uploadToGoogleDrive(selectedFile, chosenSubject, currentUser?.email || '');
        newDoc = driveRes.document;
      } catch {
        newDoc = await api.uploadDocument(selectedFile, chosenSubject, currentUser?.email || '');
      }
      setDocuments((prev) => [newDoc, ...prev]);
      setActiveDoc(newDoc);
      setZoom(100);
      setRotation(0);
      setUploadSuccess(true);
      setSelectedFile(null);
      setShowUploadModal(false);
      setTimeout(() => setUploadSuccess(false), 2500);
    } catch (err) {
      alert((err as Error).message || 'File upload error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      if (activeDoc?.id === id) {
        const remaining = documents.filter((d) => d.id !== id);
        setActiveDoc(remaining.length > 0 ? remaining[0] : null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      setShowUploadModal(true);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 15, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 15, 50));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const filteredDocuments = documents.filter(
    (d) => selectedSubjectFilter === 'All' || d.subject === selectedSubjectFilter
  );

  return (
    <div className="flex flex-col h-full text-slate-800 dark:text-slate-100 select-none overflow-hidden relative">
      {/* Top Glass Control Bar (Mobile & Desktop Responsive) */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 liquid-glass z-20 border-b border-white/40 dark:border-white/10 gap-2 shadow-sm">
        {/* Document Selector & Subject Filter */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <button
              onClick={() => setShowDocMenu(!showDocMenu)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-white/40 dark:bg-slate-800/60 hover:bg-white/70 dark:hover:bg-slate-800 border border-white/50 dark:border-white/10 transition-all text-xs font-bold max-w-[200px] sm:max-w-[280px] truncate shadow-sm"
            >
              <Server className="w-3.5 h-3.5 text-brand-500 shrink-0" />
              <span className="truncate">
                {activeDoc ? activeDoc.originalName : 'Select Document'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {/* Document Drawer Modal Popover */}
            {showDocMenu && (
              <div className="absolute top-full left-0 mt-2 w-80 sm:w-96 liquid-glass rounded-2xl shadow-2xl p-3 z-50 animate-fade-in border border-white/60 dark:border-white/10 max-h-80 overflow-y-auto">
                {/* Subject Filter inside picker */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-black/5 dark:border-white/10">
                  <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-500">
                    <Filter className="w-3 h-3 text-brand-500" />
                    <span>Filter:</span>
                  </div>
                  <select
                    value={selectedSubjectFilter}
                    onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                    className="liquid-glass-subtle text-[11px] font-semibold rounded-lg px-2 py-1 outline-none"
                  >
                    <option value="All">All Subjects ({documents.length})</option>
                    {subjects.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                {filteredDocuments.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No documents found in this subject.
                  </div>
                ) : (
                  filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => {
                        setActiveDoc(doc);
                        setShowDocMenu(false);
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all mb-1 ${
                        activeDoc?.id === doc.id
                          ? 'bg-brand-600 text-white shadow-md'
                          : 'hover:bg-white/40 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate min-w-0">
                        <FileText className="w-4 h-4 shrink-0" />
                        <div className="truncate">
                          <div className="truncate font-bold">{doc.originalName}</div>
                          <div className="text-[10px] opacity-80 flex items-center gap-1.5 mt-0.5">
                            <span className="font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10">
                              {doc.subject}
                            </span>
                            <span>• {(doc.sizeBytes / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDeleteDoc(doc.id, e)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors ml-2"
                        title="Delete from server"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}

                <div className="pt-2 mt-2 border-t border-black/5 dark:border-white/10 flex justify-end">
                  <button
                    onClick={() => {
                      setShowDocMenu(false);
                      setShowUploadModal(true);
                    }}
                    className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Upload Document to Subject
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Zoom & Action Controls */}
        <div className="flex items-center space-x-1.5">
          {activeDoc && (
            <div className="flex items-center space-x-1 px-2 py-1 rounded-xl bg-white/40 dark:bg-slate-800/60 border border-white/50 dark:border-white/10 text-xs shadow-sm">
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 px-1">{zoom}%</span>
              <button
                onClick={handleZoomOut}
                className="p-1 rounded-lg hover:bg-white/60 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-1 rounded-lg hover:bg-white/60 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleRotate}
                className="p-1 rounded-lg hover:bg-white/60 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
                title="Rotate 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={() => {
              if (!canUpload) {
                alert('Uploading documents is restricted to administrators and the account owner.');
                return;
              }
              setShowUploadModal(true);
            }}
            disabled={isUploading}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${
              canUpload
                ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-500/20 glass-pill'
                : 'liquid-glass-subtle text-slate-400 cursor-not-allowed'
            }`}
          >
            {isUploading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : uploadSuccess ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
            ) : canUpload ? (
              <Upload className="w-3.5 h-3.5" />
            ) : (
              <Lock className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">
              {isUploading ? 'Uploading...' : 'Upload PDF'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Document Frame */}
      <div className="flex-1 relative overflow-auto p-2 sm:p-4 flex items-center justify-center">
        {!activeDoc ? (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            className={`w-full max-w-lg p-8 sm:p-12 rounded-3xl border-2 border-dashed transition-all liquid-glass flex flex-col items-center justify-center text-center ${
              isDragging
                ? 'border-brand-500 scale-[1.02] bg-brand-500/10'
                : 'border-white/50 dark:border-white/10'
            }`}
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-500 to-accent-cyan flex items-center justify-center mb-4 text-white shadow-xl shadow-brand-500/30">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-1">
              Add Subject Study Materials
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-sm leading-relaxed">
              Upload PDF textbooks, slides, or monographs and link them to their academic subject for instant offline and mobile access.
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg shadow-brand-500/30 transition-all active:scale-95 glass-pill"
            >
              Upload Document to Subject
            </button>
          </div>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center overflow-auto transition-transform duration-150"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
          >
            <iframe
              src={activeDoc.streamUrl || activeDoc.serverUrl}
              title={activeDoc.originalName || activeDoc.name}
              allow="autoplay"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              className="w-full h-full rounded-2xl shadow-2xl border border-white/40 dark:border-white/10 bg-white"
            />
          </div>
        )}
      </div>

      {/* Footer Info & Mobile Actions */}
      {activeDoc && (
        <div className="px-4 py-2 liquid-glass-subtle border-t border-white/30 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          <div className="flex items-center space-x-2 truncate">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate">Subject: <strong className="text-slate-700 dark:text-slate-200">{activeDoc.subject}</strong></span>
          </div>
          <a
            href={activeDoc.serverUrl}
            target="_blank"
            rel="noreferrer"
            className="hover:text-brand-500 flex items-center gap-1 transition-colors shrink-0 font-semibold"
          >
            Standalone <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Dedicated Subject-Aware Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md liquid-glass rounded-3xl p-6 shadow-2xl text-slate-800 dark:text-slate-100 border border-white/70 dark:border-white/10">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/10 mb-4">
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-500" />
                Upload Document to Subject
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmUpload} className="space-y-4">
              {/* File Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Document File (PDF, HTML, MD, Image)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 border-2 border-dashed border-white/50 dark:border-white/20 rounded-2xl liquid-glass-subtle cursor-pointer hover:border-brand-500 text-center transition-colors"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="application/pdf,text/html,text/plain,text/markdown,image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                  {selectedFile ? (
                    <div className="text-xs font-bold text-brand-600 dark:text-brand-300 truncate">
                      ✓ {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">
                      Tap to select or drop study file
                    </div>
                  )}
                </div>
              </div>

              {/* Subject Selection & Creation */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Belongs to Subject:
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCreatingSubject(!isCreatingSubject)}
                    className="text-[11px] font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {isCreatingSubject ? 'Select Existing' : 'Create New Subject'}
                  </button>
                </div>

                {!isCreatingSubject ? (
                  <select
                    value={uploadSubject}
                    onChange={(e) => setUploadSubject(e.target.value)}
                    className="w-full liquid-glass-subtle rounded-xl px-3.5 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                    required
                  >
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Enter new subject name..."
                        value={newSubjectInput}
                        onChange={(e) => setNewSubjectInput(e.target.value)}
                        className="flex-1 liquid-glass-subtle rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleCreateNewSubject}
                        className="px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl glass-pill"
                      >
                        Add
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      New subject will immediately be saved to the database.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-black/5 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="px-5 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-500/30 glass-pill"
                >
                  {isUploading ? 'Uploading...' : 'Confirm Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
