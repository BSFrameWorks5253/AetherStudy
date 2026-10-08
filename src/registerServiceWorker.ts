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
    const swUrl = './sw.js';

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        // Listen for found updates
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker == null) return;

          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New update available
                console.log('[AetherStudy PWA] New update ready. Refresh to activate.');
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
  });
}
