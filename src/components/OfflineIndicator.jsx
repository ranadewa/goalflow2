import { useOnlineStatus } from '../lib/pwaHooks'
import { useState, useEffect } from 'react'

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
    } else if (wasOffline) {
      // Just came back online
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div className={`connection-indicator ${isOnline ? 'online' : 'offline'}`}>
      {isOnline ? (
        <>
          <span className="indicator-icon">✓</span>
          <span>Back online</span>
        </>
      ) : (
        <>
          <span className="indicator-icon">⚡</span>
          <span>You're offline — changes will sync when reconnected</span>
        </>
      )}
    </div>
  );
}
