'use client';

import { useEffect, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface UseOverlayFocusOptions {
  active: boolean;
  containerRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onClose: () => void;
  trapFocus?: boolean;
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => {
      const style = window.getComputedStyle(element);
      return (
        !element.hasAttribute('disabled') &&
        !element.hidden &&
        element.getAttribute('aria-hidden') !== 'true' &&
        style.display !== 'none' &&
        style.visibility !== 'hidden'
      );
    }
  );
}

/**
 * Moves focus into an overlay, restores it to its opener, closes on Escape,
 * and optionally traps Tab navigation for modal presentations.
 */
export function useOverlayFocus({
  active,
  containerRef,
  initialFocusRef,
  onClose,
  trapFocus = true,
}: UseOverlayFocusOptions): void {
  useEffect(() => {
    if (!active) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    let retryTimer: number | null = null;
    let removeListeners: (() => void) | null = null;

    const initialize = () => {
      const container = containerRef.current;
      if (!container) {
        // BodyPortal mounts its children after hydration, so the ref may not
        // exist during this parent's first effect pass.
        retryTimer = window.setTimeout(initialize, 0);
        return;
      }

      const focusInitialElement = () => {
        const explicitTarget = initialFocusRef?.current;
        if (explicitTarget) {
          explicitTarget.focus();
          return;
        }

        const [firstFocusable] = getFocusableElements(container);
        (firstFocusable ?? container).focus();
      };

      focusInitialElement();

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose();
          return;
        }

        if (!trapFocus || event.key !== 'Tab') return;

        const focusable = getFocusableElements(container);
        if (focusable.length === 0) {
          event.preventDefault();
          container.focus();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const activeElement = document.activeElement;

        if (event.shiftKey && (activeElement === first || !container.contains(activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (activeElement === last || !container.contains(activeElement))) {
          event.preventDefault();
          first.focus();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      removeListeners = () => document.removeEventListener('keydown', handleKeyDown);
    };

    initialize();
    return () => {
      if (retryTimer !== null) window.clearTimeout(retryTimer);
      removeListeners?.();
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [active, containerRef, initialFocusRef, onClose, trapFocus]);
}
