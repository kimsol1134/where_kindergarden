"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Splash1() {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setShowContent(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-white flex flex-col justify-center items-center overflow-hidden z-[9999]">
      {/* Icon Wrapper */}
      <div 
        className={`w-[120px] h-[120px] transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          showContent ? "opacity-100 scale-100" : "opacity-0 scale-92"
        }`}
      >
        <Image 
          src="/icon.png" 
          alt="App Icon" 
          width={120} 
          height={120}
          className="w-full h-full object-contain rounded-[24px] shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
        />
      </div>

      {/* Footer Text */}
      <div 
        className={`absolute bottom-10 text-[#888] text-sm tracking-tighter transition-all duration-1000 ease-out delay-500 ${
          showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2.5"
        }`}
      >
        우리동네 유치원
      </div>

      {/* Back Link for Demo */}
      <Link href="/splash-preview" className="absolute top-10 right-4 px-4 py-2 bg-gray-100 rounded-full text-xs text-gray-500 z-50">
        Close
      </Link>
    </div>
  );
}
