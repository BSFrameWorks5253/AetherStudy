import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
  ExternalLink,
  RefreshCw,
  FileText,
  Smartphone,
  Bookmark,
  BookmarkCheck,
  List,
  X,
  History,
  Trash2,
  ArrowLeft,
} from 'lucide-react';
import { readingMemory, getCanonicalDocKey, DocBookmark } from '../../services/readingMemory';
import { transformDocumentUrl } from '../../utils/urlTransformer';

// Configure offline local PDF.js worker with cdnjs fallback
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      window.location.origin + '/pdf.worker.min.js';
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

interface UniversalPdfViewerProps {
  url: string;
  title?: string;
  subtitle?: string;
  initialPage?: number;
  className?: string;
  onClose?: () => void;
  backLabel?: string;
}

export const UniversalPdfViewer: React.FC<UniversalPdfViewerProps> = ({
  url,
  title = 'Document',
  subtitle,
  initialPage,
  className = '',
  onClose,
  backLabel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  const docKey = React.useMemo(() => getCanonicalDocKey(url, title), [url, title]);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(() => {
    if (initialPage && initialPage > 0) return initialPage;
    const saved = readingMemory.getProgress(docKey);
    return saved && saved.currentPage > 1 ? saved.currentPage : 1;
  });
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) return 0.95;
      if (window.innerWidth < 1024) return 1.2;
      return 1.4;
    }
    return 1.4;
  });
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fallbackMode, setFallbackMode] = useState<'canvas' | 'native' | 'gdocs'>('canvas');

  // Resume notification state
  const [resumeNotification, setResumeNotification] = useState<{
    page: number;
    total: number;
  } | null>(null);

  // Quick page jump state
  const [isEditingPage, setIsEditingPage] = useState<boolean>(false);
  const [pageInputVal, setPageInputVal] = useState<string>('');

  // Bookmarks state
  const [showBookmarksDrawer, setShowBookmarksDrawer] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<DocBookmark[]>(() => readingMemory.getBookmarks(docKey));
  const isCurrentPageBookmarked = readingMemory.isBookmarked(docKey, currentPage);

  const urlBundle = React.useMemo(() => transformDocumentUrl(url), [url]);
  const isGoogleDrive = urlBundle.isDrive;

  // Convert relative paths to absolute URLs so Web Workers can resolve them
  const safePdfUrl = React.useMemo(() => {
    if (!url) return '';
    if (urlBundle.isDrive) {
      return urlBundle.previewUrl;
    }

    const absolute =
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('blob:') ||
      url.startsWith('data:')
        ? url
        : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;

    try {
      const decoded = decodeURI(absolute);
      return encodeURI(decoded);
    } catch {
      return encodeURI(absolute);
    }
  }, [url, urlBundle]);

  // Load PDF Document & Restore Progress
  useEffect(() => {
    if (!safePdfUrl || isGoogleDrive) {
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setError(null);

    const localCmap = `${window.location.origin}/cmaps/`;
    const loadingTask = pdfjsLib.getDocument({
      url: safePdfUrl,
      cMapUrl: localCmap,
      cMapPacked: true,
    });

    loadingTask.promise
      .then((loadedDoc: any) => {
        if (isCancelled) return;
        setPdfDoc(loadedDoc);
        const total = loadedDoc.numPages;
        setNumPages(total);
        setLoading(false);

        // Check for last read memory
        const saved = readingMemory.getProgress(docKey);
        const targetPage = initialPage && initialPage > 0
          ? initialPage
          : saved && saved.currentPage > 1 && saved.currentPage <= total
          ? saved.currentPage
          : 1;

        setCurrentPage(targetPage);

        if (saved && saved.currentPage > 1 && (!initialPage || initialPage === saved.currentPage)) {
          setResumeNotification({
            page: saved.currentPage,
            total,
          });
          // Auto dismiss after 6 seconds
          const t = setTimeout(() => {
            setResumeNotification(null);
          }, 6000);
          return () => clearTimeout(t);
        }
      })
      .catch((err: any) => {
        if (isCancelled) return;
        console.warn('PDF.js canvas load failed, switching to native browser PDF engine:', err);
        setError('Canvas engine notice');
        setFallbackMode('native');
        setLoading(false);
      });

    return () => {
      isCancelled = true;
      try {
        loadingTask.destroy();
      } catch {}
    };
  }, [safePdfUrl, isGoogleDrive, docKey, initialPage]);

  // Save reading progress whenever page changes
  useEffect(() => {
    if (numPages > 0 && currentPage > 0) {
      readingMemory.saveProgress(docKey, title, currentPage, numPages);
    }
  }, [docKey, title, currentPage, numPages]);

  // Keep bookmarks state in sync
  useEffect(() => {
    setBookmarks(readingMemory.getBookmarks(docKey));
  }, [docKey, currentPage]);

  // Render Page to Canvas with collision avoidance
  useEffect(() => {
    if (!pdfDoc || isGoogleDrive || error || fallbackMode !== 'canvas') return;

    let isCancelled = false;

    // Cancel any in-flight render task to prevent canvas collision
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
      renderTaskRef.current = null;
    }

    pdfDoc.getPage(currentPage).then((page: any) => {
      if (isCancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: scale, rotation: rotation });

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const task = page.render(renderContext);
      renderTaskRef.current = task;

      task.promise
        .then(() => {
          renderTaskRef.current = null;
        })
        .catch((err: any) => {
          if (err?.name === 'RenderingCancelledException') return;
          console.warn('Canvas render error, falling back to Native Engine:', err);
          setFallbackMode('native');
        });
    });

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {}
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, currentPage, scale, rotation, isGoogleDrive, error, fallbackMode]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < numPages) setCurrentPage((prev) => prev + 1);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.6));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Direct page jump form submit
  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInputVal, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      setCurrentPage(p);
    }
    setIsEditingPage(false);
    setPageInputVal('');
  };

  // Toggle bookmark on current page
  const handleToggleBookmark = () => {
    if (isCurrentPageBookmarked) {
      readingMemory.removeBookmark(docKey, currentPage);
    } else {
      readingMemory.addBookmark(docKey, currentPage, `Page ${currentPage}`);
    }
    setBookmarks(readingMemory.getBookmarks(docKey));
  };

  const readPercent = numPages > 0 ? Math.round((currentPage / numPages) * 100) : 0;

  // Google Drive Embed View
  if (isGoogleDrive) {
    return (
      <div className={`relative w-full h-full flex flex-col bg-slate-900 ${className}`}>
        <iframe
          src={safePdfUrl}
          title={title}
          allow="autoplay; fullscreen"
          className="w-full h-full bg-white border-0"
        />
      </div>
    );
  }

  // Native Browser PDF Engine Fallback
  if (fallbackMode === 'native') {
    return (
      <div className={`relative w-full h-full flex flex-col bg-slate-900 ${className}`}>
        <div className="p-2.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs text-slate-300 gap-2 shrink-0">
          <div className="flex items-center space-x-2 truncate">
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-xl bg-slate-700 hover:bg-brand-600 text-white text-xs font-bold transition-all border border-slate-600 cursor-pointer shrink-0 mr-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{backLabel || 'Back'}</span>
              </button>
            )}
            <Smartphone className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            <span className="truncate font-semibold">{title}</span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => {
                setError(null);
                setFallbackMode('canvas');
              }}
              className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-white transition-colors cursor-pointer"
            >
              Interactive Canvas
            </button>
            <button
              onClick={() => setFallbackMode('gdocs')}
              className="px-2 py-1 rounded-lg bg-purple-700 hover:bg-purple-600 text-[10px] font-bold text-white transition-colors cursor-pointer"
            >
              Google Engine
            </button>
            <a
              href={safePdfUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
            >
              <ExternalLink className="w-3 h-3" /> Open in PDF App ↗
            </a>
          </div>
        </div>
        <div className="w-full flex-1 relative bg-slate-950 flex flex-col">
          <object
            data={safePdfUrl}
            type="application/pdf"
            className="w-full h-full flex-1 bg-white"
          >
            <iframe
              src={safePdfUrl}
              title={title}
              className="w-full h-full bg-white border-0"
            />
          </object>
        </div>
      </div>
    );
  }

  // Google Docs Engine Fallback
  if (fallbackMode === 'gdocs') {
    const gdocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(safePdfUrl)}&embedded=true`;
    return (
      <div className={`relative w-full h-full flex flex-col bg-slate-900 ${className}`}>
        <div className="p-2.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs text-slate-300 gap-2 shrink-0">
          <div className="flex items-center space-x-2 truncate">
            <Smartphone className="w-3.5 h-3.5 text-brand-400 shrink-0" />
            <span className="truncate font-semibold">{title}</span>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => {
                setError(null);
                setFallbackMode('canvas');
              }}
              className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-white transition-colors cursor-pointer"
            >
              Retry Canvas
            </button>
            <button
              onClick={() => setFallbackMode('native')}
              className="px-2 py-1 rounded-lg bg-blue-700 hover:bg-blue-600 text-[10px] font-bold text-white transition-colors cursor-pointer"
            >
              Direct Embed
            </button>
            <a
              href={safePdfUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-[10px] flex items-center gap-1 shadow-xs"
            >
              <ExternalLink className="w-3 h-3" /> Open in PDF App ↗
            </a>
          </div>
        </div>
        <iframe
          src={gdocsUrl}
          title={title}
          allow="autoplay; fullscreen"
          className="w-full flex-1 bg-white border-0"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col bg-slate-900 overflow-hidden select-none ${className}`}
    >
      {/* Visual Reading Progress Bar at the Top Edge */}
      <div className="w-full h-1 bg-slate-800 shrink-0 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-brand-500 transition-all duration-300 ease-out"
          style={{ width: `${readPercent}%` }}
        />
      </div>

      {/* Top Floating Reader Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-slate-900/95 backdrop-blur-md border-b border-white/10 text-white z-10 gap-2 shrink-0">
        {/* Document Title / Status & Reading Progress */}
        <div className="flex items-center space-x-2 truncate max-w-[280px] sm:max-w-md">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-brand-600 text-white text-xs font-bold transition-all border border-slate-700/80 cursor-pointer shrink-0 mr-1"
              title="Return to previous screen"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{backLabel || 'Back'}</span>
            </button>
          )}
          <FileText className="w-4 h-4 text-brand-400 shrink-0" />
          <div className="truncate flex flex-col">
            <span className="text-xs font-bold text-slate-100 truncate leading-tight">{title}</span>
            <span className="text-[10px] text-slate-400 truncate font-medium">
              {subtitle ? `${subtitle} • ` : ''}{readPercent}% read • Page {currentPage} of {numPages || 1}
            </span>
          </div>
        </div>

        {/* Page Navigators & Direct Jumper */}
        <div className="flex items-center space-x-1">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors cursor-pointer"
            title="Previous Page (Left Arrow)"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {isEditingPage ? (
            <form onSubmit={handleJumpSubmit} className="flex items-center">
              <input
                type="number"
                min={1}
                max={numPages || 1}
                value={pageInputVal}
                onChange={(e) => setPageInputVal(e.target.value)}
                autoFocus
                onBlur={() => setIsEditingPage(false)}
                className="w-14 px-1.5 py-0.5 text-xs text-center font-mono font-bold bg-slate-800 text-white border border-brand-500 rounded-lg focus:outline-none"
              />
              <span className="text-xs text-slate-400 ml-1">/ {numPages}</span>
            </form>
          ) : (
            <button
              onClick={() => {
                setPageInputVal(currentPage.toString());
                setIsEditingPage(true);
              }}
              className="px-2 py-1 rounded-lg hover:bg-slate-800 text-xs font-bold text-slate-200 font-mono transition-colors cursor-pointer group"
              title="Click to jump to specific page"
            >
              {loading ? '...' : `${currentPage} / ${numPages || 1}`}
              <span className="hidden group-hover:inline text-[9px] text-brand-400 ml-1">✎</span>
            </button>
          )}

          <button
            onClick={handleNextPage}
            disabled={currentPage >= numPages || loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors cursor-pointer"
            title="Next Page (Right Arrow)"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Bookmarks, Zoom & Transform Controls */}
        <div className="flex items-center space-x-1">
          {/* Bookmark Current Page Button */}
          <button
            onClick={handleToggleBookmark}
            disabled={loading}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isCurrentPageBookmarked
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title={isCurrentPageBookmarked ? 'Remove Bookmark' : 'Bookmark this Page'}
          >
            {isCurrentPageBookmarked ? (
              <BookmarkCheck className="w-4 h-4 text-amber-400 fill-amber-400" />
            ) : (
              <Bookmark className="w-4 h-4" />
            )}
          </button>

          {/* Bookmarks List Drawer Toggle */}
          <button
            onClick={() => setShowBookmarksDrawer(!showBookmarksDrawer)}
            className={`p-1.5 rounded-lg relative transition-colors cursor-pointer ${
              showBookmarksDrawer
                ? 'bg-brand-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="View Saved Bookmarks"
          >
            <List className="w-4 h-4" />
            {bookmarks.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-[9px] font-bold text-slate-900 flex items-center justify-center">
                {bookmarks.length}
              </span>
            )}
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="hidden sm:inline-block px-1.5 text-[11px] font-bold text-slate-400 font-mono">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={handleRotate}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <a
            href={safePdfUrl}
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors shrink-0 ml-1"
            title="Open in native mobile PDF viewer app"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open in App</span>
          </a>
        </div>
      </div>

      {/* "Last Read Page Resumed" Floating Toast Alert */}
      {resumeNotification && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-2xl bg-slate-900/95 border border-emerald-500/50 shadow-xl backdrop-blur-md flex items-center space-x-3 text-xs text-white animate-fade-in">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <History className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center space-x-2">
            <span>
              Resumed where you left off at{' '}
              <strong className="text-emerald-400 font-bold">Page {resumeNotification.page}</strong> of{' '}
              {resumeNotification.total}
            </span>
            <button
              onClick={() => {
                setCurrentPage(1);
                setResumeNotification(null);
              }}
              className="text-[11px] font-bold text-brand-400 hover:underline px-1.5 py-0.5 rounded-md hover:bg-white/5 cursor-pointer"
            >
              Start from Page 1
            </button>
          </div>
          <button
            onClick={() => setResumeNotification(null)}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bookmarks Popover Drawer */}
      {showBookmarksDrawer && (
        <div className="absolute top-14 right-4 z-30 w-72 max-h-96 rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl backdrop-blur-md flex flex-col overflow-hidden text-slate-200 animate-fade-in">
          <div className="p-3 bg-slate-800/80 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bookmark className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white">Document Bookmarks</span>
            </div>
            <button
              onClick={() => setShowBookmarksDrawer(false)}
              className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-2 overflow-y-auto divide-y divide-white/5 max-h-72">
            {bookmarks.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                <Bookmark className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="font-semibold text-slate-300">No bookmarks yet</p>
                <p className="text-[11px] mt-1 text-slate-500">
                  Click the bookmark icon on any page to save formulas, balances, or key points.
                </p>
              </div>
            ) : (
              bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className={`flex items-center justify-between p-2 rounded-xl transition-colors ${
                    bm.page === currentPage
                      ? 'bg-amber-500/10 border border-amber-500/20'
                      : 'hover:bg-slate-800/50'
                  }`}
                >
                  <button
                    onClick={() => {
                      setCurrentPage(bm.page);
                      setShowBookmarksDrawer(false);
                    }}
                    className="flex-1 text-left flex items-center space-x-2.5 truncate cursor-pointer"
                  >
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs shrink-0">
                      p. {bm.page}
                    </span>
                    <span className="text-xs text-slate-200 truncate font-medium">
                      {bm.title || `Page ${bm.page}`}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      readingMemory.removeBookmark(docKey, bm.page);
                      setBookmarks(readingMemory.getBookmarks(docKey));
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors ml-1 cursor-pointer"
                    title="Delete bookmark"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 bg-slate-800/50 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Page {currentPage} is{' '}
              {isCurrentPageBookmarked ? (
                <strong className="text-amber-400">Bookmarked</strong>
              ) : (
                'not bookmarked'
              )}
            </span>
            <button
              onClick={handleToggleBookmark}
              className="text-amber-400 hover:underline font-bold cursor-pointer"
            >
              {isCurrentPageBookmarked ? 'Remove' : '+ Bookmark Page'}
            </button>
          </div>
        </div>
      )}

      {/* Main Canvas Scroll Area */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative bg-slate-950/80">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-xs z-20">
            <RefreshCw className="w-7 h-7 text-brand-500 animate-spin mb-2" />
            <p className="text-xs font-bold text-slate-200">
              Rendering PDF directly in website...
            </p>
          </div>
        )}

        <div className="max-w-full max-h-full flex items-center justify-center shadow-2xl rounded-xl overflow-hidden bg-white">
          <canvas ref={canvasRef} className="block max-w-full h-auto" />
        </div>
      </div>
    </div>
  );
};

export default UniversalPdfViewer;
