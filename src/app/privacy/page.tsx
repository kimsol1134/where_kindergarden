import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/landing/Footer';
import { KindergartenIcon } from '@/components/icons/KindergartenIcon';

export const metadata: Metadata = {
  title: '개인정보처리방침',
  description:
    '우리동네 유치원 서비스의 개인정보처리방침입니다. 위치 정보 수집 목적, 보유 기간, 이용자 권리 등을 안내합니다.',
  alternates: {
    canonical: '/privacy',
  },
  openGraph: {
    title: '개인정보처리방침 - 우리동네 유치원',
    description: '우리동네 유치원 서비스의 개인정보처리방침입니다.',
    url: '/privacy',
    type: 'website',
    locale: 'ko_KR',
  },
  twitter: {
    title: '개인정보처리방침 - 우리동네 유치원',
    description: '우리동네 유치원 서비스의 개인정보처리방침입니다.',
  },
};

export default function PrivacyPage() {
  return (
    <div className="bg-white min-h-screen font-sans">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="홈으로"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white">
                <KindergartenIcon className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900">
                우리동네 유치원
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="pt-24 pb-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            개인정보처리방침
          </h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 mb-8">
              우리동네 유치원(이하 &quot;서비스&quot;)은 이용자의 개인정보를
              중요시하며, 개인정보 보호법, 정보통신망 이용촉진 및 정보보호 등에
              관한 법률을 준수하고 있습니다.
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                1. 수집하는 개인정보 항목 및 방법
              </h2>
              <p className="text-gray-600 mb-4">
                서비스는 원활한 서비스 제공과 광고 게재를 위해 다음과 같은
                정보를 수집할 수 있습니다.
              </p>
              <h3 className="font-semibold text-gray-800 mb-2">
                가. 필수적 수집 항목 (앱 기능)
              </h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                <li>
                  <strong>위치 정보 (GPS 좌표)</strong>: 사용자 주변의 유치원을
                  검색하고 거리를 계산하기 위해 사용됩니다.
                  <br />※ 위치 정보는 사용자 기기 내에서만 처리되며, 서버로
                  전송되거나 저장되지 않습니다.
                </li>
              </ul>
              <h3 className="font-semibold text-gray-800 mb-2">
                나. 자동 수집 항목 (타사 광고 및 분석)
              </h3>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>
                  <strong>기기 식별자 (Device ID, Advertising ID)</strong>:
                  맞춤형 광고 제공 및 앱 이용 분석을 위해 타사(Google)에 의해
                  수집될 수 있습니다.
                </li>
                <li>
                  <strong>앱 이용 기록</strong>: 광고 노출, 클릭, 앱 내 상호작용
                  데이터가 수집될 수 있습니다.
                </li>
                <li>
                  <strong>쿠키(Cookie) 및 로컬 스토리지</strong>: 검색 설정 저장
                  등 편의 기능을 위해 사용됩니다.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                2. 개인정보의 수집 및 이용 목적
              </h2>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>
                  <strong>위치 기반 서비스 제공</strong>: 현재 위치 주변 유치원
                  탐색 및 거리순 정렬
                </li>
                <li>
                  <strong>광고 게재</strong>: Google AdMob을 통한 맞춤형 광고
                  제공 (개인 식별 불가한 형태)
                </li>
                <li>
                  <strong>서비스 개선</strong>: 앱 이용 통계 분석 및 버그 수정
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                3. 개인정보의 보유 및 이용 기간
              </h2>
              <p className="text-gray-600">
                원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당
                정보를 지체 없이 파기합니다.
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
                <li>
                  <strong>위치 정보</strong>: 앱 종료 또는 브라우저 세션 종료 시
                  즉시 파기 (서버 저장 안 함)
                </li>
                <li>
                  <strong>광고 식별자</strong>: Google의 광고 데이터 처리 방침에
                  따라 관리됨
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                4. 개인정보의 제3자 제공
              </h2>
              <p className="text-gray-600">
                서비스는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다.
                단, 맞춤형 광고 제공을 위해 아래와 같이 타사 서비스가 이용될 수
                있습니다.
              </p>
              <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="font-semibold text-gray-800">Google AdMob</p>
                <ul className="list-disc pl-6 text-gray-600 space-y-1 mt-2 text-sm">
                  <li>제공받는 자: Google LLC, Google Asia Pacific Pte. Ltd.</li>
                  <li>제공 목적: 맞춤형 광고 게재 및 광고 성과 분석</li>
                  <li>제공 항목: 기기 식별자(Advertising ID), 쿠키, 앱 이용 기록</li>
                  <li>
                    보유 및 이용 기간:
                    <a
                      href="https://policies.google.com/technologies/ads"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:underline ml-1"
                    >
                      Google 파트너의 데이터 사용 정책 참조
                    </a>
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                5. 이용자의 권리 및 행사 방법 (광고 철회)
              </h2>
              <p className="text-gray-600 mb-4">
                이용자는 언제든지 맞춤형 광고 수신을 거부할 수 있습니다.
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">
                    iOS (iPhone/iPad)
                  </h3>
                  <p className="text-gray-600 text-sm">
                    설정 &gt; 개인정보 보호 및 보안 &gt; 추적 &gt; &#39;앱이
                    추적을 요청하도록 허용&#39; 끄기 또는 본 앱 선택 해제
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 mb-1">Android</h3>
                  <p className="text-gray-600 text-sm">
                    설정 &gt; Google &gt; 광고 &gt; 광고 ID 삭제 또는
                    재설정
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                6. 문의처
              </h2>
              <p className="text-gray-600">
                개인정보 관련 문의사항은 아래로 연락해주시기 바랍니다.
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-2">
                <li>이메일: privacy@kindergarden.kr</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                7. 개인정보처리방침 변경
              </h2>
              <p className="text-gray-600">
                이 개인정보처리방침은 2026년 1월 27일부터 적용됩니다.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                공고일자: 2026년 1월 27일<br />
                시행일자: 2026년 1월 27일
              </p>
            </section>

            <p className="text-gray-500 text-sm mt-12">
              시행일: 2026년 1월 22일
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
