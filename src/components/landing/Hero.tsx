import Image from 'next/image';
import Link from 'next/link';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { PhoneFrame } from './PhoneFrame';

const APP_STORE_URL =
  'https://apps.apple.com/us/app/%EC%9C%A0%EC%B9%98%EC%9B%90-%EC%95%8C%EB%A6%AC%EB%AF%B8-%EC%9A%B0%EB%A6%AC%EB%8F%99%EB%84%A4-%EC%9C%A0%EC%B9%98%EC%9B%90/id6758149645';

export function Hero() {
  return (
    <section className="relative safe-pt-hero overflow-hidden pb-16 lg:pb-32">
      {/* 수채화 워시 배경 */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute right-[-3.5rem] top-[-2.5rem] h-[220px] w-[280px] rounded-[40%_60%_55%_45%/55%_40%_60%_45%] bg-[radial-gradient(ellipse_at_30%_40%,rgba(78,169,109,0.18),rgba(78,169,109,0.06)_60%,transparent_80%)] blur-[50px]" />
        <div className="absolute left-[-3rem] top-[180px] h-[200px] w-[240px] rounded-[55%_45%_50%_50%/45%_55%_45%_55%] bg-[radial-gradient(ellipse_at_60%_50%,rgba(244,216,106,0.22),rgba(244,216,106,0.08)_55%,transparent_80%)] blur-[50px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          {/* 텍스트 영역 */}
          <div>
            <div className="animate-fade-up delay-100">
              <h1 className="text-[2.25rem] font-bold leading-[1.1] tracking-[-0.04em] text-[var(--brand-ink)] sm:text-5xl md:text-6xl">
                내 주변 유치원 찾기,
                <br />
                <span className="text-[var(--brand-leaf)]">지도에서 거리순으로</span>{' '}
                비교
              </h1>
            </div>

            <p className="mt-5 max-w-xl text-base leading-7 text-[var(--brand-ink-soft)] animate-fade-up delay-200 sm:text-lg sm:leading-8">
              현재 위치나 주소를 기준으로 가까운 유치원을 찾고, 정원,
              셔틀버스, 방과후, 급식 정보를 부모가 보는 순서대로 확인하세요.
            </p>

            <div className="mt-7 flex flex-col gap-3 animate-fade-up delay-300 sm:flex-row sm:gap-4">
              <Link
                href="/search?mode=location"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--brand-leaf)] px-7 py-3.5 text-base font-semibold text-white shadow-[0_14px_28px_rgba(78,169,109,0.24)] transition-transform hover:-translate-y-0.5 sm:px-8 sm:py-4 sm:text-lg"
              >
                <MapPin className="h-5 w-5" />
                내 주변 유치원 찾기
              </Link>
              <Link
                href="/test"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(203,188,174,0.36)] bg-white/78 px-7 py-3.5 text-base font-semibold text-[var(--brand-ink)] shadow-[0_12px_24px_rgba(133,138,103,0.08)] transition-transform hover:-translate-y-0.5 sm:px-8 sm:py-4 sm:text-lg"
              >
                <Sparkles className="h-5 w-5 text-[var(--brand-sun)]" />
                우리 아이 성향 테스트
              </Link>
            </div>

            {/* 모바일: App Store 배지를 CTA 바로 아래에 */}
            <div className="mt-6 animate-fade-up delay-300 lg:hidden">
              <Link
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-full items-center gap-3 rounded-2xl border border-[rgba(203,188,174,0.24)] bg-white/72 px-4 py-3 shadow-[0_8px_20px_rgba(129,136,97,0.06)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(129,136,97,0.12)]"
              >
                <Image
                  src="/icon.png"
                  alt="우리동네 유치원 앱 아이콘"
                  width={40}
                  height={40}
                  className="h-10 w-10 shrink-0 rounded-xl"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--brand-ink)]">우리동네 유치원</p>
                  <p className="text-xs text-[var(--brand-ink-soft)]">App Store 무료 다운로드</p>
                </div>
                <Image
                  src="/images/app-store-badge.svg"
                  alt="Download on the App Store"
                  width={120}
                  height={40}
                  className="h-[36px] w-auto shrink-0"
                />
              </Link>
            </div>
          </div>

          {/* 데스크톱: 폰 프레임 + 배지 */}
          <div className="relative hidden animate-fade-up delay-200 lg:block">
            <PhoneFrame
              src="/images/screenshots/screenshot-search.webp"
              alt="우리동네 유치원 검색 화면 - 지도와 필터로 주변 유치원을 탐색하는 모습"
              priority
              className="lg:max-w-[300px]"
            />
            <div className="mt-6 flex justify-center">
              <Link
                href={APP_STORE_URL}
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
