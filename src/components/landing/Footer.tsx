import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Facebook, MessageCircle } from 'lucide-react';
import { DATA_VERSION } from '@/lib/constants';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4 text-white">
              <Image
                src="/logo.png"
                alt="우리동네 유치원"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="text-xl font-bold">우리동네 유치원</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs mb-6">
              학부모님들의 현명한 선택을 돕기 위해 만든<br/>
              위치 기반 유치원 비교 서비스입니다.
            </p>
            <Link 
              href="https://apps.apple.com/us/app/%EC%9C%A0%EC%B9%98%EC%9B%90-%EC%95%8C%EB%A6%AC%EB%AF%B8-%EC%9A%B0%EB%A6%AC%EB%8F%99%EB%84%A4-%EC%9C%A0%EC%B9%98%EC%9B%90/id6758149645"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block hover:opacity-80 transition-opacity"
            >
              <Image
                src="/images/app-store-badge.svg"
                alt="Download on the App Store"
                width={120}
                height={40}
                className="h-[40px] w-auto"
              />
            </Link>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">서비스</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/search" className="hover:text-emerald-500">유치원 찾기</Link></li>
              <li><Link href="/compare" className="hover:text-emerald-500">비교하기</Link></li>
              <li><Link href="#" className="hover:text-emerald-500">이용 가이드</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4">문의</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-emerald-500">자주 묻는 질문</Link></li>
              <li><Link href="mailto:kimsol1134@naver.com" className="hover:text-emerald-500">제휴 문의</Link></li>
              <li><Link href="/privacy" className="hover:text-emerald-500">개인정보처리방침</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 mt-8">
          <div className="flex items-start gap-3 mb-6">
            <Image 
              src="/images/kogl_type1.jpg" 
              alt="공공누리 제1유형" 
              width={80} 
              height={40}
              className="w-16 h-auto"
            />
            <p className="text-[10px] text-gray-500 leading-relaxed">
              본 저작물은 &apos;교육부&apos;에서 &apos;2026년&apos; 작성하여 공공누리 제1유형으로 개방한 &apos;전국유치원표준데이터&apos;를 이용하였으며,
              해당 저작물은 <a href="https://e-childschoolinfo.moe.go.kr" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 underline">유치원 알리미</a>에서 무료로 다운받으실 수 있습니다.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center text-xs gap-4">
            <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
              <p>
                &copy; 2026{' '}
                <a 
                  href="https://litt.ly/solkim" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-white underline"
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
                  className="hover:text-emerald-500 transition-colors"
                >
                  유치원 알리미
                </a>
                (교육부)
              </p>
            </div>
            <div className="flex gap-4">
              <Link href="#" className="hover:text-white"><Instagram className="w-5 h-5" /></Link>
              <Link href="#" className="hover:text-white"><Facebook className="w-5 h-5" /></Link>
              <Link href="#" className="hover:text-white"><MessageCircle className="w-5 h-5" /></Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
