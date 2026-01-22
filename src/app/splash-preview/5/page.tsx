"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Splash5() {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // Sequence timer
    const t1 = setTimeout(() => setStage(1), 800);  // Start mask expansion
    const t2 = setTimeout(() => setStage(2), 1200); // Fade out icon, show UI
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-white flex justify-center items-center overflow-hidden z-[9999]">
      
      {/* Expanding Mask */}
      <div 
        className={`absolute w-[120px] h-[120px] bg-emerald-500 rounded-full z-20 transition-transform duration-800 ease-[cubic-bezier(0.7,0,0.3,1)] ${
          stage >= 1 ? "scale-[25] opacity-0" : "scale-1 opacity-100"
        }`} 
      />

      {/* Icon */}
      <div 
        className={`absolute w-[120px] h-[120px] z-30 flex justify-center items-center transition-all duration-300 ease-out ${
           stage >= 1 ? "opacity-0 scale-[3]" : "opacity-100 scale-100"
        }`}
      >
        <Image 
          src="/app-icon-preview.png" 
          alt="App Icon" 
          width={120} 
          height={120}
          className="w-full h-full rounded-[28px]"
        />
      </div>

      {/* Fake UI Layer */}
      <div 
        className={`absolute inset-0 bg-white z-10 flex flex-col transition-opacity duration-100 ${
          stage >= 2 ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Header */}
        <div className="h-[60px] border-b border-gray-100 flex items-center px-5">
           <div className="w-[100px] h-4 bg-gray-200 rounded"></div>
        </div>

        {/* Hero */}
        <div className="h-[200px] bg-emerald-50 flex flex-col justify-center items-center gap-3">
          <div className="w-[200px] h-6 bg-emerald-100 rounded-md"></div>
          <div className="w-[160px] h-4 bg-emerald-100/50 rounded"></div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {[1,2,3].map(i => (
             <div key={i} className="h-20 bg-gray-50 rounded-xl" />
          ))}
        </div>
      </div>

      <Link href="/splash-preview" className="absolute top-10 right-4 px-4 py-2 bg-gray-100 rounded-full text-xs text-gray-500 z-50">
        Reset
      </Link>
    </div>
  );
}
