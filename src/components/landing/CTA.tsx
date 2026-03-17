import Link from 'next/link';
import { Search } from 'lucide-react';

export function CTA() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <div className="brand-shell rounded-[2.5rem] px-8 py-12">
          <h2 className="mb-6 text-3xl font-bold tracking-[-0.04em] text-[var(--brand-ink)]">
            지금 바로 우리 아이 유치원을 찾아보세요
          </h2>
          <p className="mb-10 text-[var(--brand-ink-soft)]">
            로그인 없이 바로 시작할 수 있고, iPhone 네이티브 앱 경험도 함께 준비 중입니다.
          </p>
          <Link
            href="/search?mode=location"
            className="mx-auto flex w-fit items-center justify-center gap-2 rounded-full bg-[var(--brand-leaf)] px-8 py-4 text-lg font-bold text-white shadow-[0_18px_36px_rgba(78,169,109,0.24)] transition-all hover:-translate-y-1"
          >
            <Search className="h-5 w-5" />
            무료로 시작하기
          </Link>
        </div>
      </div>
    </section>
  );
}
