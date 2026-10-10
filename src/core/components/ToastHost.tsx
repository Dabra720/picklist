import { useEffect, useState } from 'react';
import { subscribeToasts, type Toast } from '../lib/toast';

const DURATION = 5000;

export function ToastHost() {
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => subscribeToasts(setToast), []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), DURATION);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toast && (
        <div className="toast" key={toast.id}>
          <span>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.run();
                setToast(null);
              }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
