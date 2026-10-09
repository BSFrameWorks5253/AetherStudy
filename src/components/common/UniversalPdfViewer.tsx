import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCw,
  ExternalLink,
  RefreshCw,
  FileText,
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

  const docKey = useMemo(() => getCanonicalDocKey(url, title), [url, title]);
  const urlBundle = useMemo(() => transformDocumentUrl(url), [url]);
  const isGoogleDrive = urlBundle.isDrive;

  // View state
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
  const [engineMode, setEngineMode] = useState<'canvas' | 'drive' | 'gdocs' | 'native'>(() => {
    return isGoogleDrive ? 'drive' : 'canvas';
  });

  // Resume notification state
  const [resumeNotification, setResumeNotification] = useState<{
    page: number;
    total: number;
  } | null>(null);

  // Bookmarks state
  const [showBookmarksDrawer, setShowBookmarksDrawer] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<DocBookmark[]>(() => readingMemory.getBookmarks(docKey));
  const isCurrentPageBookmarked = readingMemory.isBookmarked(docKey, currentPage);

  // Quick page jump state
  const [isEditingPage, setIsEditingPage] = useState<boolean>(false);
  const [pageInputVal, setPageInputVal] = useState<string>('');

  // Swipe hint state
  const [showSwipeHint, setShowSwipeHint] = useState<boolean>(true);

  // Gesture tracking refs
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const lastWheelTime = useRef<number>(0);

  // Convert relative paths to absolute URLs so Web Workers can resolve them
  const safePdfUrl = useMemo(() => {
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

  // Page advancement helpers
  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => {
      if (numPages > 0 && prev < numPages) return prev + 1;
      return prev;
    });
    setShowSwipeHint(false);
  }, [numPages]);

  const goToPrevPage = useCallback(() => {
    setCurrentPage((prev) => {
      if (prev > 1) return prev - 1;
      return prev;
    });
    setShowSwipeHint(false);
  }, []);

  // ==============================================================
  // SWIPE DOWN / UP & WHEEL NAVIGATION HANDLERS (NO BUTTON NAV)
  // ==============================================================
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endY = e.changedTouches[0].clientY;
    const endX = e.changedTouches[0].clientX;
    const diffY = touchStartY.current - endY;
    const diffX = touchStartX.current - endX;

    // Verify vertical swipe gesture (must exceed 45px and be more vertical than horizontal)
    if (Math.abs(diffY) > 45 && Math.abs(diffY) > Math.abs(diffX)) {
      if (diffY > 0) {
        // Swiped UP -> Advance to Next Page
        goToNextPage();
      } else {
        // Swiped DOWN -> Go to Previous Page
        goToPrevPage();
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const now = Date.now();
    // 300ms debounce to prevent skipping multiple pages on single wheel roll
    if (now - lastWheelTime.current < 300) return;

    if (Math.abs(e.deltaY) > 35) {
      lastWheelTime.current = now;
      if (e.deltaY > 0) {
        goToNextPage();
      } else {
        goToPrevPage();
      }
    }
  };

  // Keyboard ArrowUp / ArrowDown Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        goToNextPage();
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        goToPrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPage, goToPrevPage]);

  // Load PDF Document via PDF.js for canvas mode
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
        const targetPage =
          initialPage && initialPage > 0
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
          const t = setTimeout(() => {
            setResumeNotification(null);
          }, 6000);
          return () => clearTimeout(t);
        }
      })
      .catch((err: any) => {
        if (isCancelled) return;
        console.warn('PDF.js canvas load error, activating fallback engine:', err);
        setError('Canvas notice');
        setEngineMode('gdocs');
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

  // Render Page to Canvas
  useEffect(() => {
    if (!pdfDoc || isGoogleDrive || error || engineMode !== 'canvas') return;

    let isCancelled = false;

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
          console.warn('Canvas render error, falling back to Google Docs Engine:', err);
          setEngineMode('gdocs');
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
  }, [pdfDoc, currentPage, scale, rotation, isGoogleDrive, error, engineMode]);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.6));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

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

  const handleToggleBookmark = () => {
    if (isCurrentPageBookmarked) {
      readingMemory.removeBookmark(docKey, currentPage);
    } else {
      readingMemory.addBookmark(docKey, currentPage, `Page ${currentPage}`);
    }
    setBookmarks(readingMemory.getBookmarks(docKey));
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInputVal, 10);
    if (!isNaN(p) && p >= 1 && p <= (numPages || 100)) {
      setCurrentPage(p);
    }
    setIsEditingPage(false);
    setPageInputVal('');
  };

  const readPercent = numPages > 0 ? Math.round((currentPage / numPages) * 100) : 0;

  // Resolved URL for external tab/app
  const directOpenUrl = urlBundle.isDrive
    ? urlBundle.downloadUrl || urlBundle.previewUrl
    : safePdfUrl;

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      className={`relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none ${className}`}
    >
      {/* Visual Reading Progress Bar at the Top Edge */}
      <div className="w-full h-1 bg-slate-800 shrink-0 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-brand-500 transition-all duration-300 ease-out"
          style={{ width: `${readPercent}%` }}
        />
      </div>

      {/* ============================================================== */}
      {/* TOP READER CONTROLS HEADER (BUTTON NAV REMOVED)                */}
      {/* ============================================================== */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2.5 bg-slate-900/95 backdrop-blur-md border-b border-white/10 text-white z-20 gap-2 shrink-0">
        {/* Left: Close/Back & Document Title */}
        <div className="flex items-center space-x-2 truncate max-w-[260px] sm:max-w-md">
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-brand-600 text-white text-xs font-bold transition-all border border-slate-700/80 cursor-pointer shrink-0 mr-1 ios-pill"
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
              {subtitle ? `${subtitle} • ` : ''}Page {currentPage} of {numPages || 'Doc'}
            </span>
          </div>
        </div>

        {/* Center: Clean Page Status Pill (BUTTON NAV REMOVED -> SWIPE ONLY) */}
        <div className="flex items-center space-x-1">
          {isEditingPage ? (
            <form onSubmit={handleJumpSubmit} className="flex items-center">
              <input
                type="number"
                min={1}
                max={numPages || 100}
                value={pageInputVal}
                onChange={(e) => setPageInputVal(e.target.value)}
                autoFocus
                onBlur={() => setIsEditingPage(false)}
                className="w-14 px-2 py-0.5 text-xs text-center font-mono font-bold bg-slate-800 text-white border border-brand-500 rounded-full focus:outline-none"
              />
              <span className="text-xs text-slate-400 ml-1">/ {numPages || '...'}</span>
            </form>
          ) : (
            <div
              onClick={() => {
                setPageInputVal(currentPage.toString());
                setIsEditingPage(true);
              }}
              className="px-3.5 py-1.5 rounded-full bg-slate-800/90 hover:bg-slate-700 border border-white/10 text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
              title="Swipe up/down to navigate pages. Click to jump to specific page."
            >
              <span className="text-brand-400 text-sm">{currentPage}</span>
              <span className="text-slate-500">/</span>
              <span>{numPages || 'Doc'}</span>
              <span className="hidden sm:inline text-[9px] text-slate-400 font-sans ml-1">
                (Swipe ↑↓)
              </span>
            </div>
          )}
        </div>

        {/* Right: Bookmarks, Fullscreen & Open External */}
        <div className="flex items-center space-x-1.5">
          {/* Engine Switcher */}
          <div className="hidden lg:flex items-center bg-slate-800 rounded-full p-0.5 border border-white/10 text-[10px] font-bold mr-1">
            <button
              onClick={() => setEngineMode('canvas')}
              className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                engineMode === 'canvas' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Render with direct high-definition canvas"
            >
              Canvas
            </button>
            <button
              onClick={() => setEngineMode('gdocs')}
              className={`px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                engineMode === 'gdocs' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Render with Google Docs Viewer"
            >
              Google
            </button>
          </div>

          {/* Bookmark Button */}
          <button
            onClick={handleToggleBookmark}
            disabled={loading}
            className={`p-2 rounded-full transition-all cursor-pointer ios-pill ${
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

          {/* Bookmarks Drawer Toggle */}
          <button
            onClick={() => setShowBookmarksDrawer(!showBookmarksDrawer)}
            className={`p-2 rounded-full relative transition-all cursor-pointer ios-pill ${
              showBookmarksDrawer ? 'bg-brand-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
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

          {/* Zoom In/Out (Canvas Mode) */}
          {engineMode === 'canvas' && (
            <>
              <button
                onClick={handleZoomOut}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer hidden sm:flex"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomIn}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer hidden sm:flex"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleRotate}
                className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer hidden sm:flex"
                title="Rotate 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Open in Drive / Native App */}
          <a
            href={directOpenUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-full bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all shrink-0 ml-1 ios-pill"
            title="Open Document in Drive or PDF Viewer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open App ↗</span>
          </a>
        </div>
      </div>

      {/* Floating Swipe Navigation Hint Badge */}
      {showSwipeHint && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-slate-900/90 border border-white/15 text-xs text-slate-300 font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 pointer-events-none animate-in fade-in duration-300">
          <span>↕️ Swipe up/down or scroll wheel to navigate pages</span>
        </div>
      )}

      {/* Floating Resume Notification */}
      {resumeNotification && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-slate-900/95 border border-emerald-500/50 shadow-xl backdrop-blur-md flex items-center space-x-3 text-xs text-white animate-fade-in">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <History className="w-3 h-3" />
          </div>
          <span>
            Resumed at <strong className="text-emerald-400 font-bold">Page {resumeNotification.page}</strong> of{' '}
            {resumeNotification.total}
          </span>
          <button
            onClick={() => setResumeNotification(null)}
            className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Bookmarks Drawer */}
      {showBookmarksDrawer && (
        <div className="absolute top-14 right-4 z-40 w-72 max-h-96 rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl backdrop-blur-md flex flex-col overflow-hidden text-slate-200 animate-fade-in">
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
                  Tap the bookmark icon to save key pages.
                </p>
              </div>
            ) : (
              bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors"
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
                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors ml-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MAIN DOCUMENT VIEWPORT (MULTI-ENGINE FAIL-SAFE)                 */}
      {/* ============================================================== */}
      <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-950 flex items-center justify-center">
        {/* ENGINE 1: GOOGLE DRIVE PREVIEW EMBED */}
        {engineMode === 'drive' && (
          <div className="w-full h-full relative flex flex-col">
            <iframe
              src={safePdfUrl}
              title={title}
              allow="autoplay; fullscreen"
              className="w-full h-full border-0 bg-slate-900"
            />
          </div>
        )}

        {/* ENGINE 2: GOOGLE DOCS VIEWER EMBED */}
        {engineMode === 'gdocs' && (
          <div className="w-full h-full relative flex flex-col">
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                safePdfUrl
              )}&embedded=true`}
              title={title}
              allow="autoplay; fullscreen"
              className="w-full h-full border-0 bg-slate-900"
            />
          </div>
        )}

        {/* ENGINE 3: NATIVE EMBED */}
        {engineMode === 'native' && (
          <div className="w-full h-full relative flex flex-col">
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
        )}

        {/* ENGINE 4: HIGH-DPI CANVAS WITH VERTICAL SWIPE / SCROLL */}
        {engineMode === 'canvas' && (
          <div className="w-full h-full flex items-center justify-center overflow-auto p-4 relative bg-slate-950/90">
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-xs z-20">
                <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mb-2" />
                <p className="text-xs font-bold text-slate-200">
                  Loading Document...
                </p>
              </div>
            )}

            <div className="max-w-full max-h-full flex items-center justify-center shadow-2xl rounded-2xl overflow-hidden bg-white">
              <canvas ref={canvasRef} className="block max-w-full h-auto" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UniversalPdfViewer;
