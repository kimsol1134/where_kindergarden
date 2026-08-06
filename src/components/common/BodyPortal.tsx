'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface BodyPortalProps {
  children: ReactNode;
}

const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Renders viewport-level UI outside transformed or clipped layout ancestors.
 * Waiting until mount keeps the server and first client render identical.
 */
export function BodyPortal({ children }: BodyPortalProps) {
  const isMounted = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );

  if (!isMounted) return null;

  return createPortal(children, document.body);
}
