'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';


export function SplashScreen({ onFinished }: { onFinished?: () => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    // Only show splash screen on native apps, not on web
    const isNative = Capacitor.isNativePlatform();
    
    if (!isNative) {
      setIsVisible(false);
      onFinished?.();
      return;
    }

    setIsVisible(true);

    // Artificial delay to show splash screen or wait for initial data
    const timer = setTimeout(() => {
      setOpacity(0);
      setTimeout(() => {
        setIsVisible(false);
        onFinished?.();
      }, 500); // Wait for fade out transition
    }, 2500); // Total show time

    return () => clearTimeout(timer);
  }, [onFinished]);

  if (!isVisible) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white transition-opacity duration-500 ease-in-out"
      style={{ opacity }}
    >
      <div className="flex flex-col items-center animate-fade-up">
        {/* Icon removed as requested to show only splash screen text/branding */}
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
          우리동네 유치원
        </h1>
        <p className="text-emerald-500 font-medium">
          가장 쉽고 똑똑하게
        </p>
      </div>

      <div className="absolute bottom-32 w-48 h-1 bg-emerald-100 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 animate-loading-bar rounded-full" />
      </div>
    </div>
  );
}
