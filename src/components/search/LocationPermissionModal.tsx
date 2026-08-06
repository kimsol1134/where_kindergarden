'use client';

import { useEffect, useRef } from 'react';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import { BodyPortal } from '@/components/common/BodyPortal';
import { useOverlayFocus } from '@/hooks/useOverlayFocus';

interface Props {
  isOpen: boolean;
  onAllow: () => void;
  onDismiss: () => void;
}

export function LocationPermissionModal({ isOpen, onAllow, onDismiss }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const allowButtonRef = useRef<HTMLButtonElement>(null);

  useOverlayFocus({
    active: isOpen,
    containerRef: dialogRef,
    initialFocusRef: allowButtonRef,
    onClose: onDismiss,
  });

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 bg-black/40 z-[60]"
        onClick={onDismiss}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-permission-title"
        aria-describedby="location-permission-description"
        tabIndex={-1}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 mx-auto max-w-sm bg-white rounded-2xl shadow-xl z-[61] p-6 text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(78,169,109,0.12)]">
          <MapPin className="h-8 w-8 text-[var(--brand-leaf)]" />
        </div>

        <h3
          id="location-permission-title"
          className="text-lg font-bold text-[var(--brand-ink)] mb-2"
        >
          주변 유치원을 찾기 위해
        </h3>
        <p
          id="location-permission-description"
          className="text-sm text-[var(--brand-ink-soft)] mb-6 leading-relaxed"
        >
          현재 위치가 필요해요.<br />
          위치 정보는 검색에만 사용되며 저장되지 않아요.
        </p>

        <div className="flex flex-col gap-2">
          <button
            ref={allowButtonRef}
            onClick={onAllow}
            className="w-full rounded-xl bg-[var(--brand-leaf)] py-3 text-sm font-bold text-white shadow-[0_18px_36px_rgba(78,169,109,0.24)] transition-colors hover:bg-[var(--brand-leaf-deep)] active:scale-[0.98]"
          >
            위치 허용하기
          </button>
          <button
            onClick={onDismiss}
            className="w-full rounded-xl py-3 text-sm font-medium text-[var(--brand-ink-soft)] hover:bg-gray-50 transition-colors"
          >
            나중에
          </button>
        </div>
      </div>
    </BodyPortal>
  );
}
