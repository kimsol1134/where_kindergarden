'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import BarChart3 from 'lucide-react/dist/esm/icons/bar-chart-3';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Database from 'lucide-react/dist/esm/icons/database';
import Filter from 'lucide-react/dist/esm/icons/filter';
import HelpCircle from 'lucide-react/dist/esm/icons/help-circle';
import Mail from 'lucide-react/dist/esm/icons/mail';
import MapPin from 'lucide-react/dist/esm/icons/map-pin';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Shield from 'lucide-react/dist/esm/icons/shield';
import Star from 'lucide-react/dist/esm/icons/star';
import { isNative } from '@/lib/utils/platform';
import { BrandMark } from '@/components/common/BrandMark';
import { Footer } from '@/components/landing/Footer';

const APP_VERSION = '2.0.0';

const features = [
  {
    icon: MapPin,
    title: 'GPS 위치 검색',
    description: '현재 위치 또는 주소 검색으로 주변 유치원을 찾아보세요.',
  },
  {
    icon: Filter,
    title: '반경 필터',
    description: '1km, 2km, 5km 반경 내 기관만 골라서 확인할 수 있습니다.',
  },
  {
    icon: BarChart3,
    title: '비교표 생성',
    description: '최대 3개 기관을 선택하여 한눈에 비교해보세요.',
  },
  {
    icon: Share2,
    title: '간편 공유',
    description: '비교 결과를 카카오톡이나 링크로 가족과 공유하세요.',
  },
];

const nativeMenuItems = [
  {
    icon: Mail,
    label: '문의하기',
    href: 'mailto:privacy@kindergarden.kr',
    external: true,
  },
  {
    icon: Shield,
    label: '개인정보처리방침',
    href: '/privacy',
    external: false,
  },
  {
    icon: HelpCircle,
    label: '자주 묻는 질문',
    href: '/#faq',
    external: false,
  },
  {
    icon: Star,
    label: '앱스토어에서 보기',
    href: 'https://apps.apple.com/app/id6745186892',
    external: true,
  },
];

