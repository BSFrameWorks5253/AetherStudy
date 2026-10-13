import { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showDetails: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[AetherStudy ErrorBoundary] Caught unhandled React error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCacheAndReload = () => {
    try {
      // Clear document/session caches that might contain corrupt data
      sessionStorage.clear();
      const keysToClear = [
        'aether_local_documents',
        'aether_recent_documents_v1',
        'aether_active_standard',
        'aether_reading_memory_v1',
        'aether_pending_sync_docs',
      ];
      keysToClear.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Failed clearing cache:', e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-[#07090f] text-slate-100 p-6 select-none">
          <div className="w-full max-w-md p-8 rounded-2xl bg-surface-900/90 border border-white/10 shadow-2xl backdrop-blur-xl text-center flex flex-col items-center">
            {/* Visual Icon */}
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5 shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            {/* Title & Description */}
            <h1 className="text-xl font-bold tracking-tight text-white mb-2">
              AetherStudy Recovery
            </h1>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              The application encountered an unexpected runtime error. You can quickly reload or reset cached data to continue.
            </p>

            {/* Action Buttons */}
            <div className="w-full space-y-3 mb-5">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-[0.98] transition-all text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-500/25"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>

              <button
                type="button"
                onClick={this.handleResetCacheAndReload}
                className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] transition-all text-slate-300 hover:text-white font-medium text-sm flex items-center justify-center gap-2 border border-white/10"
              >
                <RotateCcw className="w-4 h-4" />
                Clear Local Cache & Reset
              </button>
            </div>

            {/* Expandable Technical Details */}
            {this.state.error && (
              <div className="w-full pt-3 border-t border-white/5 text-left">
                <button
                  type="button"
                  onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                  className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-400 py-1 transition-colors"
                >
                  <span>Diagnostic Information</span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {this.state.showDetails && (
                  <div className="mt-2 p-3 rounded-lg bg-black/50 border border-white/5 text-[11px] font-mono text-red-400 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap select-text">
                    <p className="font-semibold">{this.state.error.name}: {this.state.error.message}</p>
                    {this.state.errorInfo?.componentStack && (
                      <p className="mt-2 text-slate-500">{this.state.errorInfo.componentStack}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
