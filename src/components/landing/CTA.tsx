import Link from 'next/link';
import Image from 'next/image';
import Search from 'lucide-react/dist/esm/icons/search';

export function CTA() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <div className="brand-shell rounded-[2.5rem] px-8 py-12">
          <h2 className="mb-6 text-3xl font-bold tracking-[-0.04em] text-[var(--brand-ink)]">
            고민만 하기엔, 입학 시즌이 너무 빨라요
          </h2>
          <p className="mb-10 text-[var(--brand-ink-soft)]">
            가입도, 로그인도 필요 없어요. 지금 바로 우리 동네 유치원을 확인해보세요.
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/search?mode=location"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--brand-leaf)] px-8 py-4 text-lg font-bold text-white shadow-[0_18px_36px_rgba(78,169,109,0.24)] transition-all hover:-translate-y-1"
            >
              <Search className="h-5 w-5" />
              웹에서 바로 탐색하기
            </Link>
            <Link
              href="https://apps.apple.com/us/app/%EC%9C%A0%EC%B9%98%EC%9B%90-%EC%95%8C%EB%A6%AC%EB%AF%B8-%EC%9A%B0%EB%A6%AC%EB%8F%99%EB%84%A4-%EC%9C%A0%EC%B9%98%EC%9B%90/id6758149645"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block transition-opacity hover:opacity-80"
            >
              <Image
                src="/images/app-store-badge.svg"
                alt="Download on the App Store"
                width={160}
                height={53}
                className="h-[52px] w-auto"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
