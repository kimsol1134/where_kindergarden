import Link from 'next/link';
import Image from 'next/image';
import { Search, Sparkles } from 'lucide-react';

export function CTA() {
  return (
    <section className="py-20 bg-emerald-50">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">지금 바로 우리 아이 유치원을 찾아보세요</h2>
        <p className="text-gray-600 mb-10">로그인 없이 바로 시작할 수 있습니다.</p>
        <div className="flex flex-col items-center gap-4">
          <Link 
            href="/search?mode=location"
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-lg shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 mx-auto transform hover:-translate-y-1 w-fit"
          >
            <Search className="w-5 h-5" />
            무료로 시작하기
          </Link>
          <Link
            href="/test"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            <Sparkles className="h-4 w-4" />
            먼저 우리 아이 성향 테스트 보기
          </Link>
          <Link 
            href="https://apps.apple.com/us/app/%EC%9C%A0%EC%B9%98%EC%9B%90-%EC%95%8C%EB%A6%AC%EB%AF%B8-%EC%9A%B0%EB%A6%AC%EB%8F%99%EB%84%A4-%EC%9C%A0%EC%B9%98%EC%9B%90/id6758149645"
            target="_blank"
            rel="noopener noreferrer"
            className="pt-2 hover:opacity-80 transition-opacity"
          >
            <Image
              src="/images/app-store-badge.svg"
              alt="Download on the App Store"
              width={140}
              height={46}
              className="h-[46px] w-auto"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
