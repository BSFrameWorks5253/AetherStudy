/**
 * Service Worker Registration & Lifecycle Manager
 * Enables offline capability and notifies when an update is ready.
 */

export function registerServiceWorker(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    // Determine sw path relative to base
    const swUrl = '/sw.js';

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        // If a new worker is waiting, activate it immediately
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Listen for new updates
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker == null) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available, activate it immediately!
                console.log('[AetherStudy PWA] New update ready. Activating...');
                installingWorker.postMessage({ type: 'SKIP_WAITING' });
              } else {
                // Content cached for offline use
                console.log('[AetherStudy PWA] Content cached for full offline use.');
              }
            }
          };
        };
      })
      .catch((error) => {
        console.warn('[AetherStudy PWA] Service Worker registration failed:', error);
      });

    // Auto-reload once when a new Service Worker takes control of the page
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        console.log('[AetherStudy PWA] Controller changed. Reloading with latest code...');
        window.location.reload();
      }
    });
  });
}
