'use client';

import { useState } from 'react';
import {
  Users,
  Palette,
  BookOpen,
  Home,
  Check,
  GraduationCap,
  Bus,
  Users2,
  Sparkles,
  Heart,
  Star,
  Clock,
  School,
  type LucideIcon,
} from 'lucide-react';
import { QUESTIONS, RESULTS, calculateResult, ResultType } from '../_lib/testData';

type TestPhase = 'intro' | 'questions' | 'result';

// 유형별 아이콘 매핑
const typeIcons: Record<'A' | 'B' | 'C' | 'D', LucideIcon> = {
  A: Users,
  B: Palette,
  C: BookOpen,
  D: Home,
};

// rendering-hoist-jsx: 정적 SVG를 컴포넌트 외부로 호이스팅
const KakaoIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3C6.477 3 2 6.463 2 10.714c0 2.675 1.789 5.025 4.484 6.367-.146.518-.945 3.334-.973 3.558 0 0-.019.167.089.23.107.064.233.015.233.015.308-.043 3.563-2.323 4.122-2.72.669.096 1.361.147 2.045.147 5.523 0 10-3.463 10-7.597C22 6.463 17.523 3 12 3" />
  </svg>
);

const LinkIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
);

// 결과 타입별 색상 테마 (파스텔 톤으로 변경)
const typeColors = {
  A: { bg: 'from-amber-200 to-orange-300', light: 'bg-amber-50/70', text: 'text-amber-700', border: 'border-amber-200', accent: 'bg-amber-400' },
  B: { bg: 'from-purple-200 to-pink-300', light: 'bg-purple-50/70', text: 'text-purple-700', border: 'border-purple-200', accent: 'bg-purple-400' },
  C: { bg: 'from-blue-200 to-indigo-300', light: 'bg-blue-50/70', text: 'text-blue-700', border: 'border-blue-200', accent: 'bg-blue-400' },
  D: { bg: 'from-emerald-200 to-teal-300', light: 'bg-emerald-50/70', text: 'text-emerald-700', border: 'border-emerald-200', accent: 'bg-emerald-400' },
} as const;

// 추천 유치원 항목별 아이콘 매핑
const recommendationIcons: Record<string, LucideIcon> = {
  '대규모 유치원': Users2,
  '소규모 유치원': Heart,
  '소규모 가정적': Heart,
  '다양한 특별활동': Sparkles,
  '다양한 프로그램': Sparkles,
  '통학버스': Bus,
  '체계적인': GraduationCap,
  '정돈된 교육': GraduationCap,
  '규칙적인': Clock,
  '자유로운': Sparkles,
  '예술': Palette,
  '창작': Palette,
  '개성 존중': Star,
  '영어': BookOpen,
  '학습': BookOpen,
  '가정식': Home,
  '세심한': Heart,
  '편안한': Home,
};

// 추천 텍스트에 맞는 아이콘 찾기
function getRecommendationIcon(text: string): LucideIcon {
  for (const [keyword, icon] of Object.entries(recommendationIcons)) {
    if (text.includes(keyword)) return icon;
  }
  return Star;
}

