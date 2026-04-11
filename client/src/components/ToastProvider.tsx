/**
 * Toast System — Non-blocking notifications for errors, success, info
 * Uses React Context to manage toast queue globally
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type ToastType = "error" | "success" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, 0 = persistent
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const duration = toast.duration ?? (toast.type === "error" ? 6000 : 4000);

    setToasts(prev => [...prev, { ...toast, id, duration }]);

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

// ─── Toast Container ──────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-3 max-w-sm pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// ─── Toast Item ───────────────────────────────────────────────────────────

const TOAST_CONFIG: Record<
  ToastType,
  { icon: typeof Info; color: string; bg: string }
> = {
  error: {
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-400/10 border-red-400/30",
  },
  success: {
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "bg-green-400/10 border-green-400/30",
  },
  info: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/30",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/30",
  },
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const config = TOAST_CONFIG[toast.type];
  const Icon = config.icon;

  return (
    <div
      className={`pointer-events-auto border ${config.bg} p-4 flex items-start gap-3 animate-in fade-in slide-in-from-right-4 duration-300`}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${config.color}`} />

      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${config.color}`}>{toast.title}</p>
        {toast.message && (
          <p className="text-sm text-muted-foreground mt-1">{toast.message}</p>
        )}
        {toast.action && (
          <button
            onClick={() => {
              toast.action!.onClick();
              onRemove(toast.id);
            }}
            className={`text-xs font-semibold mt-2 ${config.color} hover:underline`}
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={() => onRemove(toast.id)}
        className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
