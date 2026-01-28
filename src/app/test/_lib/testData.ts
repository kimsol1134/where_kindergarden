// 테스트 질문 및 결과 데이터

export interface Question {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  category: 'social' | 'structured';
}

export interface ResultType {
  id: 'A' | 'B' | 'C' | 'D';
  name: string;
  title: string;
  description: string;
  traits: string[];
  recommendedKindergarten: string[];
  goodMatch: 'A' | 'B' | 'C' | 'D';
  cautionMatch: 'A' | 'B' | 'C' | 'D';
}

export const QUESTIONS: Question[] = [
  {
    id: 1,
    question: '아이가 새로운 친구를 만나면?',
    optionA: '먼저 다가가서 인사해요',
    optionB: '관찰하다가 천천히 다가가요',
    category: 'social',
  },
  {
    id: 2,
    question: '놀이터에서 아이가 가장 좋아하는 활동은?',
    optionA: '친구들과 함께 놀기',
    optionB: '혼자 탐구하며 놀기',
    category: 'social',
  },
  {
    id: 3,
    question: '아이가 그룹 활동을 좋아하나요?',
    optionA: '여럿이 함께하는 활동을 좋아해요',
    optionB: '혼자 또는 소수와 하는 활동을 좋아해요',
    category: 'social',
  },
  {
    id: 4,
    question: '아이가 규칙적인 일과를 좋아하나요?',
    optionA: '정해진 시간에 밥 먹고 자는 걸 좋아해요',
    optionB: '그때그때 상황에 따라 유연하게 해요',
    category: 'structured',
  },
  {
    id: 5,
    question: '아이가 새로운 환경에 적응을 잘 하나요?',
    optionA: '낯선 곳에서도 금방 적응해요',
    optionB: '익숙해지는 데 시간이 필요해요',
    category: 'structured',
  },
  {
    id: 6,
    question: '아이가 혼자서도 잘 놀 수 있나요?',
    optionA: '혼자서도 오래 집중해서 놀아요',
    optionB: '누군가 함께 있어야 해요',
    category: 'structured',
  },
  {
    id: 7,
    question: '아이가 새로운 활동을 시도하는 것을 좋아하나요?',
    optionA: '다양한 활동을 시도하길 좋아해요',
    optionB: '좋아하는 활동만 반복하길 좋아해요',
    category: 'structured',
  },
];

export const RESULTS: Record<string, ResultType> = {
  A: {
    id: 'A',
    name: '사교형 탐험가',
    title: '우리 아이는 사교형 탐험가!',
    description:
      '활발하고 사교적인 우리 아이는 다양한 친구들과 어울리며 새로운 경험을 즐겨요. 체계적인 프로그램과 함께 다양한 활동이 있는 유치원이 잘 맞아요.',
    traits: ['활발하고 에너지 넘침', '새로운 친구 사귀기를 좋아함', '다양한 활동에 호기심'],
    recommendedKindergarten: [
      '대규모 유치원 (다양한 친구들)',
      '다양한 특별활동 프로그램',
      '통학버스 운영',
      '체계적인 일과 운영',
    ],
    goodMatch: 'B',
    cautionMatch: 'C',
  },
  B: {
    id: 'B',
    name: '창의형 예술가',
    title: '우리 아이는 창의형 예술가!',
    description:
      '창의적이고 자유로운 영혼인 우리 아이는 자신만의 방식으로 세상을 탐험해요. 자유로운 분위기에서 개성을 존중받는 유치원이 잘 맞아요.',
    traits: ['상상력이 풍부함', '자기만의 방식을 좋아함', '예술적 감각이 있음'],
    recommendedKindergarten: [
      '소규모 유치원 (세심한 관심)',
      '자유로운 놀이 중심',
      '예술/창작 프로그램',
      '개성 존중 분위기',
    ],
    goodMatch: 'A',
    cautionMatch: 'C',
  },
  C: {
    id: 'C',
    name: '학습형 연구자',
    title: '우리 아이는 학습형 연구자!',
    description:
      '호기심이 많고 깊이 탐구하는 것을 좋아하는 우리 아이는 체계적인 학습 환경에서 빛을 발해요. 잘 짜인 커리큘럼이 있는 유치원이 잘 맞아요.',
    traits: ['집중력이 좋음', '규칙적인 것을 좋아함', '배우는 것에 흥미'],
    recommendedKindergarten: [
      '체계적인 교육 커리큘럼',
      '영어/수학 등 학습 프로그램',
      '정돈된 교육 환경',
      '규칙적인 일과',
    ],
    goodMatch: 'D',
    cautionMatch: 'A',
  },
  D: {
    id: 'D',
    name: '안정형 행복이',
    title: '우리 아이는 안정형 행복이!',
    description:
      '안정적이고 따뜻한 환경을 좋아하는 우리 아이는 가정적인 분위기에서 편안함을 느껴요. 소규모로 세심한 케어가 가능한 유치원이 잘 맞아요.',
    traits: ['안정감을 중요시함', '익숙한 환경을 좋아함', '다정하고 따뜻함'],
    recommendedKindergarten: [
      '소규모 가정적 분위기',
      '가정식 직접 조리 급식',
      '세심한 개별 케어',
      '편안한 환경',
    ],
    goodMatch: 'C',
    cautionMatch: 'B',
  },
};

// 답변으로부터 결과 유형 계산
export function calculateResult(answers: string): 'A' | 'B' | 'C' | 'D' {
  const answerArray = answers.split('');

  // 사회성 점수 (질문 1-3)
  const socialScore = answerArray
    .slice(0, 3)
    .filter((a) => a === 'A').length;

  // 체계성 점수 (질문 4-7)
  const structuredScore = answerArray
    .slice(3, 7)
    .filter((a) => a === 'A').length;

  // 2x2 매트릭스로 유형 결정
  const isSocial = socialScore >= 2;
  const isStructured = structuredScore >= 2;

  if (isSocial && isStructured) return 'A'; // 사교+체계 → 사교형 탐험가
  if (isSocial && !isStructured) return 'B'; // 사교+자유 → 창의형 예술가
  if (!isSocial && isStructured) return 'C'; // 독립+체계 → 학습형 연구자
  return 'D'; // 독립+자유 → 안정형 행복이
}