export function TestFlow() {
  const [phase, setPhase] = useState<TestPhase>('intro');
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState('');
  const [result, setResult] = useState<ResultType | null>(null);

  const totalQuestions = QUESTIONS.length;

  const handleStart = () => {
    setAnswers('');
    setCurrentStep(1);
    setPhase('questions');
  };

  const handleSelect = (choice: 'A' | 'B') => {
    const newAnswers = answers + choice;
    setAnswers(newAnswers);

    if (currentStep === totalQuestions) {
      const resultType = calculateResult(newAnswers);
      setResult(RESULTS[resultType]);
      setPhase('result');
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleRetry = () => {
    setAnswers('');
    setCurrentStep(1);
    setResult(null);
    setPhase('intro');
  };

  const handleShare = () => {
    if (!result) return;

    const shareUrl = 'https://where-kindergarden.vercel.app/test/';
    const shareTitle = `나는 ${result.name}!`;

    const kakao = (window as unknown as { Kakao?: {
      isInitialized: () => boolean;
      Share: {
        sendDefault: (options: {
          objectType: string;
          content: {
            title: string;
            description: string;
            imageUrl: string;
            link: { mobileWebUrl: string; webUrl: string };
          };
          buttons: Array<{
            title: string;
            link: { mobileWebUrl: string; webUrl: string };
          }>;
        }) => void;
      };
    } }).Kakao;

    if (kakao?.isInitialized()) {
      kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: shareTitle,
          description: result.description,
          imageUrl: 'https://where-kindergarden.vercel.app/og-test.png',
          link: {
            mobileWebUrl: shareUrl,
            webUrl: shareUrl,
          },
        },
        buttons: [
          {
            title: '나도 테스트하기',
            link: {
              mobileWebUrl: shareUrl,
              webUrl: shareUrl,
            },
          },
        ],
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('링크가 복사되었습니다!');
    }
  };

  const handleCopyLink = async () => {
    const shareUrl = `${window.location.origin}/test/`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('링크가 복사되었습니다!');
    } catch {
      alert('링크 복사에 실패했습니다.');
    }
  };

  // ===== 인트로 화면 =====
  if (phase === 'intro') {
    return (
      <div className="space-y-8">
        {/* 히어로 섹션 */}
        <div className="text-center pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-6">
            <BookOpen className="w-4 h-4" />
            아동심리 전문가 연구 기반
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">
            우리 아이는
            <br />
            <span className="text-emerald-500">어떤 성향</span>일까?
          </h1>

          <p className="text-gray-600 mb-8 leading-relaxed">
            7가지 질문으로 알아보는
            <br />
            아이에게 맞는 유치원 환경 추천
          </p>
        </div>

        {/* 4가지 유형 미리보기 카드 */}
        <div className="grid grid-cols-2 gap-3">
          {([
            { id: 'A' as const, name: '사교형 탐험가', color: 'from-amber-200 to-orange-300' },
            { id: 'B' as const, name: '창의형 예술가', color: 'from-purple-200 to-pink-300' },
            { id: 'C' as const, name: '학습형 연구자', color: 'from-blue-200 to-indigo-300' },
            { id: 'D' as const, name: '안정형 행복이', color: 'from-emerald-200 to-teal-300' },
          ]).map((type) => {
            const TypeIcon = typeIcons[type.id];
            return (
              <div
                key={type.id}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${type.color} flex items-center justify-center mb-3 shadow-lg`}>
                  <TypeIcon className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-700">{type.name}</p>
              </div>
            );
          })}
        </div>

        {/* 테스트 정보 */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-emerald-600">7</p>
              <p className="text-xs text-gray-500 mt-1">질문</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-emerald-600">1분</p>
              <p className="text-xs text-gray-500 mt-1">소요시간</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-emerald-600">4</p>
              <p className="text-xs text-gray-500 mt-1">유형</p>
            </div>
          </div>
        </div>

        {/* CTA 버튼 */}
        <button
          onClick={handleStart}
          className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-4 px-8 rounded-2xl shadow-lg shadow-emerald-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          테스트 시작하기
        </button>

        <p className="text-center text-sm text-gray-400">
          지금까지 <span className="font-semibold text-emerald-600">2,847명</span>이 참여했어요
        </p>
      </div>
    );
  }

  // ===== 질문 화면 =====
  if (phase === 'questions') {
    const question = QUESTIONS[currentStep - 1];
    const progress = (currentStep / totalQuestions) * 100;

    return (
      <div className="space-y-6">
        {/* 프로그레스 바 */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold text-gray-700">
              질문 {currentStep} / {totalQuestions}
            </span>
            <span className="text-sm font-medium text-emerald-600">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 질문 카드 */}
        <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 text-white font-bold rounded-xl mb-4 shadow-lg">
              Q{currentStep}
            </div>
            <h2 className="text-xl font-semibold text-gray-900 leading-relaxed">
              {question.question}
            </h2>
          </div>

          {/* 선택지 */}
          <div className="space-y-3">
            <button
              onClick={() => handleSelect('A')}
              className="w-full group bg-gradient-to-r from-gray-50 to-white hover:from-emerald-50 hover:to-teal-50 border-2 border-gray-100 hover:border-emerald-300 rounded-2xl p-5 text-left transition-all hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <span className="flex-shrink-0 w-10 h-10 bg-white group-hover:bg-emerald-500 border-2 border-gray-200 group-hover:border-emerald-500 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-white font-bold transition-colors">
                  A
                </span>
                <span className="text-gray-700 group-hover:text-gray-900 font-medium">
                  {question.optionA}
                </span>
              </div>
            </button>

            <button
              onClick={() => handleSelect('B')}
              className="w-full group bg-gradient-to-r from-gray-50 to-white hover:from-teal-50 hover:to-emerald-50 border-2 border-gray-100 hover:border-teal-300 rounded-2xl p-5 text-left transition-all hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <span className="flex-shrink-0 w-10 h-10 bg-white group-hover:bg-teal-500 border-2 border-gray-200 group-hover:border-teal-500 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-white font-bold transition-colors">
                  B
                </span>
                <span className="text-gray-700 group-hover:text-gray-900 font-medium">
                  {question.optionB}
                </span>
              </div>
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400">
          직감적으로 선택해 주세요
        </p>
      </div>
    );
  }

  // ===== 결과 화면 =====
  if (phase === 'result' && result) {
    const goodMatch = RESULTS[result.goodMatch];
    const cautionMatch = RESULTS[result.cautionMatch];
    const colors = typeColors[result.id];
    const ResultIcon = typeIcons[result.id];
    const GoodMatchIcon = typeIcons[goodMatch.id];
    const CautionMatchIcon = typeIcons[cautionMatch.id];

    return (
      <div className="space-y-8">
        {/* 결과 메인 카드 */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100">
          {/* 그라데이션 헤더 - 파스텔 톤 + 아이콘 */}
          <div className={`bg-gradient-to-br ${colors.bg} p-8 text-center`}>
            <div className="w-20 h-20 rounded-full bg-white/40 backdrop-blur-sm flex items-center justify-center mb-4 mx-auto shadow-lg">
              <ResultIcon className="w-10 h-10 text-white drop-shadow-md" />
            </div>
            <p className="text-white/80 text-sm font-medium mb-2">테스트 결과</p>
            <h1 className="text-2xl font-bold text-white drop-shadow-sm">{result.title}</h1>
          </div>

          {/* 설명 */}
          <div className="p-6 space-y-6">
            <p className="text-gray-600 leading-relaxed text-center">
              {result.description}
            </p>

            {/* 구분선 */}
            <div className="border-t border-gray-100" />

            {/* 특성 - 아이콘+텍스트 리스트 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-3">아이의 특성</h3>
              <div className="space-y-2.5">
                {result.traits.map((trait, index) => (
                  <div key={index} className="flex items-center gap-2.5 text-gray-700">
                    <div className={`w-5 h-5 rounded-full ${colors.light} flex items-center justify-center`}>
                      <Check className={`w-3 h-3 ${colors.text}`} />
                    </div>
                    <span className="text-sm">{trait}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 구분선 */}
            <div className="border-t border-gray-100" />

            {/* 추천 유치원 - 카드 형태 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-3">이런 유치원이 잘 맞아요</h3>
              <div className="grid grid-cols-2 gap-2">
                {result.recommendedKindergarten.map((item, index) => {
                  const RecIcon = getRecommendationIcon(item);
                  return (
                    <div
                      key={index}
                      className={`${colors.light} rounded-xl p-3 flex items-center gap-2`}
                    >
                      <RecIcon className={`w-4 h-4 ${colors.text} flex-shrink-0`} />
                      <span className="text-xs text-gray-700 leading-tight">{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 궁합 카드 - 아이콘으로 변경 */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 mb-4 text-center">
            다른 유형과의 궁합
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 text-center border border-green-100">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <GoodMatchIcon className="w-6 h-6 text-green-600" />
              </div>
              <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full mb-1">
                잘 맞아요
              </span>
              <p className="text-sm font-semibold text-gray-700">{goodMatch.name}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 text-center border border-orange-100">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2">
                <CautionMatchIcon className="w-6 h-6 text-orange-600" />
              </div>
              <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full mb-1">
                조금 달라요
              </span>
              <p className="text-sm font-semibold text-gray-700">{cautionMatch.name}</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400 text-center">
            궁합이 다르다고 안 맞는 건 아니에요! 서로 배울 점이 있답니다
          </p>
        </div>

        {/* 공유 버튼 */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-2 bg-[#FEE500] hover:bg-[#FDD835] text-[#391B1B] font-semibold py-3.5 px-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
            >
              {KakaoIcon}
              카카오톡 공유
            </button>
            <button
              onClick={handleCopyLink}
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3.5 px-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {LinkIcon}
              링크 복사
            </button>
          </div>

          <button
            onClick={handleRetry}
            className="w-full bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-700 font-semibold py-3.5 px-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            다시 테스트하기
          </button>

          <a
            href="https://apps.apple.com/us/app/%EC%9C%A0%EC%B9%98%EC%9B%90-%EC%95%8C%EB%A6%AC%EB%AF%B8-%EC%9A%B0%EB%A6%AC%EB%8F%99%EB%84%A4-%EC%9C%A0%EC%B9%98%EC%9B%90/id6758149645"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-4 px-4 rounded-xl shadow-lg shadow-emerald-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <School className="w-5 h-5" />
            앱에서 유치원 찾아보기
          </a>
        </div>
      </div>
    );
  }

  return null;
}
