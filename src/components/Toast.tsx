'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  isExiting: boolean;
}

const toastConfig: Record<ToastType, { bg: string; text: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-green-500/20',
    text: 'text-green-400',
    icon: <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />,
  },
  error: {
    bg: 'bg-red-500/20',
    text: 'text-red-400',
    icon: <XCircle className="w-5 h-5 text-red-400 shrink-0" />,
  },
  info: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    icon: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
  },
};

// Singleton state management for toasts
let globalToasts: Toast[] = [];
let globalSetToasts: React.Dispatch<React.SetStateAction<Toast[]>> | null = null;
let toastIdCounter = 0;

function addToastGlobal(type: ToastType, message: string) {
  const id = `toast-${++toastIdCounter}`;
  const toast: Toast = { id, type, message, isExiting: false };

  if (globalSetToasts) {
    globalSetToasts((prev) => [...prev, toast]);
  }

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    if (globalSetToasts) {
      globalSetToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
      );
    }
    // Remove after exit animation
    setTimeout(() => {
      if (globalSetToasts) {
        globalSetToasts((prev) => prev.filter((t) => t.id !== id));
      }
    }, 300);
  }, 3000);
}

export function useToast() {
  const addToast = useCallback((type: ToastType, message: string) => {
    addToastGlobal(type, message);
  }, []);

  return { addToast };
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    globalToasts = toasts;
    globalSetToasts = setToasts;
    return () => {
      globalSetToasts = null;
    };
  }, []);

  return (
    <div className="fixed bottom-2 right-2 left-2 sm:bottom-4 sm:right-4 sm:left-auto z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const config = toastConfig[toast.type];
        return (
          <div
            key={toast.id}
            className={`
              pointer-events-auto relative overflow-hidden
              flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
              ${config.bg} ${config.text}
              transition-all duration-300 ease-in-out
              ${toast.isExiting
                ? 'translate-x-full opacity-0'
                : 'translate-x-0 opacity-100'
              }
            `}
          >
            {config.icon}
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => {
                setToasts((prev) =>
                  prev.map((t) => (t.id === toast.id ? { ...t, isExiting: true } : t))
                );
                setTimeout(() => {
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }, 300);
              }}
              className="ml-2 shrink-0 hover:opacity-70 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
            <div className={`toast-progress ${toast.type}`} />
          </div>
        );
      })}
    </div>
  );
}
