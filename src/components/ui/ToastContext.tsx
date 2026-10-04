"use client";

import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import AppIcon from "@/src/components/ui/AppIcon";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message }]);

      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast],
  );

  const success = useCallback((msg: string) => showToast(msg, "success"), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, "error"), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, "info"), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium animate-slide-in ${
              t.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : t.type === "error"
                  ? "bg-red-50 border-red-200 text-red-900"
                  : t.type === "warning"
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-blue-50 border-blue-200 text-blue-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <AppIcon
                name={
                  t.type === "success"
                    ? "check"
                    : t.type === "error"
                      ? "alert"
                      : "pulse"
                }
                className="w-4 h-4 flex-shrink-0"
              />
              <span>{t.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label="Dismiss notification"
            >
              <AppIcon name="close" className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    // Return safe fallback if used outside provider
    return {
      showToast: () => {},
      success: () => {},
      error: (msg: string) => {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.error(msg);
        }
      },
      info: () => {},
    };
  }
  return context;
}
