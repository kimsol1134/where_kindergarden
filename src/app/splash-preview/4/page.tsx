"use client";

import Image from "next/image";
import Link from "next/link";

export default function Splash4() {
  return (
    <div className="fixed inset-0 bg-slate-50 flex justify-center items-center overflow-hidden z-[9999]">
      {/* Background Gradients */}
      <div className="absolute w-[200%] h-[200%] -top-1/2 -left-1/2 animate-[spin_10s_ease-in-out_infinite_alternate] blur-[60px] opacity-60">
        <div className="absolute top-1/2 left-1/2 w-[60%] h-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-300 mixture-multiply opacity-70"></div>
        <div className="absolute top-[20%] left-[80%] w-[40%] h-[40%] rounded-full bg-emerald-200 mixture-multiply opacity-60"></div>
        <div className="absolute top-[80%] left-[20%] w-[50%] h-[50%] rounded-full bg-emerald-400 mixture-multiply opacity-50"></div>
      </div>

      {/* Glass Card */}
      <div 
        className="relative z-10 w-[160px] h-[160px] bg-white/30 backdrop-blur-[20px] rounded-[40px] border border-white/60 flex justify-center items-center shadow-[0_20px_40px_rgba(0,0,0,0.05)] animate-[bounce_4s_ease-in-out_infinite]"
        style={{ animationName: 'floatCard' }}
      >
        <Image 
          src="/icon.png" 
          alt="App Icon" 
          width={100} 
          height={100}
          className="rounded-[22px]"
        />
      </div>

      {/* Loading Dots */}
      <div className="absolute bottom-[60px] flex gap-2 z-10">
        {[0, 1, 2].map((i) => (
          <div 
            key={i}
            className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-[pulse_1.4s_ease-in-out_infinite_both]"
            style={{ animationDelay: `${-0.32 + (i * 0.16)}s` }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes floatCard {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>

      <Link href="/splash-preview" className="absolute top-10 right-4 px-4 py-2 bg-white/50 backdrop-blur-md rounded-full text-xs text-gray-600 z-50">
        Close
      </Link>
    </div>
  );
}
