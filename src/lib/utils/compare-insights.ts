import type { Kindergarten } from '@/types';

export interface CompareCandidateInsight {
  kindercode: string;
  name: string;
  reasons: string[];
  cautions: string[];
}

function vacancyCount(item: Kindergarten): number {
  return Math.max(0, item.capacity - item.currentCount);
}

export function getCompareCandidateInsights(items: Kindergarten[]): CompareCandidateInsight[] {
  const maxArea = Math.max(...items.map((item) => item.areaPerChild));
  const maxVacancy = Math.max(...items.map(vacancyCount));
  const maxBusCount = Math.max(...items.map((item) => (item.hasBus ? item.busCount : 0)));

  return items.map((item) => {
    const reasons: string[] = [];
    const cautions: string[] = [];
    const vacancies = vacancyCount(item);

    if (item.distance >= 0 && item.distance <= 1) {
      reasons.push('도보권에 가까움');
    } else if (item.distance >= 0 && item.distance <= 2) {
      reasons.push('근거리 통학권');
    }

    if (item.hasBus) {
      reasons.push(maxBusCount > 0 && item.busCount === maxBusCount ? '통학차량 조건 우수' : '통학차량 운영');
    } else {
      cautions.push('통학차량 미운영');
    }

    if (item.hasAfterSchool) {
      reasons.push('방과후 과정 운영');
    } else {
      cautions.push('방과후 미운영');
    }

    if (item.mealType === 'direct') {
      reasons.push('직영급식');
    } else if (item.mealType === 'none') {
      cautions.push('급식 미운영');
    }

    if (item.areaPerChild > 0 && item.areaPerChild === maxArea) {
      reasons.push('1인당 면적 가장 넓음');
    }

    if (vacancies > 0 && vacancies === maxVacancy) {
      reasons.push('정원 여유 상대적으로 큼');
    } else if (item.capacity > 0 && vacancies <= 0) {
      cautions.push('정원 여유 확인 필요');
    }

    return {
      kindercode: item.kindercode,
      name: item.name,
      reasons: reasons.slice(0, 3),
      cautions: cautions.slice(0, 2),
    };
  });
}

export function getConsultationQuestions(items: Kindergarten[]): string[] {
  const questions = new Set<string>();

  if (items.some((item) => item.hasBus)) {
    questions.add('우리 주소 기준 통학차량 노선과 승하차 시간을 확인하세요.');
  }

  if (items.some((item) => item.hasAfterSchool)) {
    questions.add('방과후 과정 종료 시간, 비용, 방학 중 운영 여부를 물어보세요.');
  }

  questions.add('2026학년도 현재 결원과 추가모집 가능 여부를 전화로 확인하세요.');
  questions.add('특별활동비, 현장학습비 등 월 추가 비용을 확인하세요.');
  questions.add('급식 알레르기 대응과 간식 제공 방식을 확인하세요.');

  return Array.from(questions).slice(0, 5);
}
