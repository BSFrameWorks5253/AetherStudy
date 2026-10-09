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
  Bookmark,
  List,
  X,
  History,
  Trash2,
  ArrowLeft,
  LayoutGrid,
  Sun,
  Moon,
  Coffee,
  ChevronDown,
  ChevronUp,
  Sparkles,
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

export type ReadingTheme = 'light' | 'sepia' | 'dark';

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

  // Reading Theme: 'light' | 'sepia' | 'dark'
  const [theme, setTheme] = useState<ReadingTheme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aether_pdf_theme') as ReadingTheme;
      if (saved) return saved;
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  // Engine Mode: 'canvas' | 'native' | 'drive'
  const [engineMode, setEngineMode] = useState<'canvas' | 'native' | 'drive'>(() => {
    return isGoogleDrive ? 'drive' : 'canvas';
  });

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
      if (window.innerWidth < 640) return 1.0;
      if (window.innerWidth < 1024) return 1.25;
      return 1.45;
    }
    return 1.45;
  });
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPageRendering, setIsPageRendering] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zenMode, setZenMode] = useState<boolean>(false);

  // Resume notification state
  const [resumeNotification, setResumeNotification] = useState<{
    page: number;
    total: number;
  } | null>(null);

  // Bookmarks state & Drawer
  const [showBookmarksDrawer, setShowBookmarksDrawer] = useState<boolean>(false);
  const [showPageGridModal, setShowPageGridModal] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<DocBookmark[]>(() => readingMemory.getBookmarks(docKey));
  const isCurrentPageBookmarked = readingMemory.isBookmarked(docKey, currentPage);

  // Scrubber drag state
  const [scrubberValue, setScrubberValue] = useState<number>(currentPage);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);

  // Gesture tracking refs
  const touchStartY = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const lastWheelTime = useRef<number>(0);

  // Save selected reading theme
  const handleSelectTheme = (t: ReadingTheme) => {
    setTheme(t);
    try {
      localStorage.setItem('aether_pdf_theme', t);
    } catch {}
  };

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

  // Page navigation helpers
  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => {
      if (numPages > 0 && prev < numPages) {
        const next = prev + 1;
        setScrubberValue(next);
        return next;
      }
      return prev;
    });
  }, [numPages]);

  const goToPrevPage = useCallback(() => {
    setCurrentPage((prev) => {
      if (prev > 1) {
        const p = prev - 1;
        setScrubberValue(p);
        return p;
      }
      return prev;
    });
  }, []);

  const jumpToPage = useCallback(
    (target: number) => {
      if (target >= 1 && (numPages === 0 || target <= numPages)) {
        setCurrentPage(target);
        setScrubberValue(target);
      }
    },
    [numPages]
  );

  // Keep scrubber synced with current page when not actively dragging
  useEffect(() => {
    if (!isScrubbing) {
      setScrubberValue(currentPage);
    }
  }, [currentPage, isScrubbing]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const unscaledPageDimRef = useRef<{ width: number; height: number }>({ width: 595, height: 842 });

  // Reset scroll container to top whenever currentPage changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentPage]);

  // Vertical Swipe Gesture Detection (Only transitions pages at top/bottom scroll boundaries)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const endY = e.changedTouches[0].clientY;
    const endX = e.changedTouches[0].clientX;
    const diffY = touchStartY.current - endY;
    const diffX = touchStartX.current - endX;

    const el = scrollContainerRef.current;
    const isAtBottom = el ? el.scrollTop + el.clientHeight >= el.scrollHeight - 25 : true;
    const isAtTop = el ? el.scrollTop <= 25 : true;
    const contentFitsOnScreen = el ? el.scrollHeight <= el.clientHeight + 15 : true;

    // Minimum 55px vertical delta with vertical dominance
    if (Math.abs(diffY) > 55 && Math.abs(diffY) > Math.abs(diffX) * 1.5) {
      if (diffY > 0 && (isAtBottom || contentFitsOnScreen)) {
        goToNextPage();
      } else if (diffY < 0 && (isAtTop || contentFitsOnScreen)) {
        goToPrevPage();
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    const el = scrollContainerRef.current;
    const isAtBottom = el ? el.scrollTop + el.clientHeight >= el.scrollHeight - 15 : true;
    const isAtTop = el ? el.scrollTop <= 15 : true;
    const contentFitsOnScreen = el ? el.scrollHeight <= el.clientHeight + 15 : true;

    if (Math.abs(e.deltaY) > 30) {
      if (e.deltaY > 0 && (isAtBottom || contentFitsOnScreen)) {
        const now = Date.now();
        if (now - lastWheelTime.current < 350) return;
        lastWheelTime.current = now;
        goToNextPage();
      } else if (e.deltaY < 0 && (isAtTop || contentFitsOnScreen)) {
        const now = Date.now();
        if (now - lastWheelTime.current < 350) return;
        lastWheelTime.current = now;
        goToPrevPage();
      }
    }
  };

  // Keyboard Navigation (Arrow Keys & Page Up/Down)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'ArrowRight') {
        const el = scrollContainerRef.current;
        const isAtBottom = el ? el.scrollTop + el.clientHeight >= el.scrollHeight - 20 : true;
        if (isAtBottom) {
          e.preventDefault();
          goToNextPage();
        }
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'ArrowLeft') {
        const el = scrollContainerRef.current;
        const isAtTop = el ? el.scrollTop <= 20 : true;
        if (isAtTop) {
          e.preventDefault();
          goToPrevPage();
        }
      } else if (e.key === 'z' || e.key === 'Z') {
        setZenMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPage, goToPrevPage]);

  // Load PDF Document via PDF.js for Canvas engine
  useEffect(() => {
    if (!safePdfUrl || isGoogleDrive) {
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);

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

        // Resume reading progress
        const saved = readingMemory.getProgress(docKey);
        const targetPage =
          initialPage && initialPage > 0
            ? initialPage
            : saved && saved.currentPage > 1 && saved.currentPage <= total
            ? saved.currentPage
            : 1;

        setCurrentPage(targetPage);
        setScrubberValue(targetPage);

        // Auto-scale to fit container width comfortably on first load
        loadedDoc.getPage(targetPage).then((p: any) => {
          if (isCancelled) return;
          const baseVp = p.getViewport({ scale: 1, rotation: 0 });
          unscaledPageDimRef.current = { width: baseVp.width, height: baseVp.height };
          const containerW = containerRef.current?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
          const pad = containerW < 640 ? 20 : 48;
          const fitScale = Math.min(Math.max((containerW - pad) / baseVp.width, 0.55), 1.6);
          setScale(Number(fitScale.toFixed(2)));
        }).catch(() => {});

        if (saved && saved.currentPage > 1 && (!initialPage || initialPage === saved.currentPage)) {
          setResumeNotification({
            page: saved.currentPage,
            total,
          });
          const t = setTimeout(() => {
            setResumeNotification(null);
          }, 5000);
          return () => clearTimeout(t);
        }
      })
      .catch((err: any) => {
        if (isCancelled) return;
        console.warn('PDF.js canvas load error, activating high-speed native browser embed:', err);
        setEngineMode('native');
        setLoading(false);
      });

    return () => {
      isCancelled = true;
      try {
        loadingTask.destroy();
      } catch {}
    };
  }, [safePdfUrl, isGoogleDrive, docKey, initialPage]);

  // Save progress persistently
  useEffect(() => {
    if (numPages > 0 && currentPage > 0) {
      readingMemory.saveProgress(docKey, title, currentPage, numPages);
    }
  }, [docKey, title, currentPage, numPages]);

  // High-DPI Page Canvas Rendering
  useEffect(() => {
    if (!pdfDoc || isGoogleDrive || engineMode !== 'canvas') return;

    let isCancelled = false;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {}
      renderTaskRef.current = null;
    }

    setIsPageRendering(true);

    pdfDoc.getPage(currentPage).then((page: any) => {
      if (isCancelled) return;

      const unscaled = page.getViewport({ scale: 1, rotation });
      unscaledPageDimRef.current = { width: unscaled.width, height: unscaled.height };

      const canvas = canvasRef.current;
      if (!canvas) {
        setIsPageRendering(false);
        return;
      }
      const context = canvas.getContext('2d');
      if (!context) {
        setIsPageRendering(false);
        return;
      }

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
          setIsPageRendering(false);
          try {
            page.cleanup();
          } catch {}
        })
        .catch((err: any) => {
          try {
            page.cleanup();
          } catch {}
          if (err?.name === 'RenderingCancelledException') return;
          console.warn('Canvas render error, falling back to Native engine:', err);
          setIsPageRendering(false);
          setEngineMode('native');
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
  }, [pdfDoc, currentPage, scale, rotation, isGoogleDrive, engineMode]);

  const handleZoomIn = () => setScale((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 3.0));
  const handleZoomOut = () => setScale((prev) => Math.max(Number((prev - 0.15).toFixed(2)), 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleFitWidth = useCallback(() => {
    const containerW = containerRef.current?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
    const pad = containerW < 640 ? 20 : 48;
    const baseW = unscaledPageDimRef.current.width || 595;
    const target = Math.min(Math.max((containerW - pad) / baseW, 0.55), 3.0);
    setScale(Number(target.toFixed(2)));
  }, []);

  const handleFitPage = useCallback(() => {
    const containerH = containerRef.current?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 900);
    const pad = 140; // header (56px) + footer (64px) + margin (20px)
    const baseH = unscaledPageDimRef.current.height || 842;
    const target = Math.min(Math.max((containerH - pad) / baseH, 0.45), 2.5);
    setScale(Number(target.toFixed(2)));
  }, []);

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

  const directOpenUrl = urlBundle.isDrive
    ? urlBundle.downloadUrl || urlBundle.previewUrl
    : safePdfUrl;

  // Reading Theme Styling
  const themeStyles = useMemo(() => {
    switch (theme) {
      case 'sepia':
        return {
          wrapper: 'bg-[#f4ebd9] text-[#433422]',
          canvasFilter: 'sepia(35%) brightness(96%) contrast(98%)',
          paperBg: 'bg-[#faf3e7]',
          toolbar: 'bg-[#ebe0cb]/90 border-[#d8cbb2] text-[#433422]',
        };
      case 'dark':
        return {
          wrapper: 'bg-[#080d1a] text-slate-100',
          canvasFilter: 'invert(92%) hue-rotate(180deg) brightness(96%) contrast(92%)',
          paperBg: 'bg-[#0c1324]',
          toolbar: 'bg-[#0e1629]/90 border-white/10 text-slate-100',
        };
      case 'light':
      default:
        return {
          wrapper: 'bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white',
          canvasFilter: 'none',
          paperBg: 'bg-white',
          toolbar: 'bg-white/90 dark:bg-slate-900/90 border-black/10 dark:border-white/10 text-slate-900 dark:text-white',
        };
    }
  }, [theme]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
      className={`relative flex flex-col w-full h-full select-none overflow-hidden transition-colors duration-300 ${themeStyles.wrapper} ${className}`}
    >
      {/* ============================================================== */}
      {/* 1. APPLE BOOKS TOP FROSTED CONTROL BAR                        */}
      {/* ============================================================== */}
      <header
        className={`h-14 px-3 sm:px-5 border-b backdrop-blur-xl flex items-center justify-between shrink-0 z-30 transition-all duration-300 ${
          zenMode ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        } ${themeStyles.toolbar}`}
      >
        {/* Left: Back / Title */}
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 mr-2">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer flex items-center gap-1.5"
              title="Close PDF Reader"
            >
              <ArrowLeft className="w-4 h-4" />
              {backLabel && (
                <span className="text-xs font-semibold hidden md:inline truncate max-w-[140px]">
                  {backLabel}
                </span>
              )}
            </button>
          )}

          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold truncate leading-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[10.5px] opacity-70 truncate font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Center: Reading Theme & Engine Pills */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Theme Selector (Paper / Sepia / Night) */}
          <div className="flex items-center bg-black/5 dark:bg-white/10 rounded-full p-0.5 border border-black/5 dark:border-white/5">
            <button
              onClick={() => handleSelectTheme('light')}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                theme === 'light' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Paper White Theme"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSelectTheme('sepia')}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                theme === 'sepia' ? 'bg-[#d8cbb2] text-[#433422] shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Eye-Comfort Sepia Theme"
            >
              <Coffee className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleSelectTheme('dark')}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                theme === 'dark' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="OLED Midnight Dark Theme"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Engine Mode Toggle (Canvas vs Native GPU) */}
          {!isGoogleDrive && (
            <button
              onClick={() => setEngineMode(engineMode === 'canvas' ? 'native' : 'canvas')}
              className="hidden lg:flex items-center space-x-1 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 text-[11px] font-bold border border-black/5 dark:border-white/5 transition-all cursor-pointer"
              title="Switch PDF Rendering Engine"
            >
              <Sparkles className="w-3 h-3 text-brand-500" />
              <span>{engineMode === 'canvas' ? 'Canvas' : 'Native GPU'}</span>
            </button>
          )}

          {/* Bookmark Button */}
          <button
            onClick={handleToggleBookmark}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              isCurrentPageBookmarked
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                : 'hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100'
            }`}
            title={isCurrentPageBookmarked ? 'Page Bookmarked' : 'Bookmark this page'}
          >
            <Bookmark className="w-4 h-4 fill-current" />
          </button>

          {/* Page Grid Overview Sheet */}
          {numPages > 1 && (
            <button
              onClick={() => setShowPageGridModal(true)}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-all cursor-pointer"
              title="Page Overview Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          )}

          {/* Bookmarks Drawer */}
          <button
            onClick={() => setShowBookmarksDrawer(!showBookmarksDrawer)}
            className="relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-all cursor-pointer"
            title="Saved Bookmarks"
          >
            <List className="w-4 h-4" />
            {bookmarks.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 text-[9px] font-extrabold text-slate-950 flex items-center justify-center">
                {bookmarks.length}
              </span>
            )}
          </button>

          {/* Zoom Controls */}
          {engineMode === 'canvas' && (
            <div className="hidden sm:flex items-center space-x-0.5">
              <button
                onClick={handleZoomOut}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-all cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleFitWidth}
                className="px-2 py-1 text-[11px] font-bold rounded-lg hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-all cursor-pointer"
                title="Fit Page Width"
              >
                Fit Width
              </button>
              <button
                onClick={handleFitPage}
                className="px-2 py-1 text-[11px] font-bold rounded-lg hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-all cursor-pointer hidden md:inline-block"
                title="Fit Whole Page Height"
              >
                Fit Page
              </button>
              <button
                onClick={handleZoomIn}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-all cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleRotate}
                className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-all cursor-pointer"
                title="Rotate Page"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100 transition-all cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Direct Open in System App */}
          <a
            href={directOpenUrl}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-full bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all shrink-0 ml-1 ios-pill"
            title="Open Document in External App"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open ↗</span>
          </a>
        </div>
      </header>

      {/* ============================================================== */}
      {/* 2. MAIN DOCUMENT VIEWPORT                                      */}
      {/* ============================================================== */}
      <main
        onClick={(e) => {
          // Tap background to toggle Zen distraction-free mode
          if (e.target === e.currentTarget) {
            setZenMode((prev) => !prev);
          }
        }}
        className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center"
      >
        {/* Loading Spinner with subtle backdrop */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs z-20">
            <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mb-2" />
            <p className="text-xs font-bold text-white tracking-wide">
              Preparing Smooth High-Res Document...
            </p>
          </div>
        )}

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

        {/* ENGINE 2: NATIVE BROWSER EMBED (Zero Lag GPU Render) */}
        {engineMode === 'native' && (
          <div className="w-full h-full relative flex flex-col bg-slate-900">
            <object
              data={safePdfUrl}
              type="application/pdf"
              className="w-full h-full flex-1"
            >
              <iframe
                src={safePdfUrl}
                title={title}
                className="w-full h-full border-0"
              />
            </object>
          </div>
        )}

        {/* ENGINE 3: HIGH-DPI CANVAS WITH SMOOTH SWIPE / SCROLL */}
        {engineMode === 'canvas' && (
          <div
            ref={scrollContainerRef}
            className="w-full h-full overflow-y-auto overflow-x-auto relative p-2 sm:p-6 pb-32 sm:pb-36"
          >
            <div className="flex flex-col items-center justify-start min-w-full">
              <div
                className={`shadow-2xl rounded-xl sm:rounded-2xl transition-all duration-200 shrink-0 overflow-visible max-w-none ${
                  themeStyles.paperBg
                }`}
                style={{
                  filter: themeStyles.canvasFilter,
                }}
              >
                <canvas
                  ref={canvasRef}
                  className="block cursor-default transition-opacity duration-150 max-w-none"
                  style={{
                    opacity: isPageRendering ? 0.75 : 1,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Floating Resume Notification */}
        {resumeNotification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-slate-900/95 border border-emerald-500/50 shadow-2xl backdrop-blur-md flex items-center space-x-3 text-xs text-white animate-fade-in">
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
      </main>

      {/* ============================================================== */}
      {/* 3. APPLE BOOKS BOTTOM SCRUBBER & PAGE CONTROLLER               */}
      {/* ============================================================== */}
      {numPages > 1 && engineMode === 'canvas' && (
        <footer
          className={`h-16 px-4 sm:px-8 border-t backdrop-blur-xl flex items-center justify-between shrink-0 z-30 transition-all duration-300 ${
            zenMode ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
          } ${themeStyles.toolbar}`}
        >
          {/* Quick Prev Page */}
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0"
            title="Previous Page (Swipe Down)"
          >
            <ChevronUp className="w-4 h-4" />
          </button>

          {/* Smooth Scrubber Track */}
          <div className="flex-1 max-w-md mx-4 sm:mx-8 flex flex-col items-center">
            {/* Scrubber Tooltip */}
            <div className="text-[11px] font-bold tracking-tight mb-1 flex items-center gap-2">
              <span>
                Page <strong className="font-extrabold text-brand-600 dark:text-brand-400">{scrubberValue}</strong> of {numPages}
              </span>
              <span className="opacity-40">•</span>
              <span className="opacity-70 font-mono text-[10px]">{Math.round((scrubberValue / numPages) * 100)}% read</span>
            </div>

            {/* Range Input Slider */}
            <input
              type="range"
              min={1}
              max={numPages}
              value={scrubberValue}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setScrubberValue(val);
                setIsScrubbing(true);
              }}
              onMouseUp={() => {
                setIsScrubbing(false);
                jumpToPage(scrubberValue);
              }}
              onTouchEnd={() => {
                setIsScrubbing(false);
                jumpToPage(scrubberValue);
              }}
              className="w-full h-1.5 bg-black/10 dark:bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-600 focus:outline-none"
            />
          </div>

          {/* Quick Next Page */}
          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0"
            title="Next Page (Swipe Up)"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </footer>
      )}

      {/* ============================================================== */}
      {/* 4. PAGE GRID MODAL (Instant Chapter & Page Thumbnails)          */}
      {/* ============================================================== */}
      {showPageGridModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPageGridModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-black/10 dark:border-white/10 flex flex-col max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <LayoutGrid className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Quick Page Navigator ({numPages} Total Pages)
                </h3>
              </div>
              <button
                onClick={() => setShowPageGridModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5">
              {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => {
                const isCurrent = p === currentPage;
                const isBookmarked = readingMemory.isBookmarked(docKey, p);

                return (
                  <button
                    key={p}
                    onClick={() => {
                      jumpToPage(p);
                      setShowPageGridModal(false);
                    }}
                    className={`h-16 rounded-xl border flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-brand-600 text-white font-black border-brand-500 shadow-md shadow-brand-500/25 scale-105'
                        : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 hover:border-brand-500/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="text-xs font-bold">{p}</span>
                    {isBookmarked && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. BOOKMARKS DRAWER                                            */}
      {/* ============================================================== */}
      {showBookmarksDrawer && (
        <div className="absolute top-16 right-4 z-40 w-72 max-h-96 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-black/10 dark:border-white/10 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden animate-fade-in">
          <div className="p-3 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-xs font-bold">Document Bookmarks</span>
            </div>
            <button
              onClick={() => setShowBookmarksDrawer(false)}
              className="p-1 opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-2 overflow-y-auto divide-y divide-black/5 dark:divide-white/5 max-h-72">
            {bookmarks.length === 0 ? (
              <div className="p-6 text-center text-xs opacity-60">
                <Bookmark className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="font-semibold">No bookmarks yet</p>
                <p className="text-[11px] mt-1">Tap the bookmark icon to pin important pages.</p>
              </div>
            ) : (
              bookmarks.map((bm) => (
                <div
                  key={bm.id}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <button
                    onClick={() => {
                      jumpToPage(bm.page);
                      setShowBookmarksDrawer(false);
                    }}
                    className="flex-1 text-left flex items-center space-x-2.5 truncate cursor-pointer"
                  >
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-300 font-mono font-bold text-xs shrink-0">
                      p. {bm.page}
                    </span>
                    <span className="text-xs truncate font-medium">
                      {bm.title || `Page ${bm.page}`}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      readingMemory.removeBookmark(docKey, bm.page);
                      setBookmarks(readingMemory.getBookmarks(docKey));
                    }}
                    className="p-1 opacity-50 hover:opacity-100 hover:text-rose-500 transition-colors ml-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UniversalPdfViewer;
