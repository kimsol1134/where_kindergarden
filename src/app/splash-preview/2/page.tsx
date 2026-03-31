"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Splash2() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setActive(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-white flex flex-col justify-center items-center overflow-hidden z-[9999]">
      <div className="relative flex justify-center items-center">
        {/* Pulse Circles */}
        <div className="absolute w-[120px] h-[120px] rounded-[30px] bg-emerald-500 animate-[pulse_2.5s_cubic-bezier(0.25,0.46,0.45,0.94)_infinite]"></div>
        <div className="absolute w-[120px] h-[120px] rounded-[30px] bg-emerald-500 animate-[pulse_2.5s_cubic-bezier(0.25,0.46,0.45,0.94)_0.8s_infinite] opacity-0"></div>

        {/* Icon */}
        <div 
          className={`w-[120px] h-[120px] z-10 transition-all duration-800 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${
            active ? "opacity-100 scale-100" : "opacity-0 scale-50"
          }`}
        >
          <Image 
            src="/icon.png" 
            alt="App Icon" 
            width={120} 
            height={120}
            className="w-full h-full object-contain rounded-[28px] shadow-[0_10px_25px_rgba(16,185,129,0.3)]"
          />
        </div>
      </div>

      <Link href="/splash-preview" className="absolute top-10 right-4 px-4 py-2 bg-gray-100 rounded-full text-xs text-gray-500 z-50">
        Close
      </Link>
    </div>
  );
}
