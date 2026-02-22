import * as React from "react";

export type ToastInput = {
  title?: string;
  description?: string;
  durationMs?: number;
};

export type ToastItem = ToastInput & {
  id: string;
  open: boolean;
};

type ToastCtx = {
  toasts: ToastItem[];
  toast: (t: ToastInput) => void;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastCtx | null>(null);

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ToastProviderState({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, open: false } : t)));
  }, []);

  const toast = React.useCallback((t: ToastInput) => {
    const id = uid();
    setToasts((prev) => [{ id, open: true, durationMs: 4000, ...t }, ...prev].slice(0, 5));
  }, []);

  return <ToastContext.Provider value={{ toasts, toast, dismiss }}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProviderState");
  return ctx;
}
