import { useEffect } from 'react';

type ToastProps = {
  message: string;
  type?: 'error' | 'warning' | 'info' | 'success';
  onClose: () => void;
  duration?: number;
};

export default function Toast({ message, type = 'error', onClose, duration = 6000 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const isWarning = type === 'warning';
  const isSuccess = type === 'success';

  return (
    <div
      className="position-fixed top-0 end-0 p-3"
      style={{ zIndex: 9999, maxWidth: '420px', width: '100%', pointerEvents: 'none' }}
      role="region"
      aria-label="Notification alerts"
    >
      <div
        className={`toast show align-items-center border-0 shadow-lg ${
          isWarning ? 'text-bg-warning' : isSuccess ? 'text-bg-success' : 'text-bg-danger'
        }`}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style={{ pointerEvents: 'auto', borderRadius: '12px' }}
      >
        <div className="d-flex align-items-center p-2">
          <i
            className={`bi ${
              isWarning ? 'bi-exclamation-triangle-fill' : isSuccess ? 'bi-check-circle-fill' : 'bi-x-circle-fill'
            } fs-5 ms-2 me-2`}
          />
          <div className="toast-body flex-grow-1 py-1" style={{ fontSize: '13px', fontWeight: 500, lineHeight: 1.4 }}>
            {message}
          </div>
          <button
            type="button"
            className={`btn-close ${isWarning ? '' : 'btn-close-white'} me-2 m-auto`}
            aria-label="Close"
            onClick={onClose}
          />
        </div>
      </div>
    </div>
  );
}
