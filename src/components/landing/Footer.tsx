'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BrandMark } from '@/components/common/BrandMark';
import { DATA_VERSION } from '@/lib/constants';

export function Footer() {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    import('@/lib/utils/platform').then(({ isNative: checkNative }) => {
      setIsNative(checkNative());
    });
  }, []);

  return (
    <footer className="border-t border-white/70 bg-[rgba(31,36,29,0.95)] py-12 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="col-span-1 md:col-span-2">
            <BrandMark className="mb-4" labelClassName="text-white" compact />
            <p className="mb-6 max-w-xs text-sm leading-relaxed text-gray-300">
              학부모님들의 현명한 선택을 돕기 위해 만든
              <br />
              위치 기반 유치원 비교 서비스입니다.
            </p>
            {!isNative ? (
              <Link
                href="https://apps.apple.com/us/app/%EC%9C%A0%EC%B9%98%EC%9B%90-%EC%95%8C%EB%A6%AC%EB%AF%B8-%EC%9A%B0%EB%A6%AC%EB%8F%99%EB%84%A4-%EC%9C%A0%EC%B9%98%EC%9B%90/id6758149645"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block transition-opacity hover:opacity-80"
              >
                <Image
                  src="/images/app-store-badge.svg"
                  alt="Download on the App Store"
                  width={120}
                  height={40}
                  className="h-[40px] w-auto"
                />
              </Link>
            ) : null}
          </div>
          <div>
            <h4 className="mb-4 font-bold text-white">서비스</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/search" className="hover:text-[var(--brand-sun)]">
                  유치원 찾기
                </Link>
              </li>
              <li>
                <Link href="/compare" className="hover:text-[var(--brand-sun)]">
                  비교하기
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="hover:text-[var(--brand-sun)]">
                  이용 가이드
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-4 font-bold text-white">문의</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/#faq" className="hover:text-[var(--brand-sun)]">
                  자주 묻는 질문
                </Link>
              </li>
              <li>
                <Link href="mailto:kimsol1134@naver.com" className="hover:text-[var(--brand-sun)]">
                  제휴 문의
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[var(--brand-sun)]">
                  개인정보처리방침
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-800 pt-8">
          <div className="mb-6 flex items-start gap-3">
            <Image
              src="/images/kogl_type1.jpg"
              alt="공공누리 제1유형"
              width={80}
              height={40}
              className="h-auto w-16"
            />
            <p className="text-[10px] leading-relaxed text-gray-500">
              본 저작물은 &apos;교육부&apos;에서 &apos;2026년&apos; 작성하여 공공누리 제1유형으로 개방한
              &apos;전국유치원표준데이터&apos;를 이용하였으며, 해당 저작물은{' '}
              <a
                href="https://e-childschoolinfo.moe.go.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-gray-300"
              >
                유치원 알리미
              </a>
              에서 무료로 다운받으실 수 있습니다.
            </p>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 text-xs md:flex-row">
            <div className="flex flex-col items-center gap-2 md:flex-row md:gap-4">
              <p>
                &copy; 2026{' '}
                <a
                  href="https://litt.ly/solkim"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-white"
                >
                  solkim
                </a>
                . All rights reserved.
              </p>
              <p className="text-gray-500">데이터 기준: {DATA_VERSION.label}</p>
              <p className="text-gray-500">
                데이터 출처:{' '}
                <a
                  href="https://e-childschoolinfo.moe.go.kr"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-[var(--brand-sun)]"
                >
                  유치원 알리미
                </a>
                (교육부)
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
