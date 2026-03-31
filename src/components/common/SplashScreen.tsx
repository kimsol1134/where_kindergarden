'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { isNative as checkIsNative } from '@/lib/utils/platform';

interface Props {
  onFinished?: () => void;
}

export function SplashScreen({ onFinished }: Props) {
  const isNative = checkIsNative();
  const [isVisible, setIsVisible] = useState(isNative);
  const [opacity, setOpacity] = useState(1);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!isNative) {
      onFinished?.();
      return;
    }

    const enterTimer = setTimeout(() => setEntered(true), 80);

    const timer = setTimeout(() => {
      setOpacity(0);
      setTimeout(() => {
        setIsVisible(false);
        onFinished?.();
      }, 500);
    }, 2500);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(timer);
    };
  }, [isNative, onFinished]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#FAFDF8] transition-opacity duration-500 ease-in-out"
      style={{ opacity }}
    >
      {/* Sun glow — top right */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(244,216,106,0.16)_0%,transparent_70%)]" />

      {/* Search radius — dashed ring */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-dashed border-[rgba(78,169,109,0.16)] animate-[splash-radius-pulse_3s_ease-in-out_infinite]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-[rgba(78,169,109,0.08)] animate-[splash-radius-pulse_3s_ease-in-out_0.6s_infinite]" />

      {/* Orbit dots */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2">
        <span className="absolute left-1/2 top-0 -ml-1 h-2 w-2 rounded-full bg-[rgba(78,169,109,0.35)] animate-[splash-orbit-dot_3s_ease-in-out_1.2s_infinite]" />
        <span className="absolute right-0 top-1/2 -mt-1 h-2 w-2 rounded-full bg-[rgba(244,216,106,0.45)] animate-[splash-orbit-dot_3s_ease-in-out_1.8s_infinite]" />
        <span className="absolute bottom-0 left-1/2 -ml-1 h-2 w-2 rounded-full bg-[rgba(78,169,109,0.25)] animate-[splash-orbit-dot_3s_ease-in-out_2.4s_infinite]" />
      </div>

      {/* Icon + scan sweep */}
      <div
        className={`relative z-10 transition-all duration-700 ease-out ${
          entered ? 'scale-100 opacity-100' : 'scale-[0.85] opacity-0'
        }`}
      >
        <div className="relative h-28 w-28 overflow-hidden rounded-[2rem] shadow-[0_16px_48px_rgba(78,169,109,0.16)]">
          <Image
            src="/icon.png"
            alt="우리동네 유치원"
            fill
            sizes="112px"
            className="object-cover"
          />
          {/* Scan light sweep */}
          <div className="pointer-events-none absolute inset-0 animate-[splash-sweep_2.5s_ease-in-out_1s_infinite]">
            <div className="absolute -left-10 top-0 h-full w-10 -skew-x-12 bg-[linear-gradient(90deg,transparent,rgba(244,216,106,0.32),transparent)]" />
          </div>
        </div>
      </div>

      {/* Text */}
      <div
        className={`z-10 mt-7 text-center transition-all duration-600 ease-out delay-200 ${
          entered ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        }`}
      >
        <h1 className="text-[1.625rem] font-extrabold tracking-tight text-[#2D5A3D]">
          우리동네 유치원
        </h1>
        <p className="mt-2.5 flex items-center justify-center gap-1.5 text-sm font-medium text-[#9DB89A]">
          <svg
            className="h-4 w-4 animate-[splash-mag-wobble_2s_ease-in-out_infinite]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <span>우리 아이에게 맞는 곳을 찾아볼게요</span>
        </p>
      </div>

      {/* Bottom loading bar */}
      <div className="absolute bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] h-[3px] w-44 overflow-hidden rounded-full bg-[rgba(78,169,109,0.1)]">
        <div className="h-full w-full animate-[splash-loading_2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-[#4EA96D] via-[#F4D86A] to-[#4EA96D]" />
      </div>
    </div>
  );
}
