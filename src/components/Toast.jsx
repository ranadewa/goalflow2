import { useState, useEffect, createContext, useContext, useCallback } from 'react'

// Toast Context
const ToastContext = createContext(null);

// Toast types and their icons
const TOAST_ICONS = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
};

// Toast Provider Component
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now();
    
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => 
      prev.map(t => t.id === id ? { ...t, exiting: true } : t)
    );
    
    // Remove from DOM after animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 200);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// Toast Container Component
function ToastContainer({ toasts, onRemove }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`toast ${toast.type} ${toast.exiting ? 'exiting' : ''}`}
        >
          <span className="toast-icon">{TOAST_ICONS[toast.type]}</span>
          <span className="toast-message">{toast.message}</span>
          <button 
            className="toast-close"
            onClick={() => onRemove(toast.id)}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

// Hook to use toasts
export function useToast() {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return {
    toast: context.addToast,
    success: (msg, duration) => context.addToast(msg, 'success', duration),
    error: (msg, duration) => context.addToast(msg, 'error', duration),
    warning: (msg, duration) => context.addToast(msg, 'warning', duration),
    info: (msg, duration) => context.addToast(msg, 'info', duration),
    remove: context.removeToast
  };
}
