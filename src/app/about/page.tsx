import Link from 'next/link';
import type { Metadata } from 'next';
import {
  ArrowLeft,
  MapPin,
  Filter,
  BarChart3,
  Share2,
  Database,
  RefreshCw,
} from 'lucide-react';
import { Footer } from '@/components/landing/Footer';
import { KindergartenIcon } from '@/components/icons/KindergartenIcon';

export const metadata: Metadata = {
  title: '서비스 소개 - 우리동네 유치원',
  description:
    '우리동네 유치원은 위치 기반으로 주변 유치원을 검색하고 비교할 수 있는 서비스입니다.',
};

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

export default function AboutPage() {
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

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-gradient-to-b from-emerald-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            우리 아이에게 맞는
            <br />
            <span className="text-emerald-500">유치원을 쉽게 찾아보세요</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            복잡한 검색 없이 내 위치 기반으로 주변 유치원을 한눈에 비교하고,
            가족과 함께 고민해보세요.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-100 transition-colors"
          >
            지금 검색하기
            <MapPin className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            주요 기능
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Data Source Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
            신뢰할 수 있는 데이터
          </h2>
          <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">데이터 출처</h3>
                  <p className="text-sm text-gray-600">
                    교육부에서 운영하는{' '}
                    <a
                      href="https://e-childschoolinfo.moe.go.kr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 font-bold hover:underline"
                    >
                      유치원 알리미
                    </a>{' '}
                    공공데이터를 활용합니다. 정확하고 공식적인 정보를 제공합니다.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <RefreshCw className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">업데이트 주기</h3>
                  <p className="text-sm text-gray-600">
                    데이터는 <strong>학기별</strong>로 정기 업데이트되어 최신
                    정보를 반영합니다.
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-6 pt-6 border-t border-gray-100">
              본 서비스는 교육부{' '}
              <a
                href="https://e-childschoolinfo.moe.go.kr"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:underline"
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

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            지금 바로 시작해보세요
          </h2>
          <p className="text-gray-600 mb-8">
            별도의 회원가입 없이 바로 검색할 수 있습니다.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-emerald-100 transition-colors"
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
