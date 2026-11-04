import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  message: string;
  isError: boolean;
  action?: ToastAction;
}

interface ToastOptions {
  isError?: boolean;
  action?: ToastAction;
}

interface ToastContextType {
  showToast: (message: string, options?: ToastOptions) => void;
}

const TOAST_MS = 5000;
// An action like Undo needs longer to read and reach
const TOAST_WITH_ACTION_MS = 10000;

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, options: ToastOptions = {}) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, isError: !!options.isError, action: options.action }]);
    setTimeout(() => dismiss(id), options.action ? TOAST_WITH_ACTION_MS : TOAST_MS);
  }, [dismiss]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto z-50 flex flex-col items-end gap-2 pointer-events-none"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 24 }}
              className={`pointer-events-auto w-full md:w-96 flex items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm shadow-2xl ${
                toast.isError ? "border-destructive" : "border-border"
              }`}
            >
              <span className="grow">{toast.message}</span>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action?.onClick();
                    dismiss(toast.id);
                  }}
                  className="font-semibold text-indigo-300 hover:text-indigo-200"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss message"
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};
