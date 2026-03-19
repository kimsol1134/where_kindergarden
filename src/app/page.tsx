import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { Stats } from '@/components/landing/Stats';
import { FAQ } from '@/components/landing/FAQ';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';
import { FAQJsonLd } from '@/components/JsonLd';
import { HomeRouter } from '@/components/home/HomeRouter';

const FAQ_DATA = [
  {
    questionName: '위치 정보는 안전한가요?',
    acceptedAnswerText:
      '네, 안전합니다. 위치 정보는 오직 현재 위치 기준 주변 시설을 검색하는 용도로만 사용되며 서버에 저장되지 않습니다.',
  },
  {
    questionName: '비용 정보도 알 수 있나요?',
    acceptedAnswerText:
      '기본 교육비 정보는 제공되나, 특별활동비 등 추가 비용은 변동될 수 있어 해당 기관에 직접 문의하시는 것을 권장합니다.',
  },
  {
    questionName: '모바일에서도 잘 보이나요?',
    acceptedAnswerText:
      "우리동네 유치원은 '모바일 퍼스트'로 설계되어 스마트폰에서 가장 최적화된 경험을 제공합니다.",
  },
];

export default function Home() {
  return (
    <HomeRouter>
      <div className="min-h-screen font-sans text-[var(--brand-ink)]">
        <Header />
        <main>
          <Hero />
          <Features />
          <Stats />
          <FAQ />
          <CTA />
        </main>
        <Footer />
        <FAQJsonLd mainEntity={FAQ_DATA} />
      </div>
    </HomeRouter>
  );
}
