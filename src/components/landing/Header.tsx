import Link from 'next/link';
import { School, Menu } from 'lucide-react';

export function Header() {
  return (
    <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
            <School className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">우리동네 유치원</span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600">
          <Link href="#features" className="hover:text-emerald-600 transition-colors">서비스 소개</Link>
          <Link href="#preview" className="hover:text-emerald-600 transition-colors">미리보기</Link>
          <Link href="#reviews" className="hover:text-emerald-600 transition-colors">후기</Link>
        </nav>
        <button className="md:hidden p-2 text-gray-600">
          <Menu className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
