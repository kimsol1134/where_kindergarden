import Link from 'next/link';
import { Search } from 'lucide-react';

export function CTA() {
  return (
    <section className="py-20 bg-emerald-50">
      <div className="max-w-4xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">지금 바로 우리 아이 유치원을 찾아보세요</h2>
        <p className="text-gray-600 mb-10">로그인 없이 바로 시작할 수 있습니다.</p>
        <Link 
          href="/search?mode=location"
          className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-lg shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 mx-auto transform hover:-translate-y-1 w-fit"
        >
          <Search className="w-5 h-5" />
          무료로 시작하기
        </Link>
      </div>
    </section>
  );
}
