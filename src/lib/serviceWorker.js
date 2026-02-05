// Service Worker Registration & Update Handling

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('[App] Service workers not supported');
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[App] Service worker registered:', registration.scope);

      // Check for updates periodically
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000); // Check every hour

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available
            showUpdateNotification(newWorker);
          }
        });
      });

    } catch (error) {
      console.error('[App] Service worker registration failed:', error);
    }
  });

  // Handle controller change (new SW activated)
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Reload to get new version
    window.location.reload();
  });
}

function showUpdateNotification(worker) {
  // Dispatch custom event that components can listen to
  window.dispatchEvent(new CustomEvent('swUpdate', { detail: { worker } }));
}

export function applyUpdate(worker) {
  worker.postMessage('skipWaiting');
}
