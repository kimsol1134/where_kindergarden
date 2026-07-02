'use client';

import { useState } from 'react';
import Link from 'next/link';
import Menu from 'lucide-react/dist/esm/icons/menu';
import X from 'lucide-react/dist/esm/icons/x';
import { BrandMark } from '@/components/common/BrandMark';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

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
            <Link href="/reviews" className="transition-colors hover:text-[var(--brand-leaf)]">
              후기 전체
            </Link>
            <Link href="#faq" className="transition-colors hover:text-[var(--brand-leaf)]">
              자주 묻는 질문
            </Link>
          </nav>
          <Link
            href="/search?mode=location"
            className="hidden rounded-full bg-[var(--brand-leaf)] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(78,169,109,0.22)] md:inline-flex"
          >
            유치원 찾기
          </Link>
          <button
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
            onClick={() => setMenuOpen((prev) => !prev)}
            className="p-2 text-[var(--brand-ink-soft)] md:hidden"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <div className="brand-card mt-2 rounded-2xl px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-1 text-sm font-medium text-[var(--brand-ink-soft)]">
              <Link
                href="#features"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-2 transition-colors hover:bg-[var(--brand-mist)] hover:text-[var(--brand-leaf)]"
              >
                서비스 소개
              </Link>
              <Link
                href="#preview"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-2 transition-colors hover:bg-[var(--brand-mist)] hover:text-[var(--brand-leaf)]"
              >
                미리보기
              </Link>
              <Link
                href="/reviews"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-2 transition-colors hover:bg-[var(--brand-mist)] hover:text-[var(--brand-leaf)]"
              >
                후기 전체
              </Link>
              <Link
                href="#faq"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-2 transition-colors hover:bg-[var(--brand-mist)] hover:text-[var(--brand-leaf)]"
              >
                자주 묻는 질문
              </Link>
            </nav>
            <div className="mt-3 border-t border-[rgba(203,188,174,0.2)] pt-3">
              <Link
                href="/search?mode=location"
                onClick={() => setMenuOpen(false)}
                className="block w-full rounded-full bg-[var(--brand-leaf)] px-4 py-2.5 text-center text-sm font-semibold text-white shadow-[0_8px_20px_rgba(78,169,109,0.22)]"
              >
                유치원 찾기
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
