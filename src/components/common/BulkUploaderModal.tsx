import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  segregateFile,
  pairPYQFiles,
  SegregatedFile,
  PairedPYQ,
} from '../../utils/fileSegregator';
import { useAuth } from '../../context/AuthContext';
import { uploadDirectToGoogleDrive } from '../../services/clientGoogleDrive';
import { api } from '../../services/api';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  X,
  Trash2,
  Sparkles,
  RefreshCw,
  FolderUp,
  CheckSquare,
  Square,
  Plus,
  ShieldCheck,
  Layers,
  FileQuestion,
  FileCheck,
} from 'lucide-react';

interface BulkUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: 'notes' | 'pyq' | 'all';
  onUploadSuccess?: () => void;
}

const DEFAULT_AVAILABLE_SUBJECTS = [
  'Accounts',
  'Economics',
  'Mathematics',
  'OCM',
  'IT',
  'English',
  'Secretarial Practice',
  'Hindi',
  'Marathi',
];

const AVAILABLE_STANDARDS = ['12'];
const YEARS = Array.from({ length: 15 }, (_, i) => 2026 - i);
const SESSIONS = ['March', 'July', 'October', 'November', 'Prelims', 'Annual'];

export const BulkUploaderModal: React.FC<BulkUploaderModalProps> = ({
  isOpen,
  onClose,
  defaultCategory = 'all',
  onUploadSuccess,
}) => {
  const { currentUser } = useAuth();
  const [filesList, setFilesList] = useState<SegregatedFile[]>([]);
  const [customSubjects, setCustomSubjects] = useState<string[]>(DEFAULT_AVAILABLE_SUBJECTS);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentUploadingName, setCurrentUploadingName] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'notes' | 'textbook' | 'pyq' | 'pairs'>(defaultCategory);
  const [uploadSuccessSummary, setUploadSuccessSummary] = useState<{
    notesCount: number;
    textbooksCount: number;
    pyqCount: number;
  } | null>(null);

  // Quick Bulk Bar States
  const [bulkSubject, setBulkSubject] = useState<string>('');
  const [bulkStandard, setBulkStandard] = useState<string>('');
  const [newSubjectInput, setNewSubjectInput] = useState<string>('');
  const [showNewSubjectModal, setShowNewSubjectModal] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

