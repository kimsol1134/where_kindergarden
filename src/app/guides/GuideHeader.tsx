import Link from 'next/link';
import { BrandMark } from '@/components/common/BrandMark';

export function GuideHeader() {
  return (
    <header className="border-b border-[rgba(203,188,174,0.22)] bg-white/90">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" aria-label="우리동네 유치원 홈">
          <BrandMark compact />
        </Link>
        <nav className="flex items-center gap-3 text-sm font-semibold text-[var(--brand-ink-soft)]">
          <Link href="/guides/" className="hover:text-[var(--brand-leaf)]">
            선택 가이드
          </Link>
          <Link
            href="/search/?mode=location"
            className="rounded-full bg-[var(--brand-leaf)] px-4 py-2 text-white hover:bg-[var(--brand-leaf-deep)]"
          >
            주변 유치원 찾기
          </Link>
        </nav>
      </div>
    </header>
  );
}
