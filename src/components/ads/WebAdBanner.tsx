'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adfit?: any;
  }
}

export function WebAdBanner() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/kas/static/ba.min.js';
    script.async = true;
    script.setAttribute('charset', 'utf-8');

    containerRef.current.appendChild(script);

    const container = containerRef.current;
    return () => {
      const scripts = container.getElementsByTagName('script');
      if (scripts.length > 0) {
        container.removeChild(scripts[0]);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="flex justify-center w-full h-[50px] overflow-hidden">
      <ins
        className="kakao_ad_area"
        style={{ display: 'none' }}
        data-ad-unit="DAN-9sObFKuQVGkibU6g"
        data-ad-width="320"
        data-ad-height="50"
      />
    </div>
  );
}
