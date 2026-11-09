import React from 'react';
import { useGramStore } from '../../store/useGramStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const toasts = useGramStore((state) => state.toasts);
  const removeToast = useGramStore((state) => state.removeToast);

  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      role="region"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => {
        let Icon = Info;
        let borderClass = 'border-turmeric/60 text-turmeric';
        let bgClass = 'bg-paper-base dark:bg-field-panel text-field-dark';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          borderClass = 'border-softgreen text-softgreen';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          borderClass = 'border-clay text-clay';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-sm border shadow-sm ${borderClass} ${bgClass} transition-all duration-200 animate-in fade-in slide-in-from-bottom-2`}
          >
            <Icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 text-xs font-sans text-field-dark leading-relaxed">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-field-dark/50 hover:text-field-dark p-0.5 rounded-sm transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
