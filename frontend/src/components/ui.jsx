import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { X, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { createPortal } from 'react-dom';

// ============ Layout ============

export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="mb-6 md:mb-8 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-iron-50 tracking-wide">{title}</h1>
        {subtitle && <p className="text-iron-400 mt-1 text-sm md:text-base">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

export function Spinner({ fullPage = false }) {
  const spinner = <div className="w-8 h-8 border-2 border-rust-500 border-t-transparent rounded-full animate-spin" />;
  if (!fullPage) return <div className="flex justify-center py-8">{spinner}</div>;
  return <div className="flex items-center justify-center min-h-[60vh]">{spinner}</div>;
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-iron-800 flex items-center justify-center mb-3">
          <Icon className="w-6 h-6 text-iron-400" />
        </div>
      )}
      {title && <p className="text-iron-200 font-medium">{title}</p>}
      {text && <p className="text-iron-500 text-sm mt-1 max-w-xs">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ============ Modal ============

// Mobil als Bottom-Sheet, ab md zentriert. Schließt per Escape und Klick auf den Hintergrund.
export function Modal({ title, onClose, children, footer, size = 'md' }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const width = size === 'sm' ? 'md:max-w-sm' : size === 'lg' ? 'md:max-w-2xl' : 'md:max-w-lg';

  // Portal: sonst würde ein transformierter Vorfahre (z. B. Karten-Animation) das fixed-Overlay einsperren
  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4 animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`surface w-full ${width} max-h-[90dvh] flex flex-col rounded-t-2xl md:rounded-2xl shadow-2xl animate-sheet-up pb-safe md:pb-0`}
      >
        {title && (
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-iron-800">
            <h3 className="font-display text-lg tracking-wide text-iron-50">{title}</h3>
            <button onClick={onClose} className="icon-btn -mr-2" aria-label="Schließen">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-iron-800 flex gap-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

// ============ Dialoge & Toasts ============

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setDialog({ ...options, resolve });
  }), []);

  const closeDialog = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  const toast = useCallback((message, type = 'success') => {
    const id = ++idRef.current;
    setToasts((current) => [...current, { id, message, type }]);
    setTimeout(() => setToasts((current) => current.filter((t) => t.id !== id)), 3500);
  }, []);

  const toastIcons = { success: CheckCircle2, error: AlertTriangle, info: Info };
  const toastColors = { success: 'text-emerald-400', error: 'text-red-400', info: 'text-steel-400' };

  return (
    <FeedbackContext.Provider value={{ confirm, toast }}>
      {children}

      {dialog && (
        <Modal title={dialog.title} onClose={() => closeDialog(false)} size="sm"
          footer={
            <>
              <button onClick={() => closeDialog(false)} className="btn-secondary flex-1">
                {dialog.cancelLabel || 'Abbrechen'}
              </button>
              <button
                onClick={() => closeDialog(true)}
                className={`flex-1 ${dialog.danger ? 'btn-danger' : 'btn-primary'}`}
                autoFocus
              >
                {dialog.confirmLabel || 'OK'}
              </button>
            </>
          }
        >
          {dialog.message && <p className="px-5 py-4 text-iron-300">{dialog.message}</p>}
        </Modal>
      )}

      <div className="fixed z-[70] left-0 right-0 top-3 md:top-auto md:bottom-6 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => {
          const Icon = toastIcons[t.type] || Info;
          return (
            <div key={t.id} className="surface pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl animate-slide-up max-w-md">
              <Icon className={`w-5 h-5 shrink-0 ${toastColors[t.type]}`} />
              <p className="text-iron-100 text-sm">{t.message}</p>
            </div>
          );
        })}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  return useContext(FeedbackContext);
}
