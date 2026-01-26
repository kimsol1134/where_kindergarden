'use client';

import { useEffect, useRef } from 'react';

/**
 * KakaoAdFit Web Banner
 * Uses script injection to load ads.
 * Requires a valid ad unit ID from KakaoAdFit console.
 */

// Extend Window interface to include kakao ad object if needed, 
// though we just rely on the global script execution.
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

    // Prevent duplicate injection if strictly controlled, 
    // but KakaoAdFit script usually handles its own lifecycle within the ins tag.
    // However, React re-renders might duplicate scripts if not careful.
    
    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/kas/static/ba.min.js';
    script.async = true;
    script.setAttribute('charset', 'utf-8');

    containerRef.current.appendChild(script);

    return () => {
      // Cleanup script if necessary, though usually not needed for ad scripts 
      // as they modify the DOM inside the <ins> tag.
      // Removing the script tag itself doesn't remove the ad, but React will remove the container.
      if (containerRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        const scripts = containerRef.current.getElementsByTagName('script');
        if (scripts.length > 0) {
            containerRef.current.removeChild(scripts[0]);
        }
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="flex justify-center my-4 w-full h-[50px] overflow-hidden">
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
