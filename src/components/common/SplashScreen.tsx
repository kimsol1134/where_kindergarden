'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import Image from 'next/image';

export function SplashScreen({ onFinished }: { onFinished?: () => void }) {
  const isNative = Capacitor.isNativePlatform();
  const [isVisible, setIsVisible] = useState(isNative);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (!isNative) {
      onFinished?.();
      return;
    }

    // Artificial delay to show splash screen or wait for initial data
    const timer = setTimeout(() => {
      setOpacity(0);
      setTimeout(() => {
        setIsVisible(false);
        onFinished?.();
      }, 500); // Wait for fade out transition
    }, 2500); // Total show time

    return () => clearTimeout(timer);
  }, [isNative, onFinished]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--brand-page)] transition-opacity duration-500 ease-in-out"
      style={{ opacity }}
    >
      <div className="absolute left-[-4rem] top-16 h-52 w-52 rounded-full bg-[rgba(244,216,106,0.22)] blur-3xl" />
      <div className="absolute right-[-5rem] bottom-16 h-60 w-60 rounded-full bg-[rgba(78,169,109,0.18)] blur-3xl" />

      <div className="brand-shell flex flex-col items-center rounded-[2.5rem] px-10 py-12 animate-fade-up">
        <div className="relative mb-5 h-24 w-24 overflow-hidden rounded-[2rem] border border-white/80 bg-white/84 shadow-[0_18px_36px_rgba(129,136,97,0.14)]">
          <Image
            src="/app-icon-preview.png"
            alt="우리동네 유치원"
            fill
            sizes="96px"
            className="object-cover p-2"
          />
        </div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-[var(--brand-ink)]">
          우리동네 유치원
        </h1>
        <p className="font-medium text-[var(--brand-leaf)]">
          안심되는 탐색 경험
        </p>
      </div>

      <div className="absolute bottom-32 h-1 w-48 overflow-hidden rounded-full bg-[rgba(203,188,174,0.22)]">
        <div className="h-full rounded-full bg-gradient-to-r from-[var(--brand-leaf)] via-[var(--brand-sun)] to-[var(--brand-leaf)] animate-loading-bar" />
      </div>
    </div>
  );
}
