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
} from 'lucide-react';

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
  className?: string;
}

export const UniversalPdfViewer: React.FC<UniversalPdfViewerProps> = ({
  url,
  title = 'Document',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderTaskRef = useRef<any>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fallbackMode, setFallbackMode] = useState<'canvas' | 'gdocs' | 'iframe'>('canvas');

  // Convert relative paths to absolute URLs so Web Workers can resolve them
  const safePdfUrl = React.useMemo(() => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
      if (url.includes('/view')) return url.replace('/view', '/preview');
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `https://drive.google.com/file/d/${match[1]}/preview`;
      }
      return url;
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
  }, [url]);

  const isGoogleDrive = url.includes('drive.google.com');

  // Load PDF Document
  useEffect(() => {
    if (!safePdfUrl || isGoogleDrive) {
      setLoading(false);
      return;
    }

    let isCancelled = false;
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    const loadingTask = pdfjsLib.getDocument({
      url: safePdfUrl,
      cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
      cMapPacked: true,
    });

    loadingTask.promise
      .then((loadedDoc: any) => {
        if (isCancelled) return;
        setPdfDoc(loadedDoc);
        setNumPages(loadedDoc.numPages);
        setLoading(false);
      })
      .catch((err: any) => {
        if (isCancelled) return;
        console.warn('PDF.js canvas load failed, enabling Web Engine fallback:', err);
        setError('Canvas engine notice');
        setFallbackMode('gdocs');
        setLoading(false);
      });

    return () => {
      isCancelled = true;
      try {
        loadingTask.destroy();
      } catch {}
    };
  }, [safePdfUrl, isGoogleDrive]);

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

      const dpr = window.devicePixelRatio || 1;
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
          console.warn('Canvas render error, falling back to Web Engine:', err);
          setFallbackMode('gdocs');
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

  // Google Docs Engine Fallback (Guaranteed to work on all mobile phones & browsers)
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
              className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-[10px] font-bold text-white transition-colors"
            >
              Retry Canvas
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
      {/* Top Floating Reader Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-2 bg-slate-900/90 dark:bg-slate-900/95 backdrop-blur-md border-b border-white/10 text-white z-10 gap-2 shrink-0">
        {/* Document Title / Status */}
        <div className="flex items-center space-x-2 truncate max-w-[200px] sm:max-w-xs">
          <FileText className="w-4 h-4 text-brand-400 shrink-0" />
          <span className="text-xs font-bold text-slate-200 truncate">{title}</span>
        </div>

        {/* Page Navigators */}
        <div className="flex items-center space-x-1">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2 text-xs font-bold text-slate-200 font-mono">
            {loading ? '...' : `${currentPage} / ${numPages || 1}`}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= numPages || loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & Transform Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="hidden sm:inline-block px-1.5 text-[11px] font-bold text-slate-400 font-mono">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={handleRotate}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
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
