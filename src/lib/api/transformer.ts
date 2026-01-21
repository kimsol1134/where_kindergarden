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
function parseMealType(mlsrOprnWayTpCd: string | undefined): MealType {
  if (!mlsrOprnWayTpCd) return 'none';
  if (mlsrOprnWayTpCd.includes('직영')) return 'direct';
  if (mlsrOprnWayTpCd.includes('위탁')) return 'outsourced';
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
 * 면적 문자열에서 숫자 추출 (예: "159㎡" → 159)
 */
function parseArea(areaStr: string | undefined): number {
  if (!areaStr) return 0;
  const match = areaStr.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
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
  // 교실 면적 사용
  const totalArea = parseArea(areaInfo.clsrarea);
  return Math.round((totalArea / denominator) * 10) / 10;
}

/**
 * 실외 놀이터 유무 확인
 */
function hasOutdoorPlayground(areaInfo: AreaInfoResponse | undefined): boolean {
  if (!areaInfo) return false;
  const outdoorArea = parseArea(areaInfo.otsparea);
  return outdoorArea > 0;
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
    // 정원 계산: ppCnt가 없으면 개별 필드 합산
    const capacity = basic.ppCnt
      ? parseInt(basic.ppCnt, 10)
      : (parseInt(basic.ppcnt3 || '0', 10) +
         parseInt(basic.ppcnt4 || '0', 10) +
         parseInt(basic.ppcnt5 || '0', 10) +
         parseInt(basic.mixppcnt || '0', 10) +
         parseInt(basic.shppcnt || '0', 10));

    return {
      kindercode: basic.kindercode,
      name: basic.kindername,
      type: parseInstitutionType(basic.establish),
      address: basic.addr,
      capacity,
      currentCount: currentCountValue,
      hasBus: schoolBusData?.vhcl_oprn_yn === 'Y',
      busCount: parseInt(schoolBusData?.opra_vhcnt || '0', 10),
      mealType: parseMealType(mealInfoData?.mlsr_oprn_way_tp_cd),
      hasAfterSchool: parseInt(afterSchoolData?.inor_clcnt || '0', 10) > 0,
      areaPerChild: calculateAreaPerChild(areaInfoData, currentCountValue, capacity),
      phone: basic.telno,
      hasPlayground: hasOutdoorPlayground(areaInfoData),
    };
  });
}
