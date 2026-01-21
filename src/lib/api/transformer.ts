/**
 * API 응답 데이터 변환 함수
 */

import type {
  Kindergarten,
  InstitutionType,
  MealType,
  BasicInfoResponse,
  CurrentCountResponse,
  SchoolBusResponse,
  MealInfoResponse,
  AreaInfoResponse,
  AfterSchoolResponse,
} from '@/types';

interface TransformInput {
  basicInfo: BasicInfoResponse[];
  currentCount: CurrentCountResponse[];
  schoolBus: SchoolBusResponse[];
  mealInfo: MealInfoResponse[];
  areaInfo: AreaInfoResponse[];
  afterSchool: AfterSchoolResponse[];
}

/**
 * 설립유형 변환
 */
function parseInstitutionType(establish: string): InstitutionType {
  if (establish.includes('공립')) return 'public';
  if (establish.includes('사립') || establish.includes('법인')) return 'private';
  return 'home';
}

/**
 * 급식 유형 변환
 */
function parseMealType(mlsvof: string | undefined): MealType {
  if (!mlsvof) return 'none';
  if (mlsvof.includes('직영')) return 'direct';
  if (mlsvof.includes('위탁')) return 'outsourced';
  return 'none';
}

/**
 * 현원 계산
 */
function calculateCurrentCount(data: CurrentCountResponse | undefined): number {
  if (!data) return 0;
  return (
    parseInt(data.pm3_acnt || '0', 10) +
    parseInt(data.pf3_acnt || '0', 10) +
    parseInt(data.pm4_acnt || '0', 10) +
    parseInt(data.pf4_acnt || '0', 10) +
    parseInt(data.pm5_acnt || '0', 10) +
    parseInt(data.pf5_acnt || '0', 10) +
    parseInt(data.mixm_acnt || '0', 10) +
    parseInt(data.mixf_acnt || '0', 10) +
    parseInt(data.shm_acnt || '0', 10) +
    parseInt(data.shf_acnt || '0', 10)
  );
}

/**
 * 1인당 면적 계산
 * currentCount가 0이면 capacity를 사용 (현원 API 미제공 대응)
 */
function calculateAreaPerChild(
  areaInfo: AreaInfoResponse | undefined,
  currentCount: number,
  capacity: number
): number {
  const denominator = currentCount > 0 ? currentCount : capacity;
  if (!areaInfo || denominator === 0) return 0;
  const totalArea = parseFloat(areaInfo.gfa || '0');
  return Math.round((totalArea / denominator) * 10) / 10;
}

/**
 * API 응답을 Kindergarten 타입으로 변환
 */
export function transformToKindergartens(input: TransformInput): Omit<Kindergarten, 'lat' | 'lng' | 'distance'>[] {
  const { basicInfo, currentCount, schoolBus, mealInfo, areaInfo, afterSchool } =
    input;

  // 각 데이터를 kindercode로 인덱싱
  const currentCountMap = new Map(
    currentCount.map((item) => [item.kindercode, item])
  );
  const schoolBusMap = new Map(
    schoolBus.map((item) => [item.kindercode, item])
  );
  const mealInfoMap = new Map(mealInfo.map((item) => [item.kindercode, item]));
  const areaInfoMap = new Map(areaInfo.map((item) => [item.kindercode, item]));
  const afterSchoolMap = new Map(
    afterSchool.map((item) => [item.kindercode, item])
  );

  return basicInfo.map((basic) => {
    const currentCountData = currentCountMap.get(basic.kindercode);
    const schoolBusData = schoolBusMap.get(basic.kindercode);
    const mealInfoData = mealInfoMap.get(basic.kindercode);
    const areaInfoData = areaInfoMap.get(basic.kindercode);
    const afterSchoolData = afterSchoolMap.get(basic.kindercode);

    const currentCountValue = calculateCurrentCount(currentCountData);
    const capacity = parseInt(basic.ppCnt || '0', 10);

    return {
      kindercode: basic.kindercode,
      name: basic.kindername,
      type: parseInstitutionType(basic.establish),
      address: basic.addr,
      capacity,
      currentCount: currentCountValue,
      hasBus: schoolBusData?.opra_yn === 'Y',
      busCount: parseInt(schoolBusData?.vhcnt || '0', 10),
      mealType: parseMealType(mealInfoData?.mlsvof),
      hasAfterSchool: afterSchoolData?.afschDn === 'Y',
      areaPerChild: calculateAreaPerChild(areaInfoData, currentCountValue, capacity),
      phone: basic.telno,
      hasPlayground: parseInt(areaInfoData?.plgrdco || '0', 10) > 0,
    };
  });
}
