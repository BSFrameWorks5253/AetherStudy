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
  ChevronLeft,
  ChevronRight,
  ScrollText,
  FileText,
} from 'lucide-react';
import { readingMemory, getCanonicalDocKey, DocBookmark } from '../../services/readingMemory';
import { transformDocumentUrl } from '../../utils/urlTransformer';
import { pdfVault } from '../../services/pdfVault';

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
export type ViewLayout = 'continuous' | 'single';

interface UniversalPdfViewerProps {
  url: string;
  title?: string;
  subtitle?: string;
  initialPage?: number;
  className?: string;
  onClose?: () => void;
  backLabel?: string;
}

/**
 * Continuous Scroll Page Component with Intersection Visibility
 */
const ContinuousPdfPage: React.FC<{
  pdfDoc: any;
  pageNumber: number;
  scale: number;
  rotation: number;
  themeStyles: any;
  onVisible?: (page: number) => void;
}> = ({ pdfDoc, pageNumber, scale, rotation, themeStyles, onVisible }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState<boolean>(false);
  const [inView, setInView] = useState<boolean>(pageNumber <= 3); // Preload first 3 pages
  const renderTaskRef = useRef<any>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setInView(true);
            if (onVisible) onVisible(pageNumber);
          } else {
            // Keep memory lean: unmount canvases that are far away (>1200px)
            if (pageNumber > 3) {
              setInView(false);
              setRendered(false);
            }
          }
        });
      },
      { rootMargin: '1200px 0px 1200px 0px', threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageNumber, onVisible]);

  useEffect(() => {
    if (!pdfDoc || !inView) return;
    let cancelled = false;

    pdfDoc.getPage(pageNumber).then((page: any) => {
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale, rotation });

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const task = page.render({ canvasContext: context, viewport });
      renderTaskRef.current = task;
      task.promise
        .then(() => {
          if (!cancelled) setRendered(true);
          try { page.cleanup(); } catch {}
        })
        .catch(() => {
          try { page.cleanup(); } catch {}
        });
    }).catch(() => {});

    return () => {
      cancelled = true;
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
      }
    };
  }, [pdfDoc, pageNumber, scale, rotation, inView]);

  return (
    <div
      ref={containerRef}
      id={`pdf-page-${pageNumber}`}
      className={`relative my-3 sm:my-6 shadow-2xl rounded-xl sm:rounded-2xl transition-all overflow-hidden ${themeStyles.paperBg}`}
      style={{
        minHeight: rendered ? 'auto' : '450px',
        filter: themeStyles.canvasFilter,
      }}
    >
      <div className="absolute top-2.5 left-3 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-mono font-bold text-white z-10 opacity-70 hover:opacity-100 select-none pointer-events-none">
        Page {pageNumber}
      </div>
      <canvas ref={canvasRef} className="block max-w-none rounded-xl" />
      {!rendered && inView && (
        <div className="flex flex-col items-center justify-center py-24 text-xs font-semibold opacity-60">
          <RefreshCw className="w-5 h-5 animate-spin mb-2 text-brand-500" />
          <span>Rendering Page {pageNumber}...</span>
        </div>
      )}
    </div>
  );
};

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
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  // Reading Layout: 'continuous' (default - scroll up & down smoothly) | 'single'
  const [layout, setLayout] = useState<ViewLayout>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aether_pdf_layout') as ViewLayout;
      if (saved === 'continuous' || saved === 'single') return saved;
    }
    return 'continuous';
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
      if (window.innerWidth < 640) return 0.95;
      if (window.innerWidth < 1024) return 1.2;
      return 1.4;
    }
    return 1.3;
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

  // Touch tracking for horizontal page flip (single page mode)
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const unscaledPageDimRef = useRef<{ width: number; height: number }>({ width: 595, height: 842 });

  // Save selected reading theme & layout
  const handleSelectTheme = (t: ReadingTheme) => {
    setTheme(t);
    try {
      localStorage.setItem('aether_pdf_theme', t);
    } catch {}
  };

  const handleToggleLayout = (l: ViewLayout) => {
    setLayout(l);
    try {
      localStorage.setItem('aether_pdf_layout', l);
    } catch {}
  };

  // Convert relative paths to absolute URLs
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

  // High-performance active URL resolution from IndexedDB pdfVault
  const [resolvedPdfUrl, setResolvedPdfUrl] = useState<string>(safePdfUrl);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const vaultUrl =
          (await pdfVault.getUrl(url).catch(() => null)) ||
          (title ? await pdfVault.getUrl(title).catch(() => null) : null) ||
          (await pdfVault.getUrl(docKey).catch(() => null));
        if (vaultUrl && !cancelled) {
          setResolvedPdfUrl(vaultUrl);
          return;
        }
      } catch {}

      if (!cancelled) {
        setResolvedPdfUrl(safePdfUrl);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [safePdfUrl, url, title, docKey]);

  // Page navigation helpers
  const goToNextPage = useCallback(() => {
    if (numPages > 0 && currentPage < numPages) {
      const next = currentPage + 1;
      setCurrentPage(next);
      setScrubberValue(next);
      if (layout === 'continuous') {
        const el = document.getElementById(`pdf-page-${next}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [numPages, currentPage, layout]);

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      const prev = currentPage - 1;
      setCurrentPage(prev);
      setScrubberValue(prev);
      if (layout === 'continuous') {
        const el = document.getElementById(`pdf-page-${prev}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [currentPage, layout]);

  const jumpToPage = useCallback(
    (target: number) => {
      if (target >= 1 && (numPages === 0 || target <= numPages)) {
        setCurrentPage(target);
        setScrubberValue(target);
        if (layout === 'continuous') {
          const el = document.getElementById(`pdf-page-${target}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    },
    [numPages, layout]
  );

  // Sync scrubber value with current page when not scrubbing
  useEffect(() => {
    if (!isScrubbing) {
      setScrubberValue(currentPage);
    }
  }, [currentPage, isScrubbing]);

  // Reset scroll to top in single-page mode when page changes
  useEffect(() => {
    if (layout === 'single' && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [currentPage, layout]);

  // Horizontal Swipe for Single-Page Mode (Never conflicts with vertical scrolling!)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (layout !== 'single') return; // In continuous mode, native vertical scroll handles everything!
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;

    // Minimum 45px horizontal swipe with horizontal dominance
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY) * 1.4) {
      if (diffX > 0) {
        goToNextPage();
      } else {
        goToPrevPage();
      }
    }
  };

  // Keyboard Navigation (Arrow Keys & Page Up/Down)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goToNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPrevPage();
      } else if (e.key === 'z' || e.key === 'Z') {
        setZenMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNextPage, goToPrevPage]);

  // Load PDF Document via PDF.js
  useEffect(() => {
    const targetUrl = resolvedPdfUrl || safePdfUrl;
    if (!targetUrl || isGoogleDrive) {
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);

    const localCmap = `${window.location.origin}/cmaps/`;
    const loadingTask = pdfjsLib.getDocument({
      url: targetUrl,
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

        // Auto-scale to fit container width comfortably
        loadedDoc.getPage(targetPage).then((p: any) => {
          if (isCancelled) return;
          const baseVp = p.getViewport({ scale: 1, rotation: 0 });
          unscaledPageDimRef.current = { width: baseVp.width, height: baseVp.height };
          const containerW = containerRef.current?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
          const pad = containerW < 640 ? 16 : 48;
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
          }, 4500);
          return () => clearTimeout(t);
        }
      })
      .catch(async (err: any) => {
        if (isCancelled) return;
        // Check if IndexedDB pdfVault has the active blob
        try {
          const freshVaultUrl =
            (await pdfVault.getUrl(url).catch(() => null)) ||
            (title ? await pdfVault.getUrl(title).catch(() => null) : null);
          if (freshVaultUrl && freshVaultUrl !== targetUrl) {
            setResolvedPdfUrl(freshVaultUrl);
            return;
          }
        } catch {}

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
  }, [resolvedPdfUrl, safePdfUrl, isGoogleDrive, docKey, initialPage, url, title]);

  // Save progress persistently
  useEffect(() => {
    if (numPages > 0 && currentPage > 0) {
      readingMemory.saveProgress(docKey, title, currentPage, numPages);
    }
  }, [docKey, title, currentPage, numPages]);

  // Single-Page Canvas Render Mode
  useEffect(() => {
    if (!pdfDoc || isGoogleDrive || engineMode !== 'canvas' || layout !== 'single') return;

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

      const canvas = singleCanvasRef.current;
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
      const viewport = page.getViewport({ scale, rotation });

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
  }, [pdfDoc, currentPage, scale, rotation, isGoogleDrive, engineMode, layout]);

  const handleZoomIn = () => setScale((prev) => Math.min(Number((prev + 0.15).toFixed(2)), 3.0));
  const handleZoomOut = () => setScale((prev) => Math.max(Number((prev - 0.15).toFixed(2)), 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleFitWidth = useCallback(() => {
    const containerW = containerRef.current?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
    const pad = containerW < 640 ? 16 : 48;
    const baseW = unscaledPageDimRef.current.width || 595;
    const target = Math.min(Math.max((containerW - pad) / baseW, 0.55), 3.0);
    setScale(Number(target.toFixed(2)));
  }, []);

  const handleFitPage = useCallback(() => {
    const containerH = containerRef.current?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 900);
    const pad = 140;
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
    : (resolvedPdfUrl || safePdfUrl);

  // Reading Theme Styling
  const themeStyles = useMemo(() => {
    switch (theme) {
      case 'sepia':
        return {
          wrapper: 'bg-[#f4ebd9] text-[#433422]',
          canvasFilter: 'sepia(35%) brightness(96%) contrast(98%)',
          paperBg: 'bg-[#faf3e7]',
          toolbar: 'bg-[#ebe0cb]/95 border-[#d8cbb2] text-[#433422]',
          accent: 'text-amber-700 dark:text-amber-400',
        };
      case 'dark':
        return {
          wrapper: 'bg-[#080d1a] text-slate-100',
          canvasFilter: 'invert(92%) hue-rotate(180deg) brightness(96%) contrast(92%)',
          paperBg: 'bg-[#0c1324]',
          toolbar: 'bg-[#0e1629]/95 border-white/10 text-slate-100',
          accent: 'text-brand-400',
        };
      case 'light':
      default:
        return {
          wrapper: 'bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white',
          canvasFilter: 'none',
          paperBg: 'bg-white',
          toolbar: 'bg-white/95 dark:bg-slate-900/95 border-black/10 dark:border-white/10 text-slate-900 dark:text-white',
          accent: 'text-brand-600 dark:text-brand-400',
        };
    }
  }, [theme]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={`relative flex flex-col w-full h-full select-none overflow-hidden transition-colors duration-300 ${themeStyles.wrapper} ${className}`}
    >
      {/* ============================================================== */}
      {/* 1. TOP FROSTED CONTROL BAR                                     */}
      {/* ============================================================== */}
      <header
        className={`h-14 px-3 sm:px-5 border-b backdrop-blur-xl flex items-center justify-between shrink-0 z-30 transition-all duration-300 ${
          zenMode ? '-translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
        } ${themeStyles.toolbar}`}
      >
        {/* Left: Back / Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 mr-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-all shrink-0 cursor-pointer flex items-center gap-1.5 border border-black/5 dark:border-white/10 text-xs font-bold"
              title={backLabel || 'Close Reader (Esc)'}
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span className="font-semibold tracking-tight hidden sm:inline">Back</span>
            </button>
          )}

          <div className="h-4 w-px bg-black/10 dark:bg-white/10 shrink-0 hidden sm:block" />

          <div className="min-w-0 flex-1">
            <h2 className="text-xs sm:text-sm font-bold truncate leading-tight tracking-tight">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] opacity-70 truncate font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Center/Right: Actions */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Continuous vs Single Page Switcher */}
          {engineMode === 'canvas' && numPages > 1 && (
            <div className="flex items-center bg-black/5 dark:bg-white/10 rounded-full p-0.5 border border-black/5 dark:border-white/5">
              <button
                onClick={() => handleToggleLayout('continuous')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  layout === 'continuous'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Continuous Scroll Mode (Scroll freely up & down)"
              >
                <ScrollText className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Scroll</span>
              </button>
              <button
                onClick={() => handleToggleLayout('single')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  layout === 'single'
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
                title="Single Page Mode (Swipe / Tap page flip)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Page</span>
              </button>
            </div>
          )}

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
                title="Fit Page Height"
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

          {/* Direct Open in External App */}
          <a
            href={directOpenUrl}
            target="_blank"
            rel="noopener noreferrer"
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
        className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center"
      >
        {/* Loading Spinner */}
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs z-20">
            <RefreshCw className="w-8 h-8 text-brand-500 animate-spin mb-2" />
            <p className="text-xs font-bold text-white tracking-wide">
              Preparing High-Definition Document...
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

        {/* ENGINE 2: NATIVE BROWSER EMBED */}
        {engineMode === 'native' && (
          <div className="w-full h-full relative flex flex-col bg-slate-900">
            <object
              data={resolvedPdfUrl || safePdfUrl}
              type="application/pdf"
              className="w-full h-full flex-1"
            >
              <iframe
                src={resolvedPdfUrl || safePdfUrl}
                title={title}
                className="w-full h-full border-0"
              />
            </object>
          </div>
        )}

        {/* ENGINE 3: HIGH-DPI CANVAS (CONTINUOUS SCROLL MODE) */}
        {engineMode === 'canvas' && layout === 'continuous' && (
          <div
            ref={scrollContainerRef}
            className="w-full h-full overflow-y-auto overflow-x-auto relative p-2 sm:p-6 pb-28 sm:pb-32 overscroll-contain"
          >
            <div className="flex flex-col items-center justify-start min-w-full">
              {Array.from({ length: numPages || 1 }, (_, i) => i + 1).map((p) => (
                <ContinuousPdfPage
                  key={`page-${p}-${scale}-${rotation}`}
                  pdfDoc={pdfDoc}
                  pageNumber={p}
                  scale={scale}
                  rotation={rotation}
                  themeStyles={themeStyles}
                  onVisible={(visiblePage) => {
                    setCurrentPage(visiblePage);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ENGINE 3B: HIGH-DPI CANVAS (SINGLE PAGE FLIP MODE) */}
        {engineMode === 'canvas' && layout === 'single' && (
          <div
            ref={scrollContainerRef}
            className="w-full h-full overflow-y-auto overflow-x-auto relative p-2 sm:p-6 pb-28 sm:pb-32 overscroll-contain"
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
                  ref={singleCanvasRef}
                  className="block cursor-default transition-opacity duration-150 max-w-none rounded-xl sm:rounded-2xl"
                  style={{
                    opacity: isPageRendering ? 0.75 : 1,
                  }}
                />
              </div>
            </div>

            {/* Desktop Lateral Flip Buttons for Single Page Mode */}
            <button
              onClick={goToPrevPage}
              disabled={currentPage <= 1}
              className="hidden md:flex fixed left-6 top-1/2 -translate-y-1/2 z-30 p-3.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white shadow-2xl backdrop-blur-md disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer border border-white/10"
              title="Previous Page (←)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextPage}
              disabled={currentPage >= numPages}
              className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 z-30 p-3.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white shadow-2xl backdrop-blur-md disabled:opacity-20 disabled:pointer-events-none transition-all cursor-pointer border border-white/10"
              title="Next Page (→)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
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
      {/* 3. MOBILE & DESKTOP FLOATING NAVIGATION CONTROLLER             */}
      {/* ============================================================== */}
      {numPages > 1 && engineMode === 'canvas' && (
        <footer
          className={`h-16 px-3 sm:px-8 border-t backdrop-blur-xl flex items-center justify-between shrink-0 z-30 transition-all duration-300 ${
            zenMode ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
          } ${themeStyles.toolbar}`}
        >
          {/* Quick Prev Button (Large & Mobile Friendly) */}
          <button
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="flex items-center gap-1 px-3 py-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0 text-xs font-bold"
            title="Previous Page (Swipe Down / Left)"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Smooth Scrubber Track & Page Badge */}
          <div className="flex-1 max-w-md mx-3 sm:mx-8 flex flex-col items-center">
            {/* Scrubber Badge */}
            <div className="text-[11px] font-bold tracking-tight mb-1 flex items-center gap-2">
              <span>
                Page <strong className="font-extrabold text-brand-600 dark:text-brand-400">{scrubberValue}</strong> of {numPages}
              </span>
              <span className="opacity-40">•</span>
              <span className="opacity-70 font-mono text-[10px]">
                {Math.round((scrubberValue / numPages) * 100)}% read
              </span>
            </div>

            {/* Slider */}
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

          {/* Quick Next Button (Large & Mobile Friendly) */}
          <button
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="flex items-center gap-1 px-3 py-2 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shrink-0 text-xs font-bold"
            title="Next Page (Swipe Up / Right)"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </footer>
      )}

      {/* ============================================================== */}
      {/* 4. PAGE GRID MODAL (Instant Thumbnails Overview)               */}
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