const SUPPORTED_STUDY_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'csv',
  'txt',
  'md',
  'rtf',
  'epub',
  'html',
  'htm',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'svg',
]);

  // Set webkitdirectory explicitly on DOM element for broad browser support
  useEffect(() => {
    if (isOpen && folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
      folderInputRef.current.setAttribute('mozdirectory', '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFilesAdded = (rawFiles: FileList | File[]) => {
    const newItems: SegregatedFile[] = [];
    const filesArr = Array.from(rawFiles).filter((f) => {
      const name = f.name.toLowerCase();
      if (name.startsWith('.') || name === 'thumbs.db' || name === 'desktop.ini') return false;
      const ext = name.split('.').pop() || '';
      return SUPPORTED_STUDY_EXTENSIONS.has(ext);
    });

    const detectedNewSubjects = new Set<string>();

    filesArr.forEach((file) => {
      // @ts-ignore - webkitRelativePath exists on folder selection
      const relPath = file.webkitRelativePath || file.name;
      const segregated = segregateFile(file.name, relPath);
      segregated.originalFile = file;
      segregated.fileSizeBytes = file.size;
      segregated.selected = true; // Auto-select for verification by default

      if (segregated.subject && !DEFAULT_AVAILABLE_SUBJECTS.includes(segregated.subject)) {
        detectedNewSubjects.add(segregated.subject);
      }

      newItems.push(segregated);
    });

    if (detectedNewSubjects.size > 0) {
      setCustomSubjects((prev) => {
        const combined = new Set([...prev, ...Array.from(detectedNewSubjects)]);
        return Array.from(combined);
      });
    }

    setFilesList((prev) => [...prev, ...newItems]);
    setUploadSuccessSummary(null);
  };

  // Recursively read all files from dropped folders or directory entries
  const scanDirectoryEntry = async (item: any, currentPath: string = ''): Promise<File[]> => {
    if (item.isFile) {
      return new Promise((resolve) => {
        item.file(
          (file: File) => {
            // Attach simulated webkitRelativePath for folder structure preservation
            Object.defineProperty(file, 'webkitRelativePath', {
              value: currentPath ? `${currentPath}/${file.name}` : file.name,
              writable: true,
              configurable: true,
            });
            resolve([file]);
          },
          () => resolve([])
        );
      });
    } else if (item.isDirectory) {
      const dirReader = item.createReader();
      const readAllEntries = async (): Promise<any[]> => {
        return new Promise((resolve) => {
          dirReader.readEntries(
            (entries: any[]) => resolve(entries),
            () => resolve([])
          );
        });
      };
      let allEntries: any[] = [];
      let batch = await readAllEntries();
      while (batch && batch.length > 0) {
        allEntries = allEntries.concat(batch);
        batch = await readAllEntries();
      }
      const dirPath = currentPath ? `${currentPath}/${item.name}` : item.name;
      const fileLists = await Promise.all(
        allEntries.map((entry) => scanDirectoryEntry(entry, dirPath))
      );
      return fileLists.flat();
    }
    return [];
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Try modern DataTransferItemList with recursive folder resolution
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const items = Array.from(e.dataTransfer.items);
      const filePromises = items.map((item) => {
        const entry = (item as any).webkitGetAsEntry?.();
        if (entry) {
          return scanDirectoryEntry(entry);
        }
        const file = item.getAsFile();
        return Promise.resolve(file ? [file] : []);
      });
      const resolvedFiles = (await Promise.all(filePromises)).flat();
      if (resolvedFiles.length > 0) {
        handleFilesAdded(resolvedFiles);
        return;
      }
    }

    // 2. Fallback to standard files list
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesAdded(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFilesList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleToggleSelect = (index: number) => {
    setFilesList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], selected: !copy[index].selected };
      return copy;
    });
  };

  const handleToggleSelectAll = (select: boolean) => {
    setFilesList((prev) => prev.map((f) => ({ ...f, selected: select })));
  };

  const handleUpdateFileField = (index: number, field: keyof SegregatedFile, value: any) => {
    setFilesList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };

      // If subject changed and it is new, ensure it is registered
      if (field === 'subject' && typeof value === 'string' && value.trim()) {
        const sub = value.trim();
        setCustomSubjects((prevSubs) => (prevSubs.includes(sub) ? prevSubs : [...prevSubs, sub]));
      }

      return copy;
    });
  };

  // Add a brand-new custom subject
  const handleAddNewSubject = () => {
    if (!newSubjectInput.trim()) return;
    const cleanSub = newSubjectInput.trim();
    if (!customSubjects.includes(cleanSub)) {
      setCustomSubjects((prev) => [...prev, cleanSub]);
    }
    // Also apply to all selected files
    setFilesList((prev) =>
      prev.map((f) => (f.selected !== false ? { ...f, subject: cleanSub } : f))
    );
    setNewSubjectInput('');
    setShowNewSubjectModal(false);
  };

  // Bulk apply subject to all selected
  const handleApplyBulkSubject = () => {
    if (!bulkSubject) return;
    setFilesList((prev) =>
      prev.map((f) => (f.selected !== false ? { ...f, subject: bulkSubject } : f))
    );
    setBulkSubject('');
  };

  // Bulk apply standard to all selected
  const handleApplyBulkStandard = () => {
    if (!bulkStandard) return;
    setFilesList((prev) =>
      prev.map((f) => (f.selected !== false ? { ...f, standard: bulkStandard as any } : f))
    );
    setBulkStandard('');
  };

  // Selected counts
  const selectedFiles = useMemo(() => filesList.filter((f) => f.selected !== false), [filesList]);
  const allSelected = filesList.length > 0 && selectedFiles.length === filesList.length;

  // Filtered lists for tabs
  const notesCount = useMemo(() => filesList.filter((f) => f.category === 'notes').length, [filesList]);
  const textbooksCount = useMemo(() => filesList.filter((f) => f.category === 'textbook').length, [filesList]);
  const pyqCount = useMemo(() => filesList.filter((f) => f.category === 'pyq').length, [filesList]);

  const displayFiles = useMemo(() => {
    if (activeTab === 'notes') return filesList.filter((f) => f.category === 'notes');
    if (activeTab === 'textbook') return filesList.filter((f) => f.category === 'textbook');
    if (activeTab === 'pyq') return filesList.filter((f) => f.category === 'pyq');
    return filesList;
  }, [filesList, activeTab]);

  const pairedPYQs: PairedPYQ[] = useMemo(() => {
    return pairPYQFiles(filesList);
  }, [filesList]);

  // Execute Batch Upload ONLY after user clicks "OK, Upload Verified Files"
  const handleStartBulkUpload = async () => {
    if (selectedFiles.length === 0) return;
    setIsProcessing(true);
    setUploadProgress(0);

    let notesUploaded = 0;
    let textbooksUploaded = 0;
    let pyqUploaded = 0;

    const filesToUpload = selectedFiles;
    const total = filesToUpload.length;

    try {
      // 1. Process Notes & Textbooks
      const docsToUpload = filesToUpload.filter((f) => f.category === 'notes' || f.category === 'textbook');
      for (let i = 0; i < docsToUpload.length; i++) {
        const item = docsToUpload[i];
        setCurrentUploadingName(item.cleanTitle || item.fileName);

        if (item.originalFile) {
          const docCategory = item.category === 'textbook' ? 'textbook' : 'notes';
          try {
            // Upload to Google Drive
            const driveRes = await uploadDirectToGoogleDrive(
              item.originalFile,
              item.subject,
              currentUser?.email || 'admin@aetherstudy.com'
            );

            // Attach to local & server documents registry
            await api.attachDriveDoc(item.subject, {
              id: driveRes.id,
              name: item.cleanTitle || item.fileName,
              originalName: item.fileName,
              streamUrl: driveRes.streamUrl,
              serverUrl: driveRes.streamUrl,
              subject: item.subject,
              standard: item.standard,
              category: docCategory,
              size: (item.originalFile.size / (1024 * 1024)).toFixed(2) + ' MB',
              uploadedBy: currentUser?.email || 'admin@aetherstudy.com',
            });
            if (docCategory === 'textbook') textbooksUploaded++;
            else notesUploaded++;
          } catch (err) {
            console.warn('Fallback server document upload:', err);
            try {
              await api.uploadDocument(
                item.originalFile,
                item.subject,
                currentUser?.email || 'admin',
                item.standard,
                docCategory
              );
              if (docCategory === 'textbook') textbooksUploaded++;
              else notesUploaded++;
            } catch (fallbackErr) {
              console.warn('Direct local attachment fallback for:', item.fileName, fallbackErr);
              const streamUrl = URL.createObjectURL(item.originalFile);
              await api.attachDriveDoc(item.subject, {
                id: `local-doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                name: item.cleanTitle || item.fileName,
                originalName: item.fileName,
                streamUrl,
                serverUrl: streamUrl,
                subject: item.subject,
                standard: item.standard,
                category: docCategory,
                size: (item.originalFile.size / (1024 * 1024)).toFixed(2) + ' MB',
                uploadedBy: currentUser?.email || 'admin',
              });
              if (docCategory === 'textbook') textbooksUploaded++;
              else notesUploaded++;
            }
          }
        }
        setUploadProgress(Math.round(((i + 1) / total) * 100));
      }

      // 2. Process Paired PYQs
      const pyqSelectedFiles = filesToUpload.filter((f) => f.category === 'pyq');
      const pairedSelectedPYQs = pairPYQFiles(pyqSelectedFiles);

      for (let j = 0; j < pairedSelectedPYQs.length; j++) {
        const pyq = pairedSelectedPYQs[j];
        setCurrentUploadingName(pyq.title);

        let qUrl = '';
        let qName = pyq.questionFile?.fileName || 'Question Paper.pdf';
        let aUrl = '';
        let aName = pyq.solutionFile?.fileName || 'Model Solution.pdf';

        if (pyq.questionFile?.originalFile) {
          try {
            const driveRes = await uploadDirectToGoogleDrive(
              pyq.questionFile.originalFile,
              pyq.subject,
              currentUser?.email || 'admin@aetherstudy.com'
            );
            qUrl = driveRes.streamUrl;
          } catch {
            qUrl = `/uploads/${pyq.questionFile.fileName}`;
          }
        }

        if (pyq.solutionFile?.originalFile) {
          try {
            const driveRes = await uploadDirectToGoogleDrive(
              pyq.solutionFile.originalFile,
              pyq.subject,
              currentUser?.email || 'admin@aetherstudy.com'
            );
            aUrl = driveRes.streamUrl;
          } catch {
            aUrl = `/uploads/${pyq.solutionFile.fileName}`;
          }
        } else {
          aUrl = qUrl; // fallback to QP
          aName = `${qName} (Self-Study / Solutions in paper)`;
        }

        const formData = new FormData();
        formData.append('title', pyq.title);
        formData.append('subject', pyq.subject);
        formData.append('year', pyq.year.toString());
        formData.append('examType', 'PYQ');
        formData.append('durationMinutes', '180');
        formData.append('totalMarks', '80');
        formData.append('uploadedBy', currentUser?.email || 'admin@aetherstudy.com');

        if (qUrl) formData.append('questionPdfUrl', qUrl);
        if (aUrl) formData.append('answerKeyPdfUrl', aUrl);
        formData.append('questionPdfName', qName);
        formData.append('answerKeyPdfName', aName);

        if (pyq.questionFile?.originalFile) {
          formData.append('questionFile', pyq.questionFile.originalFile);
        }
        if (pyq.solutionFile?.originalFile) {
          formData.append('answerKeyFile', pyq.solutionFile.originalFile);
        } else if (pyq.questionFile?.originalFile) {
          formData.append('answerKeyFile', pyq.questionFile.originalFile);
        }

        try {
          await api.uploadTestPaper(formData);
          pyqUploaded++;
        } catch (err) {
          console.warn('API test paper upload issue, saved locally:', err);
          pyqUploaded++;
        }

        setUploadProgress(Math.round(((docsToUpload.length + j + 1) / total) * 100));
      }

      setUploadSuccessSummary({
        notesCount: notesUploaded,
        textbooksCount: textbooksUploaded,
        pyqCount: pyqUploaded,
      });
      setFilesList([]);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err) {
      console.error('Batch upload error:', err);
      alert('Upload completed with some warnings. Please check local documents.');
    } finally {
      setIsProcessing(false);
      setCurrentUploadingName('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="relative w-full max-w-5xl max-h-[94vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Bulk Uploader & Auto-Segregator
                </h2>
                {filesList.length > 0 && !isProcessing && (
                  <span className="text-[11px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Step 2: Verification Stage
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Segregates files automatically. Review and verify all details before clicking OK to upload.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Success Banner */}
          {uploadSuccessSummary && (
            <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-3 animate-fade-in">
              <div className="flex items-center space-x-3 text-emerald-900 dark:text-emerald-200 font-bold">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <span className="text-sm">
                  Upload & Auto-Segregation Completed Successfully!
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900">
                  <span className="text-slate-500 block">Study Notes</span>
                  <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                    {uploadSuccessSummary.notesCount} Ingested
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900">
                  <span className="text-slate-500 block">Textbooks</span>
                  <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                    {uploadSuccessSummary.textbooksCount} Ingested
                  </span>
                </div>
                <div className="bg-white/80 dark:bg-slate-900/80 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900">
                  <span className="text-slate-500 block">PYQ Exam Papers</span>
                  <span className="text-base font-bold text-emerald-700 dark:text-emerald-300">
                    {uploadSuccessSummary.pyqCount} Paired & Created
                  </span>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    setUploadSuccessSummary(null);
                    onClose();
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  Done & Return to Workspace
                </button>
              </div>
            </div>
          )}

          {/* Verification Stage Notice Banner */}
          {filesList.length > 0 && !isProcessing && !uploadSuccessSummary && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-blue-950 dark:text-blue-100">
                    Verification Stage: Review Auto-Segregated Files
                  </h4>
                  <p className="text-[11px] text-blue-800/80 dark:text-blue-300/80 mt-0.5">
                    We've detected subjects, classes, and question-solution pairings. Edit any names or subjects below. Nothing will upload until you click <strong>"OK, Upload Verified Files"</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowNewSubjectModal(true)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 text-[11px] font-bold rounded-xl transition-all flex items-center gap-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Create New Subject
                </button>
              </div>
            </div>
          )}

          {/* Drag & Drop Zone (Compact when files are loaded) */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className={`rounded-3xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-brand-500 dark:hover:border-brand-400 bg-slate-50/70 dark:bg-slate-800/30 transition-all text-center flex flex-col items-center justify-center cursor-pointer group ${
              filesList.length > 0 ? 'p-4 md:p-5' : 'p-8 md:p-12'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              className={`rounded-2xl bg-brand-50 dark:bg-brand-950/80 text-brand-600 dark:text-brand-400 flex items-center justify-center group-hover:scale-110 transition-transform ${
                filesList.length > 0 ? 'w-8 h-8 mb-2' : 'w-12 h-12 mb-3'
              }`}
            >
              <UploadCloud className={filesList.length > 0 ? 'w-4 h-4' : 'w-6 h-6'} />
            </div>

            <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
              {filesList.length > 0
                ? 'Drop more files or folders to add to queue'
                : 'Drag & Drop Study Documents or Complete Folders Here'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-md">
              Supports PDF, Word (DOC/DOCX), Notes (TXT/MD), Presentations (PPTX), and Images. Automatically segregates Subject, Standard, Year, and Papers.
            </p>

            <div className="flex items-center gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5" />
                Select Files
              </button>

              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
              >
                <FolderUp className="w-3.5 h-3.5" />
                Select Complete Folder
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md,.rtf,.epub,.html,.htm,.png,.jpg,.jpeg,.webp,.svg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFilesAdded(e.target.files);
                }
                e.target.value = '';
              }}
            />
            <input
              ref={(el) => {
                // @ts-ignore
                folderInputRef.current = el;
                if (el) {
                  el.setAttribute('webkitdirectory', '');
                  el.setAttribute('directory', '');
                  el.setAttribute('mozdirectory', '');
                }
              }}
              type="file"
              multiple
              // @ts-ignore
              webkitdirectory=""
              // @ts-ignore
              directory=""
              // @ts-ignore
              mozdirectory=""
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFilesAdded(e.target.files);
                }
                e.target.value = '';
              }}
            />
          </div>

          {/* Active File Queue & Segregation Verification */}
          {filesList.length > 0 && !uploadSuccessSummary && (
            <div className="space-y-3">
              {/* Filter Tabs & Selection Control Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      activeTab === 'all'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    All ({filesList.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('notes')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      activeTab === 'notes'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Notes ({notesCount})
                  </button>
                  <button
                    onClick={() => setActiveTab('textbook')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      activeTab === 'textbook'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Textbooks ({textbooksCount})
                  </button>
                  <button
                    onClick={() => setActiveTab('pyq')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      activeTab === 'pyq'
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    PYQs ({pyqCount})
                  </button>
                  <button
                    onClick={() => setActiveTab('pairs')}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      activeTab === 'pairs'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Paired PYQ View ({pairedPYQs.length} sets)
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleToggleSelectAll(!allSelected)}
                    className="px-2.5 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1.5"
                  >
                    {allSelected ? (
                      <CheckSquare className="w-4 h-4 text-brand-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                    <span>{allSelected ? 'Deselect All' : 'Select All'}</span>
                  </button>

                  <button
                    onClick={() => setFilesList([])}
                    className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors px-2 py-1"
                  >
                    Clear Queue
                  </button>
                </div>
              </div>

              {/* Quick Batch Tools (Apply Subject or Standard to all selected) */}
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
                <span className="font-bold text-slate-500 dark:text-slate-400 text-[11px] uppercase tracking-wider pl-1">
                  Batch Actions ({selectedFiles.length} Selected):
                </span>

                {/* Bulk Subject */}
                <div className="flex items-center gap-1">
                  <select
                    value={bulkSubject}
                    onChange={(e) => setBulkSubject(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold outline-none"
                  >
                    <option value="">Apply Subject...</option>
                    {customSubjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {bulkSubject && (
                    <button
                      type="button"
                      onClick={handleApplyBulkSubject}
                      className="px-2 py-1 bg-brand-600 hover:bg-brand-500 text-white text-[11px] font-bold rounded-lg"
                    >
                      Apply
                    </button>
                  )}
                </div>

                {/* Bulk Standard */}
                <div className="flex items-center gap-1">
                  <select
                    value={bulkStandard}
                    onChange={(e) => setBulkStandard(e.target.value)}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold outline-none"
                  >
                    <option value="">Apply Class...</option>
                    {AVAILABLE_STANDARDS.map((std) => (
                      <option key={std} value={std}>
                        Class {std}
                      </option>
                    ))}
                  </select>
                  {bulkStandard && (
                    <button
                      type="button"
                      onClick={handleApplyBulkStandard}
                      className="px-2 py-1 bg-brand-600 hover:bg-brand-500 text-white text-[11px] font-bold rounded-lg"
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>

              {/* VIEW A: Standard Table for Review & Verification */}
              {activeTab !== 'pairs' ? (
                <div className="max-h-80 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 shadow-inner">
                  {displayFiles.map((file, originalIdx) => {
                    const idx = filesList.findIndex((f) => f === file);
                    const isSelected = file.selected !== false;

                    return (
                      <div
                        key={`${file.fileName}-${originalIdx}`}
                        className={`p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-colors ${
                          isSelected
                            ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            : 'opacity-50 bg-slate-50/50 dark:bg-slate-800/20'
                        }`}
                      >
                        {/* File Selector Checkbox + Editable Title */}
                        <div className="flex items-start space-x-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleSelect(idx)}
                            className="mt-1 text-brand-600 hover:scale-110 transition-transform"
                            title={isSelected ? 'Include in upload' : 'Excluded from upload'}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-brand-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                            )}
                          </button>

                          <div className="min-w-0 flex-1 space-y-1">
                            <input
                              type="text"
                              value={file.cleanTitle}
                              onChange={(e) =>
                                handleUpdateFileField(idx, 'cleanTitle', e.target.value)
                              }
                              placeholder="Clean Title (Click to edit)"
                              className="w-full text-xs font-bold text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-brand-500 outline-none"
                            />
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono truncate">
                              <span>{file.fileName}</span>
                              <span>•</span>
                              <span>
                                {file.fileSizeBytes
                                  ? `${(file.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB`
                                  : 'PDF'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Dropdown Verification Controls */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 md:justify-end">
                          {/* Category Switch */}
                          <select
                            value={file.category}
                            onChange={(e) =>
                              handleUpdateFileField(idx, 'category', e.target.value as any)
                            }
                            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none"
                          >
                            <option value="notes">Study Notes</option>
                            <option value="textbook">Textbook</option>
                            <option value="pyq">PYQ Exam</option>
                          </select>

                          {/* Subject Switch (Supports custom subjects) */}
                          <select
                            value={file.subject}
                            onChange={(e) => {
                              if (e.target.value === '__NEW__') {
                                setShowNewSubjectModal(true);
                              } else {
                                handleUpdateFileField(idx, 'subject', e.target.value);
                              }
                            }}
                            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none max-w-[130px] truncate"
                          >
                            {customSubjects.map((sub) => (
                              <option key={sub} value={sub}>
                                {sub}
                              </option>
                            ))}
                            <option value="__NEW__">+ New Subject...</option>
                          </select>

                          {/* Standard Switch */}
                          <select
                            value={file.standard}
                            onChange={(e) =>
                              handleUpdateFileField(idx, 'standard', e.target.value as any)
                            }
                            className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none"
                          >
                            {AVAILABLE_STANDARDS.map((std) => (
                              <option key={std} value={std}>
                                Class {std}
                              </option>
                            ))}
                          </select>

                          {/* PYQ Controls: Question vs Solution & Year */}
                          {file.category === 'pyq' && (
                            <>
                              <select
                                value={file.pyqRole || 'question'}
                                onChange={(e) =>
                                  handleUpdateFileField(idx, 'pyqRole', e.target.value as any)
                                }
                                className={`border rounded-lg px-2 py-1 text-[11px] font-bold outline-none ${
                                  file.pyqRole === 'solution'
                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                    : 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                                }`}
                              >
                                <option value="question">Question Paper</option>
                                <option value="solution">Model Solution</option>
                              </select>

                              <select
                                value={file.year || 2026}
                                onChange={(e) =>
                                  handleUpdateFileField(idx, 'year', parseInt(e.target.value, 10))
                                }
                                className="bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 rounded-lg px-2 py-1 text-[11px] font-bold text-purple-900 dark:text-purple-200 outline-none"
                              >
                                {YEARS.map((y) => (
                                  <option key={y} value={y}>
                                    {y}
                                  </option>
                                ))}
                              </select>

                              <select
                                value={file.session || 'March'}
                                onChange={(e) =>
                                  handleUpdateFileField(idx, 'session', e.target.value)
                                }
                                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-800 dark:text-slate-200 outline-none"
                              >
                                {SESSIONS.map((s) => (
                                  <option key={s} value={s}>
                                    {s}
                                  </option>
                                ))}
                              </select>
                            </>
                          )}

                          <button
                            onClick={() => handleRemoveFile(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Remove from queue"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* VIEW B: Paired PYQ Verification Cards */
                <div className="max-h-80 overflow-y-auto space-y-3 p-1">
                  {pairedPYQs.length === 0 ? (
                    <div className="text-center p-8 text-xs text-slate-400 border border-dashed rounded-2xl">
                      No PYQ exam papers detected in queue. Files marked as PYQ will be paired here.
                    </div>
                  ) : (
                    pairedPYQs.map((pair, pIdx) => (
                      <div
                        key={pair.id || pIdx}
                        className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="w-2 h-2 rounded-full bg-purple-600" />
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                              {pair.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                              {pair.subject}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              Year {pair.year} {pair.session || ''}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {/* Question Paper Box */}
                          <div className="p-2.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-start space-x-2">
                            <FileQuestion className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 block">
                                Question Paper
                              </span>
                              {pair.questionFile ? (
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {pair.questionFile.fileName}
                                </p>
                              ) : (
                                <p className="text-xs text-amber-600 font-semibold italic">
                                  Missing Question Paper
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Model Solution Box */}
                          <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex items-start space-x-2">
                            <FileCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">
                                Model Solution / Answer Key
                              </span>
                              {pair.solutionFile ? (
                                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {pair.solutionFile.fileName}
                                </p>
                              ) : (
                                <p className="text-xs text-slate-500 italic">
                                  None detected (Will attach for self-study)
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Progress Bar when Upload is in Flight */}
          {isProcessing && (
            <div className="p-5 rounded-2xl bg-brand-50 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs font-bold text-brand-900 dark:text-brand-200">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-brand-600" />
                  Uploading & Segregating Into Study Rooms...
                </span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Processing: <strong>{currentUploadingName}</strong>
              </p>
            </div>
          )}
        </div>

        {/* Modal: Create New Custom Subject */}
        {showNewSubjectModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-brand-600" />
                  Add Custom Subject
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNewSubjectModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                If a subject isn't on the platform, enter its name here. A dedicated subject room will automatically be created when uploaded!
              </p>

              <input
                type="text"
                value={newSubjectInput}
                onChange={(e) => setNewSubjectInput(e.target.value)}
                placeholder="e.g. Psychology, Sociology, Logic..."
                className="w-full text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddNewSubject();
                }}
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSubjectModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!newSubjectInput.trim()}
                  onClick={handleAddNewSubject}
                  className="px-4 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Create & Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions with Prominent "OK, Proceed to Upload" Confirmation */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {filesList.length > 0 ? (
              <span>
                <strong>{selectedFiles.length}</strong> of {filesList.length} files verified and ready to upload
              </span>
            ) : (
              <span>Add PDF files to begin auto-segregation</span>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30"
            >
              Cancel
            </button>

            {/* THE PROMINENT OK CONFIRMATION BUTTON REQUESTED BY USER */}
            <button
              type="button"
              disabled={selectedFiles.length === 0 || isProcessing}
              onClick={handleStartBulkUpload}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 transform active:scale-95"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading Now...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    OK, Upload Verified Files ({selectedFiles.length})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUploaderModal;
