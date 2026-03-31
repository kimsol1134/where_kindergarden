"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Splash3() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setActive(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-white flex flex-col justify-center items-center overflow-hidden z-[9999]">
      <div 
        className={`w-[100px] h-[100px] mb-8 transition-all duration-1000 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
          active ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-5 scale-90"
        }`}
      >
        <Image 
          src="/icon.png" 
          alt="App Icon" 
          width={100} 
          height={100}
          className="w-full h-full object-contain rounded-[24px] shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
        />
      </div>

      <div className="overflow-hidden">
        <div 
          className={`text-2xl font-bold text-[#111] mb-2 transition-all duration-800 ease-[cubic-bezier(0.2,0.8,0.2,1)] delay-300 ${
            active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full"
          }`}
        >
          우리동네 유치원
        </div>
      </div>

      <div className="overflow-hidden">
        <div 
          className={`text-base text-emerald-500 font-semibold transition-all duration-800 ease-[cubic-bezier(0.2,0.8,0.2,1)] delay-500 ${
            active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-full"
          }`}
        >
          우리 아이 첫 유치원 찾기
        </div>
      </div>

      <Link href="/splash-preview" className="absolute top-10 right-4 px-4 py-2 bg-gray-100 rounded-full text-xs text-gray-500 z-50">
        Close
      </Link>
    </div>
  );
}
