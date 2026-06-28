import Link from 'next/link';
import type { Metadata } from 'next';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import { BrandMark } from '@/components/common/BrandMark';
import { Footer } from '@/components/landing/Footer';

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
    <div className="min-h-screen font-sans">
      <header className="fixed top-0 z-50 w-full px-4 pt-3 safe-area-top">
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

      <main className="pt-24 pb-[calc(4rem+var(--total-bottom-offset,0px))]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-[var(--brand-ink)] mb-8">
            개인정보처리방침
          </h1>

          <div className="prose prose-gray max-w-none">
            <p className="text-[var(--brand-ink-soft)] mb-8">
              우리동네 유치원(이하 &quot;서비스&quot;)은 이용자의 개인정보를
              중요시하며, 개인정보 보호법, 정보통신망 이용촉진 및 정보보호 등에
              관한 법률을 준수하고 있습니다.
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-[var(--brand-ink)] mb-4">
                1. 수집하는 개인정보 항목 및 방법
              </h2>
              <p className="text-[var(--brand-ink-soft)] mb-4">
                서비스는 원활한 서비스 제공과 품질 개선을 위해 다음과 같은 정보를
                수집할 수 있습니다.
              </p>
              <h3 className="font-semibold text-[var(--brand-ink)] mb-2">
                가. 필수적 수집 항목 (앱 기능)
              </h3>
              <ul className="list-disc pl-6 text-[var(--brand-ink-soft)] space-y-2 mb-4">
                <li>
                  <strong>위치 정보 (GPS 좌표)</strong>: 사용자 주변의 유치원을
                  검색하고 거리를 계산하기 위해 사용됩니다.
                  <br />※ 위치 정보는 사용자 기기 내에서만 처리되며, 서버로
                  전송되거나 저장되지 않습니다.
                </li>
              </ul>
              <h3 className="font-semibold text-[var(--brand-ink)] mb-2">
                나. 자동 수집 항목 (분석)
              </h3>
              <ul className="list-disc pl-6 text-[var(--brand-ink-soft)] space-y-2">
                <li>
                  <strong>익명 기기 식별자</strong>: 앱 이용 분석과 오류 개선을
                  위해 개인을 식별할 수 없는 형태로 수집될 수 있습니다.
                </li>
                <li>
                  <strong>앱 이용 기록</strong>: 검색, 비교, 공유 등 앱 내
                  상호작용 데이터가 수집될 수 있습니다.
                </li>
                <li>
                  <strong>쿠키(Cookie) 및 로컬 스토리지</strong>: 검색 설정 저장
                  등 편의 기능을 위해 사용됩니다.
                </li>
              </ul>
              <h3 className="font-semibold text-[var(--brand-ink)] mb-2 mt-6">
                다. 분석 서비스 (Mixpanel)
              </h3>
              <div className="bg-[var(--brand-mist)] p-4 rounded-2xl border border-[rgba(203,188,174,0.12)]">
                <ul className="list-disc pl-6 text-[var(--brand-ink-soft)] space-y-2 text-sm">
                  <li>
                    <strong>수집 항목</strong>: 앱 사용 행동 데이터(화면 이동,
                    검색, 비교 기능 사용 등), 기기 정보(iOS 버전, 앱 버전, 기기
                    모델), 익명 식별자(IDFV — 앱 재설치 시 갱신되는 기기 고유 ID)
                  </li>
                  <li>
                    <strong>수집 목적</strong>: 앱 사용성 개선 및 서비스 품질 향상
                  </li>
                  <li>
                    <strong>보존 기간</strong>: 5년
                  </li>
                  <li>
                    <strong>제3자 제공</strong>: Mixpanel Inc. (미국) —
                    <a
                      href="https://mixpanel.com/legal/privacy-policy/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--brand-leaf)] hover:underline ml-1"
                    >
                      Mixpanel 개인정보처리방침
                    </a>
                  </li>
                  <li>
                    <strong>개인 식별 불가</strong>: 수집되는 식별자(IDFV)는
                    실명/연락처와 연결되지 않습니다.
                  </li>
                </ul>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-[var(--brand-ink)] mb-4">
                2. 개인정보의 수집 및 이용 목적
              </h2>
              <ul className="list-disc pl-6 text-[var(--brand-ink-soft)] space-y-2">
                <li>
                  <strong>위치 기반 서비스 제공</strong>: 현재 위치 주변 유치원
                  탐색 및 거리순 정렬
                </li>
                <li>
                  <strong>서비스 개선</strong>: 앱 이용 통계 분석 및 버그 수정
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-[var(--brand-ink)] mb-4">
                3. 개인정보의 보유 및 이용 기간
              </h2>
              <p className="text-[var(--brand-ink-soft)]">
                원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당
                정보를 지체 없이 파기합니다.
              </p>
              <ul className="list-disc pl-6 text-[var(--brand-ink-soft)] space-y-2 mt-2">
                <li>
                  <strong>위치 정보</strong>: 앱 종료 시 즉시 파기 (서버 저장 안 함)
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-[var(--brand-ink)] mb-4">
                4. 개인정보의 제3자 제공
              </h2>
              <p className="text-[var(--brand-ink-soft)]">
                서비스는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다.
                서비스 개선을 위한 통계 분석은 개인을 식별할 수 없는 형태로
                처리됩니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-[var(--brand-ink)] mb-4">
                5. 이용자의 권리 및 행사 방법
              </h2>
              <p className="text-[var(--brand-ink-soft)] mb-4">
                이용자는 언제든지 위치 권한을 철회할 수 있습니다.
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-[var(--brand-ink)] mb-1">
                    iOS (iPhone/iPad)
                  </h3>
                  <p className="text-[var(--brand-ink-soft)] text-sm">
                    설정 &gt; 개인정보 보호 및 보안 &gt; 위치 서비스에서 본 앱의
                    위치 접근 권한 변경
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--brand-ink)] mb-1">Android</h3>
                  <p className="text-[var(--brand-ink-soft)] text-sm">
                    설정 &gt; 앱 &gt; 우리동네 유치원 &gt; 권한에서 위치 접근
                    권한 변경
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-[var(--brand-ink)] mb-4">
                6. 문의처
              </h2>
              <p className="text-[var(--brand-ink-soft)]">
                개인정보 관련 문의사항은 아래로 연락해주시기 바랍니다.
              </p>
              <ul className="list-disc pl-6 text-[var(--brand-ink-soft)] space-y-2 mt-2">
                <li>이메일: privacy@kindergarden.kr</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold text-[var(--brand-ink)] mb-4">
                7. 개인정보처리방침 변경
              </h2>
              <p className="text-[var(--brand-ink-soft)]">
                이 개인정보처리방침은 2026년 1월 27일부터 적용됩니다.
              </p>
              <p className="text-[var(--brand-ink-soft)] text-sm mt-2">
                공고일자: 2026년 1월 27일<br />
                시행일자: 2026년 1월 27일
              </p>
            </section>

            <p className="text-[var(--brand-ink-soft)] text-sm mt-12">
              시행일: 2026년 1월 27일
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
