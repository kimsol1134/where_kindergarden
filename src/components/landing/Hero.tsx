import Image from 'next/image';
import Link from 'next/link';
import { MapPin, SearchCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { BrandMark } from '@/components/common/BrandMark';

export function Hero() {
  return (
    <section className="relative safe-pt-hero overflow-hidden pb-20 lg:pb-32">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,216,106,0.28),transparent_28%),radial-gradient(circle_at_80%_15%,rgba(78,169,109,0.16),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(246,245,239,0.74))]" />
        <div className="absolute left-[-4rem] top-24 h-72 w-72 rounded-full bg-[rgba(244,216,106,0.24)] blur-3xl" />
        <div className="absolute right-[-3rem] top-16 h-80 w-80 rounded-full bg-[rgba(78,169,109,0.18)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/72 px-4 py-2 text-sm font-semibold text-[var(--brand-leaf)] shadow-[0_14px_34px_rgba(123,132,100,0.12)] animate-fade-up">
              <SearchCheck className="h-4 w-4" />
              아이콘 기준 브랜드 리프레시 적용
            </div>

            <div className="mt-6 animate-fade-up delay-100">
              <BrandMark
                className="mb-6"
                labelClassName="text-2xl sm:text-3xl"
                iconClassName="h-14 w-14"
              />
              <h1 className="max-w-3xl text-4xl font-bold leading-[1.05] tracking-[-0.05em] text-[var(--brand-ink)] md:text-6xl">
                우리 아이 첫 유치원,
                <br className="hidden md:block" />
                <span className="text-[var(--brand-leaf)]">안심되는 탐색 경험</span>으로
                바꿉니다
              </h1>
            </div>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--brand-ink-soft)] animate-fade-up delay-200">
              현재 위치 기반으로 주변 유치원을 찾고, 비교하고, 후기까지 확인하는 흐름을
              반투명한 탐색 도구처럼 재구성했습니다. 웹은 같은 브랜드 시스템으로 정리하고,
              iPhone은 별도 SwiftUI 앱으로 확장합니다.
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

            <div className="mt-8 flex flex-wrap gap-3 animate-fade-up delay-300">
              <div className="brand-chip rounded-full px-4 py-2 text-sm text-[var(--brand-ink-soft)]">
                전국 7,950+ 기관 데이터
              </div>
              <div className="brand-chip rounded-full px-4 py-2 text-sm text-[var(--brand-ink-soft)]">
                위치 정보 비저장
              </div>
              <div className="brand-chip rounded-full px-4 py-2 text-sm text-[var(--brand-ink-soft)]">
                비교표 공유 지원
              </div>
            </div>
          </div>

          <div className="relative animate-fade-up delay-200">
            <div className="brand-shell relative overflow-hidden rounded-[2.25rem] p-5 sm:p-7">
              <div className="absolute left-[-3rem] top-[-2.5rem] h-44 w-44 rounded-full bg-[rgba(244,216,106,0.24)] blur-3xl" />
              <div className="absolute bottom-[-4rem] right-[-3rem] h-52 w-52 rounded-full bg-[rgba(78,169,109,0.22)] blur-3xl" />
              <div className="relative space-y-5">
                <div className="flex items-center justify-between rounded-[1.6rem] bg-white/72 px-5 py-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--brand-ink-soft)]">
                      New iPhone UX
                    </p>
                    <p className="text-lg font-semibold text-[var(--brand-ink)]">
                      전체 화면 지도 + 결과 시트
                    </p>
                  </div>
                  <ShieldCheck className="h-7 w-7 text-[var(--brand-leaf)]" />
                </div>
                <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="rounded-[2rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(246,245,239,0.96))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
                    <div className="relative mx-auto aspect-[4/5] max-w-[320px] overflow-hidden rounded-[2rem] border border-white/80 bg-[linear-gradient(180deg,rgba(246,245,239,0.96),rgba(255,255,255,0.78))] p-4 shadow-[0_22px_48px_rgba(133,140,104,0.16)]">
                      <div className="mb-4 rounded-full border border-white/90 bg-white/90 px-4 py-3 text-sm text-[var(--brand-ink-soft)]">
                        서울 강남구 역삼동
                      </div>
                      <div className="space-y-3">
                        <div className="brand-highlight rounded-[1.5rem] p-4">
                          <p className="text-sm font-semibold text-[var(--brand-ink)]">
                            반경 1km 안에 18개 기관
                          </p>
                          <p className="mt-1 text-xs text-[var(--brand-ink-soft)]">
                            전체 화면 지도 위로 하단 결과 카드가 올라옵니다.
                          </p>
                        </div>
                        <div className="brand-card rounded-[1.5rem] p-4">
                          <p className="text-sm font-semibold text-[var(--brand-ink)]">역삼유치원</p>
                          <p className="mt-1 text-xs text-[var(--brand-ink-soft)]">국공립 · 0.3km · 셔틀 1대</p>
                        </div>
                        <div className="brand-card rounded-[1.5rem] p-4">
                          <p className="text-sm font-semibold text-[var(--brand-ink)]">해맑은유치원</p>
                          <p className="mt-1 text-xs text-[var(--brand-ink-soft)]">사립 · 0.5km · 후기 12건</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    <div className="brand-card rounded-[2rem] p-5">
                      <Image
                        src="/app-icon-preview.png"
                        alt="우리동네 유치원 앱 아이콘"
                        width={180}
                        height={180}
                        className="mx-auto h-auto w-36 rounded-[2rem]"
                      />
                      <p className="mt-4 text-center text-sm leading-6 text-[var(--brand-ink-soft)]">
                        흰 무대, 초록 탐색 실루엣, 노란 아침빛, 돋보기 메타포를 UI 전체로 확장했습니다.
                      </p>
                    </div>
                    <div className="brand-card rounded-[2rem] p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-ink-soft)]">
                        App Store
                      </p>
                      <p className="mt-2 text-lg font-semibold text-[var(--brand-ink)]">
                        앱으로 더 편리하게 이용하세요
                      </p>
                      <Link
                        href="https://apps.apple.com/us/app/%EC%9C%A0%EC%B9%98%EC%9B%90-%EC%95%8C%EB%A6%AC%EB%AF%B8-%EC%9A%B0%EB%A6%AC%EB%8F%99%EB%84%A4-%EC%9C%A0%EC%B9%98%EC%9B%90/id6758149645"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-block"
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
              </div>
            </div>

            <p className="mt-6 text-sm text-[var(--brand-ink-soft)] animate-fade-up delay-400">
              * 위치 정보는 저장되지 않으며 검색 목적으로만 사용됩니다.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
