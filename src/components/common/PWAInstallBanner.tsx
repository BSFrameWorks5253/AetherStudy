import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share2, PlusSquare, ArrowRight, Sparkles } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Global variable so install can be triggered from anywhere (Header, buttons, etc.)
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<(prompt: BeforeInstallPromptEvent | null) => void>();

export const triggerPWAInstall = async (): Promise<'installed' | 'ios' | 'fallback'> => {
  if (globalDeferredPrompt) {
    try {
      await globalDeferredPrompt.prompt();
      const choice = await globalDeferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        globalDeferredPrompt = null;
        promptListeners.forEach((cb) => cb(null));
        return 'installed';
      }
    } catch (err) {
      console.warn('Error during PWA installation:', err);
    }
  }

  // Detect iOS Safari
  const isIOS = /ipad|iphone|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
  if (isIOS) {
    return 'ios';
  }

  return 'fallback';
};

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [showInstructionsModal, setShowInstructionsModal] = useState<boolean>(false);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check if already installed in standalone mode or previously marked as installed
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as any).standalone === true ||
        document.referrer.includes('android-app://') ||
        localStorage.getItem('aether_pwa_installed') === 'true';
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // 2. Detect mobile device or small screen
    const checkMobile = () => {
      const mobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
        navigator.userAgent.toLowerCase()
      );
      const smallScreen = window.innerWidth <= 768;
      setIsMobile(mobileUA || smallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    // 3. Check if user already dismissed or installed
    const dismissed =
      localStorage.getItem('aether_pwa_dismissed') === 'true' ||
      sessionStorage.getItem('aether_pwa_dismissed') === 'true' ||
      localStorage.getItem('aether_pwa_installed') === 'true';
    if (dismissed) {
      setIsDismissed(true);
    }

    // 4. Capture beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Don't show if user already installed or permanently dismissed
      if (localStorage.getItem('aether_pwa_installed') === 'true' || localStorage.getItem('aether_pwa_dismissed') === 'true') {
        return;
      }
      e.preventDefault();
      const installEvent = e as BeforeInstallPromptEvent;
      globalDeferredPrompt = installEvent;
      setDeferredPrompt(installEvent);
      promptListeners.forEach((cb) => cb(installEvent));
    };

    // 5. Capture appinstalled event
    const handleAppInstalled = () => {
      globalDeferredPrompt = null;
      setDeferredPrompt(null);
      promptListeners.forEach((cb) => cb(null));
      localStorage.setItem('aether_pwa_installed', 'true');
      localStorage.setItem('aether_pwa_dismissed', 'true');
      setInstalledSuccess(true);
      setTimeout(() => {
        setInstalledSuccess(false);
        setIsStandalone(true);
        setIsDismissed(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          localStorage.setItem('aether_pwa_installed', 'true');
          localStorage.setItem('aether_pwa_dismissed', 'true');
          setInstalledSuccess(true);
          setDeferredPrompt(null);
          globalDeferredPrompt = null;
          setTimeout(() => {
            setIsStandalone(true);
            setIsDismissed(true);
          }, 3000);
        } else {
          localStorage.setItem('aether_pwa_dismissed', 'true');
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
      return;
    }

    // iOS Safari instructions
    const isIOS = /ipad|iphone|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    // Generic fallback modal for Chrome/Edge/Firefox
    setShowInstructionsModal(true);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('aether_pwa_dismissed', 'true');
    sessionStorage.setItem('aether_pwa_dismissed', 'true');
  };

  // If already running inside installed standalone PWA or marked installed/dismissed, hide install banner
  if (isStandalone || isDismissed) {
    return null;
  }

  return (
    <>
      {/* ========================================================
          1. SUCCESS CELEBRATION TOAST
      ======================================================== */}
      {installedSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md p-4 rounded-2xl bg-emerald-950/95 border border-emerald-500/40 text-emerald-200 shadow-2xl backdrop-blur-xl flex items-center space-x-3 animate-slide-down">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">App Installed Successfully!</h4>
            <p className="text-xs text-emerald-300/90 mt-0.5">
              AetherStudy is now ready on your home screen with 100% offline access.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================
          2. MOBILE MAIN INSTALL NOTIFICATION CARD (High Impact)
      ======================================================== */}
      {!isDismissed && !installedSuccess && (
        <div
          className={`fixed z-50 transition-all duration-300 animate-slide-up ${
            isMobile
              ? 'bottom-3 inset-x-3 max-w-md mx-auto'
              : 'bottom-4 right-4 max-w-sm'
          }`}
        >
          <div className="relative overflow-hidden rounded-3xl bg-slate-900/95 dark:bg-slate-950/95 border border-brand-500/40 p-4 shadow-2xl backdrop-blur-xl text-white">
            {/* Glowing Accent Top Border */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-brand-500 via-purple-500 to-indigo-500" />

            {/* Notification Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                {/* App Icon with Pulsing Halo */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
                    <Smartphone className="w-6 h-6 text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white tracking-tight truncate">
                      Install AetherStudy App
                    </h3>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                      OFFLINE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300/90 leading-tight mt-0.5">
                    Download PWA app on your phone for instant access & offline PDFs.
                  </p>
                </div>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={handleDismiss}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Bar */}
            <div className="mt-3.5 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white text-xs font-black shadow-lg shadow-brand-500/30 flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
              >
                <Download className="w-4 h-4 animate-bounce" />
                <span>Install App (Download PWA)</span>
              </button>

              <button
                onClick={handleDismiss}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          3. IOS SAFARI STEP-BY-STEP MODAL
      ======================================================== */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-6 text-white shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Install on iPhone / iPad</h3>
                  <p className="text-[11px] text-slate-400">3 simple steps in Safari</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <p className="font-semibold text-slate-200">
                    Tap the <strong className="text-white">Share button</strong> in Safari
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5 flex items-center gap-1">
                    Found at the bottom of Safari screen <Share2 className="w-3.5 h-3.5 inline text-sky-400" />
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <p className="font-semibold text-slate-200">
                    Scroll down and tap <strong className="text-white">"Add to Home Screen"</strong>
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5 flex items-center gap-1">
                    Marked with a plus box icon <PlusSquare className="w-3.5 h-3.5 inline text-emerald-400" />
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50">
                <span className="w-6 h-6 rounded-full bg-brand-500/20 text-brand-400 font-bold flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <p className="font-semibold text-slate-200">
                    Tap <strong className="text-white">"Add"</strong> in the top right corner
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    AetherStudy will now appear on your home screen with offline caching!
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIOSModal(false);
                setIsDismissed(true);
                localStorage.setItem('aether_pwa_dismissed', 'true');
              }}
              className="mt-5 w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* ========================================================
          4. BROWSER MENU INSTRUCTIONS MODAL
      ======================================================== */}
      {showInstructionsModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-700 p-6 text-white shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center">
                  <Download className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Install AetherStudy App</h3>
                  <p className="text-[11px] text-slate-400">One-click installation</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowInstructionsModal(false);
                  setIsDismissed(true);
                  localStorage.setItem('aether_pwa_dismissed', 'true');
                }}
                className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-300">
              <p>
                To install this web application on your device:
              </p>
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 space-y-2">
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  <span>Tap the browser menu (three dots <strong>⋮</strong> in Chrome/Edge)</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  <span>Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-brand-400 shrink-0" />
                  <span>Click <strong>Install</strong> to download the Web APK shortcut</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowInstructionsModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
