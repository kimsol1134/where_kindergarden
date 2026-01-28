import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Sparkles } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative safe-pt-hero pb-20 lg:pb-32 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 to-white"></div>
        <Image
          src="https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=2000&q=80"
          alt="행복한 유치원"
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-5 md:opacity-10 mix-blend-multiply"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold mb-6 animate-fade-up">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          학부모 98%가 만족한 서비스
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 mb-6 leading-tight animate-fade-up delay-100">
          우리 아이 첫 유치원,<br className="hidden md:block" />
          <span className="text-emerald-500">가장 쉽고 똑똑하게</span> 찾는 법
        </h1>
        
        <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto animate-fade-up delay-200">
          위치 기반으로 주변 유치원을 검색하고,<br className="hidden md:block" /> 
          시설부터 교육 프로그램까지 한눈에 비교하세요.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-up delay-300 w-full max-w-md mx-auto sm:max-w-none">
          <Link
            href="/search?mode=location"
            className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 group"
          >
            <MapPin className="w-5 h-5 group-hover:scale-110 transition-transform" />
            내 주변 유치원 찾기
          </Link>

          <Link
            href="/test"
            className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-emerald-50 text-emerald-600 border-2 border-emerald-500 rounded-xl font-bold text-lg shadow-md transition-all flex items-center justify-center gap-2 group"
          >
            <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
            우리 아이 성향 테스트
          </Link>
        </div>
        
        <p className="mt-4 text-sm text-gray-500 animate-fade-up delay-300">
          * 위치 정보는 저장되지 않으며 검색 목적으로만 사용됩니다.
        </p>
      </div>
    </section>
  );
}
