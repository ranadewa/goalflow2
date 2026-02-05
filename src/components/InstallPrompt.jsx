import { useState, useEffect } from 'react'
import { useIsInstalled } from '../lib/pwaHooks'

export default function InstallPrompt() {
  const isInstalled = useIsInstalled();
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed (stored in localStorage)
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = wasDismissed ? parseInt(wasDismissed, 10) : 0;
    const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);
    
    // Show again after 7 days
    if (daysSinceDismissed < 7) {
      setDismissed(true);
    }

    // Capture the install prompt event
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      
      // Show prompt after a short delay (let user see the app first)
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false);
      setInstallPrompt(null);
      console.log('[PWA] App installed successfully');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;

    // Show the native install prompt
    installPrompt.prompt();

    // Wait for user choice
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('[PWA] User accepted install');
    } else {
      console.log('[PWA] User dismissed install');
    }

    setInstallPrompt(null);
    setShowPrompt(false);
  }

  function handleDismiss() {
    setShowPrompt(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }

  // Don't show if already installed, dismissed, or no prompt available
  if (isInstalled || dismissed || !showPrompt || !installPrompt) {
    return null;
  }

  return (
    <div className="install-prompt">
      <div className="install-content">
        <div className="install-icon">📱</div>
        <div className="install-text">
          <strong>Install GoalFlow</strong>
          <span>Add to home screen for quick access</span>
        </div>
        <div className="install-actions">
          <button className="install-btn" onClick={handleInstall}>
            Install
          </button>
          <button className="install-dismiss" onClick={handleDismiss}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
