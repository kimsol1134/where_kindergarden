'use client';

import { CheckCircle2, AlertCircle, X } from 'lucide-react';

type ToastTone = 'success' | 'error';

interface ToastMessageProps {
  message: string;
  tone?: ToastTone;
  onClose?: () => void;
}

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-emerald-200 bg-white text-emerald-900 shadow-[0_12px_30px_rgba(16,185,129,0.16)]',
  error: 'border-red-200 bg-white text-red-900 shadow-[0_12px_30px_rgba(239,68,68,0.16)]',
};

export function ToastMessage({
  message,
  tone = 'success',
  onClose,
}: ToastMessageProps) {
  return (
    <div className="pointer-events-none fixed inset-x-4 top-4 z-[100] flex justify-center safe-area-top">
      <div
        className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border px-4 py-3 ${TONE_STYLES[tone]}`}
        role="status"
        aria-live="polite"
      >
        <div className="mt-0.5">
          {tone === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
        </div>
        <p className="flex-1 text-sm font-medium leading-5">{message}</p>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="토스트 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
