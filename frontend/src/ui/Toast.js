import { createContext, useContext, useMemo, useState } from 'react';

const ToastContext = createContext({ show: () => {} });

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const show = (message, { variant = 'info', duration = 2000 } = {}) => {
    setToast({ id: Date.now(), message, variant });
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => setToast(null), duration);
  };
  const value = useMemo(() => ({ show }), []);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed inset-x-0 top-4 flex justify-center pointer-events-none z-50">
        {toast ? (
          <div
            role="status"
            aria-live="polite"
            className={`pointer-events-auto px-4 py-2 rounded-lg shadow-md text-white ${
              toast.variant === 'error'
                ? 'bg-red-600'
                : toast.variant === 'success'
                ? 'bg-green-600'
                : 'bg-gray-900'
            }`}
          >
            {toast.message}
          </div>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}


