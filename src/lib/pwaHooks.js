import { useState, useEffect } from 'react'

/**
 * Hook to track online/offline status
 * @returns {boolean} true if online, false if offline
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook to detect available app updates
 * @returns {{ updateAvailable: boolean, applyUpdate: function }}
 */
export function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    function handleUpdate(event) {
      setUpdateAvailable(true);
      setWaitingWorker(event.detail.worker);
    }

    window.addEventListener('swUpdate', handleUpdate);

    return () => {
      window.removeEventListener('swUpdate', handleUpdate);
    };
  }, []);

  function applyUpdate() {
    if (waitingWorker) {
      waitingWorker.postMessage('skipWaiting');
    }
  }

  return { updateAvailable, applyUpdate };
}

/**
 * Hook to detect if app is installed (standalone mode)
 * @returns {boolean} true if running as installed PWA
 */
export function useIsInstalled() {
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    
    setIsInstalled(isStandalone);

    // Listen for changes (in case user installs while using)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handler = (e) => setIsInstalled(e.matches);
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isInstalled;
}
