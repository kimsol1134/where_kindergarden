import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Sparkles } from 'lucide-react';
import { PhoneFrame } from './PhoneFrame';

export function Hero() {
  return (
    <section className="relative safe-pt-hero overflow-hidden pb-20 lg:pb-32">
      {/* 수채화 워시 배경 — 2 blobs only */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute right-[-3.5rem] top-[-2.5rem] h-[220px] w-[280px] rounded-[40%_60%_55%_45%/55%_40%_60%_45%] bg-[radial-gradient(ellipse_at_30%_40%,rgba(78,169,109,0.18),rgba(78,169,109,0.06)_60%,transparent_80%)] blur-[50px]" />
        <div className="absolute left-[-3rem] top-[180px] h-[200px] w-[240px] rounded-[55%_45%_50%_50%/45%_55%_45%_55%] bg-[radial-gradient(ellipse_at_60%_50%,rgba(244,216,106,0.22),rgba(244,216,106,0.08)_55%,transparent_80%)] blur-[50px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="animate-fade-up delay-100">
              <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-[-0.05em] text-[var(--brand-ink)] md:text-6xl">
                우리 아이 첫 유치원,
                <br className="hidden md:block" />
                <span className="text-[var(--brand-leaf)]">가장 쉽고 똑똑하게</span>{' '}
                찾는 법
              </h1>
            </div>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--brand-ink-soft)] animate-fade-up delay-200">
              어떤 유치원이 우리 아이에게 맞을지, 어디가 가깝고 안전한지.
              고민만 하던 시간을 줄이고 확신을 가질 수 있도록 도와드립니다.
            </p>

            <div className="mt-8 flex flex-col gap-4 animate-fade-up delay-300 sm:flex-row">
              <Link
                href="/search?mode=location"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--brand-leaf)] px-8 py-4 text-lg font-semibold text-white shadow-[0_18px_36px_rgba(78,169,109,0.24)] transition-transform hover:-translate-y-0.5"
              >
                <MapPin className="h-5 w-5" />
                내 주변 유치원 찾기
              </Link>
              <Link
                href="/test"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(203,188,174,0.36)] bg-white/78 px-8 py-4 text-lg font-semibold text-[var(--brand-ink)] shadow-[0_16px_30px_rgba(133,138,103,0.12)] transition-transform hover:-translate-y-0.5"
              >
                <Sparkles className="h-5 w-5 text-[var(--brand-sun)]" />
                우리 아이 성향 테스트
              </Link>
            </div>
          </div>

          <div className="relative animate-fade-up delay-200">
            <PhoneFrame
              src="/images/screenshots/screenshot-search.webp"
              alt="우리동네 유치원 검색 화면 - 지도와 필터로 주변 유치원을 탐색하는 모습"
              priority
              className="lg:max-w-[300px]"
            />
            <div className="mt-6 flex justify-center">
              <Link
                href="https://apps.apple.com/us/app/%EC%9C%A0%EC%B9%98%EC%9B%90-%EC%95%8C%EB%A6%AC%EB%AF%B8-%EC%9A%B0%EB%A6%AC%EB%8F%99%EB%84%A4-%EC%9C%A0%EC%B9%98%EC%9B%90/id6758149645"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block transition-opacity hover:opacity-80"
              >
                <Image
                  src="/images/app-store-badge.svg"
                  alt="Download on the App Store"
                  width={140}
                  height={47}
                  className="h-[44px] w-auto"
                />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
