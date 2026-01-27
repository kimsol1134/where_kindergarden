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
              중요시하며, 개인정보 보호법을 준수하고 있습니다.
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                1. 수집하는 개인정보
              </h2>
              <p className="text-gray-600 mb-4">
                서비스는 다음과 같은 정보를 수집합니다:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>
                  <strong>위치 정보 (GPS 좌표)</strong>: 현재 위치 기반 유치원
                  검색을 위해 사용됩니다.
                </li>
                <li>
                  <strong>기기 식별자 (Device ID/Advertising ID)</strong>:
                  앱 이용 분석 및 개인 맞춤형 광고 제공을 위해 수집될 수
                  있습니다.
                </li>
                <li>
                  <strong>앱 이용 및 광고 상호작용 정보</strong>: 광고 노출 및
                  클릭, 앱 내 활동 정보 등이 분석 목적으로 수집될 수 있습니다.
              </ul>
              <p className="text-gray-600 mt-4 bg-emerald-50 p-4 rounded-lg">
                <strong>중요:</strong> 위치 정보는 서버에 저장되지 않으며,
                클라이언트(사용자 기기)에서만 일시적으로 사용됩니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                2. 개인정보 수집 목적
              </h2>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>주변 유치원 검색 서비스 제공</li>
                <li>거리 기반 검색 결과 정렬</li>
                <li>반경 필터(1km, 2km, 5km) 적용</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                3. 개인정보 보유 기간
              </h2>
              <p className="text-gray-600">
                수집된 위치 정보는 브라우저 세션 종료 시 자동으로 삭제됩니다.
                서버에 별도로 저장되지 않습니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                4. 개인정보 제3자 제공
              </h2>
              <p className="text-gray-600">
                서비스는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지
                않으나, 다음의 경우에는 예외로 합니다:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-4">
                <li>
                  <strong>Google AdMob</strong>: 광고 게재 및 성과 분석을 위해
                  기기 식별자(Advertising ID) 및 이용 기록이 Google에 제공될 수
                  있습니다.
                  <a
                    href="https://policies.google.com/technologies/ads"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline ml-1"
                  >
                    (Google 광고 정책 확인)
                  </a>
                </li>
              </ul>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                5. 유치원 데이터 출처
              </h2>
              <p className="text-gray-600 mb-4">
                서비스에서 제공하는 유치원 정보는 다음 출처에서
                수집됩니다:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>
                  <strong>유치원 알리미</strong> (교육부 운영 공공데이터)
                </li>
                <li>e-childschoolinfo.moe.go.kr</li>
              </ul>
              <p className="text-gray-600 mt-4">
                데이터는 정기적으로 업데이트되며, 실제 현황과 다를 수 있습니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                6. 쿠키 사용
              </h2>
              <p className="text-gray-600">
                서비스는 비교 목록 저장을 위해 브라우저의 로컬 스토리지를
                사용합니다. 이는 이용자의 편의를 위한 것이며, 개인을 식별하는
                정보는 저장되지 않습니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                7. 이용자의 권리
              </h2>
              <ul className="list-disc pl-6 text-gray-600 space-y-2">
                <li>위치 정보 수집 동의 철회 (브라우저 설정에서 변경 가능)</li>
                <li>브라우저 캐시 및 로컬 스토리지 삭제</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                8. 문의처
              </h2>
              <p className="text-gray-600">
                개인정보 관련 문의사항이 있으시면 아래로 연락해주세요:
              </p>
              <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-4">
                <li>이메일: privacy@kindergarden.kr</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                9. 개인정보처리방침 변경
              </h2>
              <p className="text-gray-600">
                본 개인정보처리방침은 법령 및 서비스 변경에 따라 수정될 수
                있습니다. 변경 시 서비스 내 공지를 통해 안내드립니다.
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