export default function AboutPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (mounted && isNative()) {
    return (
      <div className="min-h-screen bg-[var(--brand-page)] font-sans">
        <header className="safe-area-top sticky top-0 z-50 border-b border-[rgba(203,188,174,0.2)] bg-white/80 backdrop-blur-xl">
          <div className="flex h-14 items-center gap-3 px-4">
            <Link
              href="/"
              className="rounded-full bg-white/80 p-2 transition-colors active:bg-white"
              aria-label="홈으로"
            >
              <ArrowLeft className="h-5 w-5 text-[var(--brand-ink)]" />
            </Link>
            <h1 className="text-base font-semibold text-[var(--brand-ink)]">더보기</h1>
          </div>
        </header>

        <main className="mx-auto max-w-lg px-4 py-6">
          <div className="overflow-hidden rounded-2xl border border-[rgba(203,188,174,0.2)] bg-white shadow-sm">
            {nativeMenuItems.map((item, index) => {
              const Icon = item.icon;
              const isLast = index === nativeMenuItems.length - 1;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className={`flex min-h-[56px] items-center gap-3 px-4 py-3 transition-colors active:bg-[var(--brand-mist)]${isLast ? '' : ' border-b border-[rgba(203,188,174,0.15)]'}`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(78,169,109,0.1)]">
                    <Icon className="h-4 w-4 text-[var(--brand-leaf)]" />
                  </div>
                  <span className="flex-1 text-[15px] font-medium text-[var(--brand-ink)]">
                    {item.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-[var(--brand-ink-soft)]/60" />
                </Link>
              );
            })}
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-[rgba(203,188,174,0.2)] bg-white shadow-sm">
            <div className="flex min-h-[56px] items-center gap-3 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[rgba(203,188,174,0.15)]">
                <MapPin className="h-4 w-4 text-[var(--brand-ink-soft)]" />
              </div>
              <span className="flex-1 text-[15px] font-medium text-[var(--brand-ink)]">
                앱 버전
              </span>
              <span className="text-sm text-[var(--brand-ink-soft)]">{APP_VERSION}</span>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans">
      <header className="safe-area-top fixed top-0 z-50 w-full px-4 pt-3">
        <div className="brand-shell mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="rounded-full bg-white/80 p-2 transition-colors hover:bg-white"
              aria-label="홈으로"
            >
              <ArrowLeft className="h-5 w-5 text-[var(--brand-ink)]" />
            </Link>
            <Link href="/">
              <BrandMark compact labelClassName="text-lg" />
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-b from-[rgba(244,216,106,0.12)] to-transparent pb-16 pt-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="mb-6 text-4xl font-bold text-[var(--brand-ink)] md:text-5xl">
            우리 아이에게 맞는
            <br />
            <span className="text-[var(--brand-leaf)]">유치원을 쉽게 찾아보세요</span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-[var(--brand-ink-soft)]">
            복잡한 검색 없이 내 위치 기반으로 주변 유치원을 한눈에 비교하고,
            가족과 함께 고민해보세요.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-leaf)] px-8 py-4 text-lg font-bold text-white shadow-[0_18px_36px_rgba(78,169,109,0.24)] transition-colors hover:bg-[var(--brand-leaf-deep)]"
          >
            지금 검색하기
            <MapPin className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[var(--brand-ink)] text-center mb-12">
            주요 기능
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white p-6 rounded-[1.75rem] border border-[rgba(203,188,174,0.12)] shadow-[0_8px_20px_rgba(129,136,97,0.06)] hover:shadow-[0_12px_28px_rgba(129,136,97,0.08)] transition-shadow"
              >
                <div className="w-12 h-12 bg-[rgba(78,169,109,0.1)] rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-[var(--brand-leaf)]" />
                </div>
                <h3 className="text-lg font-bold text-[var(--brand-ink)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-[var(--brand-ink-soft)]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[var(--brand-mist)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-[var(--brand-ink)] text-center mb-12">
            신뢰할 수 있는 데이터
          </h2>
          <div className="bg-white p-8 rounded-2xl border border-[rgba(203,188,174,0.12)] shadow-[0_8px_20px_rgba(129,136,97,0.06)]">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[rgba(78,169,109,0.12)] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Database className="w-6 h-6 text-[var(--brand-leaf)]" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--brand-ink)] mb-2">데이터 출처</h3>
                  <p className="text-sm text-[var(--brand-ink-soft)]">
                    교육부에서 운영하는{' '}
                    <a
                      href="https://e-childschoolinfo.moe.go.kr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--brand-leaf)] font-bold hover:underline"
                    >
                      유치원 알리미
                    </a>{' '}
                    공공데이터를 활용합니다. 정확하고 공식적인 정보를 제공합니다.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[rgba(244,216,106,0.14)] rounded-lg flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-6 h-6 text-[var(--brand-ink)]" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--brand-ink)] mb-2">업데이트 주기</h3>
                  <p className="text-sm text-[var(--brand-ink-soft)]">
                    데이터는 <strong>학기별</strong>로 정기 업데이트되어 최신
                    정보를 반영합니다.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-[var(--brand-ink-soft)] mt-6 pt-6 border-t border-[rgba(203,188,174,0.12)]">
              본 서비스는 교육부{' '}
              <a
                href="https://e-childschoolinfo.moe.go.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--brand-ink-soft)] hover:underline"
              >
                유치원 알리미
              </a>
              의 공공데이터를 활용하며, 출처 표시 시 영리 목적을 포함한 자유
              이용이 가능합니다. 제공되는 정보는 공시 데이터 기준이며, 실제
              현황과 다를 수 있습니다. 정확한 정보는 해당 기관에 직접
              문의해주세요.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-[var(--brand-ink)] mb-4">
            지금 바로 시작해보세요
          </h2>
          <p className="text-[var(--brand-ink-soft)] mb-8">
            별도의 회원가입 없이 바로 검색할 수 있습니다.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[var(--brand-leaf)] hover:bg-[var(--brand-leaf-deep)] text-white px-8 py-4 rounded-full font-bold shadow-lg shadow-[rgba(78,169,109,0.2)] transition-colors"
          >
            유치원 검색하기
            <MapPin className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
