'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import WifiOff from 'lucide-react/dist/esm/icons/wifi-off';

function subscribeToConnectionStatus(onStoreChange: () => void) {
  window.addEventListener('offline', onStoreChange);
  window.addEventListener('online', onStoreChange);
  return () => {
    window.removeEventListener('offline', onStoreChange);
    window.removeEventListener('online', onStoreChange);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

export function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribeToConnectionStatus, getOnlineSnapshot, () => true);
  const isOffline = !isOnline;
  const [showReconnected, setShowReconnected] = useState(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const handleOffline = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setShowReconnected(false);
    };

    const handleOnline = () => {
      setShowReconnected(true);
      reconnectTimerRef.current = setTimeout(() => setShowReconnected(false), 3000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, []);

  if (!isOffline && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] safe-area-top ${
        isOffline
          ? 'bg-red-500 text-white'
          : 'bg-emerald-500 text-white'
      }`}
    >
      <div className="flex items-center justify-center gap-2 py-2 text-xs font-medium">
        {isOffline ? (
          <>
            <WifiOff className="w-3.5 h-3.5" />
            <span>인터넷 연결이 끊어졌어요</span>
          </>
        ) : (
          <span>다시 연결되었어요</span>
        )}
      </div>
    </div>
  );
}
