import Link from 'next/link';
import { Menu } from 'lucide-react';
import { BrandMark } from '@/components/common/BrandMark';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 safe-area-top">
      <div className="mx-auto max-w-7xl px-4 pt-3 sm:px-6 lg:px-8">
        <div className="brand-shell flex h-18 items-center justify-between rounded-[2rem] px-4 sm:px-6">
          <Link href="/" className="min-w-0">
            <BrandMark compact />
          </Link>
          <nav className="hidden gap-8 text-sm font-medium text-[var(--brand-ink-soft)] md:flex">
            <Link href="#features" className="transition-colors hover:text-[var(--brand-leaf)]">
              서비스 소개
            </Link>
            <Link href="#preview" className="transition-colors hover:text-[var(--brand-leaf)]">
              미리보기
            </Link>
            <Link href="#faq" className="transition-colors hover:text-[var(--brand-leaf)]">
              자주 묻는 질문
            </Link>
          </nav>
          <Link
            href="/search?mode=location"
            className="hidden rounded-full bg-[var(--brand-leaf)] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(78,169,109,0.22)] md:inline-flex"
          >
            바로 탐색
          </Link>
          <button className="p-2 text-[var(--brand-ink-soft)] md:hidden">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
