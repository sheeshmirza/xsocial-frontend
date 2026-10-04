"use client";

import { useEffect, useRef, type ReactNode } from "react";
import AppIcon from "@/src/components/ui/AppIcon";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  isDestructive?: boolean;
  isLoading?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  isDestructive = false,
  isLoading = false,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Escape listener
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // Focus modal
    modalRef.current?.focus();

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={description ? "modal-description" : undefined}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 flex flex-col gap-4 outline-none transform transition-all"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="text-lg font-bold text-slate-900">
              {title}
            </h2>
            {description ? (
              <p id="modal-description" className="text-xs text-slate-500 mt-1">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="icon-btn text-slate-400 hover:text-slate-600 rounded-lg p-1"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={isLoading}
          >
            <AppIcon name="close" className="w-4 h-4" />
          </button>
        </div>

        {children ? <div className="py-2">{children}</div> : null}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="outline-btn text-xs px-4 py-2"
          >
            {cancelLabel}
          </button>
          {onConfirm && confirmLabel ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`text-xs px-4 py-2 rounded-lg font-semibold text-white transition-colors ${
                isDestructive
                  ? "bg-red-600 hover:bg-red-700 disabled:opacity-50"
                  : "primary-btn"
              }`}
            >
              {isLoading ? "Processing..." : confirmLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
