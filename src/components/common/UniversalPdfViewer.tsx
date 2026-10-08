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
} from 'lucide-react';

// Set offline PDF.js worker located in public/
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
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

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Safely URL encode spaces and symbols for local file paths
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
    try {
      const decoded = decodeURI(url);
      return encodeURI(decoded);
    } catch {
      return encodeURI(url);
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
        console.warn('PDF.js render fallback to iframe:', err);
        setError('Direct engine fallback active.');
        setLoading(false);
      });

    return () => {
      isCancelled = true;
      try {
        loadingTask.destroy();
      } catch {}
    };
  }, [safePdfUrl, isGoogleDrive]);

  // Render Page to Canvas
  useEffect(() => {
    if (!pdfDoc || isGoogleDrive || error) return;

    let isCancelled = false;

    pdfDoc.getPage(currentPage).then((page: any) => {
      if (isCancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      if (!context) return;

      // Adjust scale for high DPI mobile displays
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

      page.render(renderContext);
    });

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, scale, rotation, isGoogleDrive, error]);

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

  // 1. Google Drive Embed View
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

  // 2. Fallback to native iframe if PDF.js fails to parse
  if (error) {
    return (
      <div className={`relative w-full h-full flex flex-col bg-slate-900 ${className}`}>
        <div className="p-2 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs text-slate-300">
          <span className="truncate">{title}</span>
          <a
            href={safePdfUrl}
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-bold text-[11px] flex items-center gap-1 shrink-0"
          >
            <ExternalLink className="w-3 h-3" /> Open Full PDF ↗
          </a>
        </div>
        <iframe
          src={safePdfUrl}
          title={title}
          allow="autoplay; fullscreen"
          className="w-full h-full bg-white border-0"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden select-none ${className}`}
    >
      {/* Top Floating Control Toolbar */}
      <div className="shrink-0 px-3 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 z-10 shadow-xs">
        {/* Page Navigation */}
        <div className="flex items-center space-x-1">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1 || loading}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2 text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">
            {loading ? '...' : `${currentPage} / ${numPages || 1}`}
          </span>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= numPages || loading}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 dark:text-slate-200 transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & Transform Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <span className="hidden sm:inline-block px-1.5 text-[11px] font-bold text-slate-500 font-mono">
            {Math.round(scale * 100)}%
          </span>

          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={handleRotate}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            title="Rotate 90°"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <a
            href={safePdfUrl}
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors shrink-0 ml-1"
            title="Open in native mobile PDF viewer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open Fullscreen</span>
          </a>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative bg-slate-200/60 dark:bg-slate-950/80">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs z-20">
            <RefreshCw className="w-7 h-7 text-brand-500 animate-spin mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
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
