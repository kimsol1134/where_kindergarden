/**
 * 변환된 데이터 구조 확인 스크립트
 */

import 'dotenv/config';
import { SIGUNGU_CODES } from './data/sigungu-codes';

const API_BASE_URL = 'https://e-childschoolinfo.moe.go.kr/api/notice';

interface BasicInfoRow {
  kindercode: string;
  kindername: string;
  establish: string;
  addr: string;
  telno: string;
  ppcnt3?: string;
  ppcnt4?: string;
  ppcnt5?: string;
  mixppcnt?: string;
  shppcnt?: string;
  ppCnt?: string;
}

interface SchoolBusRow {
  kindercode: string;
  vhcl_oprn_yn: string;
  opra_vhcnt?: string;
}

interface SchoolMealRow {
  kindercode: string;
  mlsr_oprn_way_tp_cd?: string;
}

interface ClassAreaRow {
  kindercode: string;
  clsrarea?: string;
  otsparea?: string;
}

interface AfterSchoolRow {
  kindercode: string;
  inor_clcnt?: string;
  pm_rrgn_clcnt?: string;
  oper_time?: string;
}

async function fetchData<T>(endpoint: string, apiKey: string, sidoCode: string, sggCode: string): Promise<T[]> {
  const url = `${API_BASE_URL}/${endpoint}.do?key=${apiKey}&sidoCode=${sidoCode}&sggCode=${sggCode}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const data = await response.json();
  return data.kinderInfo || [];
}

function parseArea(areaStr: string | undefined): number {
  if (!areaStr) return 0;
  const match = String(areaStr).match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

async function main() {
  const apiKey = process.env.KINDERGARTEN_API_KEY;
  if (!apiKey) {
    console.error('KINDERGARTEN_API_KEY is not set');
    process.exit(1);
  }

  const sigungu = SIGUNGU_CODES.find((sgg) => sgg.sggCode === '11110')!;

  console.log('Fetching data for Seoul Jongno-gu...\n');

  const [basicInfo, schoolBus, schoolMeal, classArea, afterSchool] = await Promise.all([
    fetchData<BasicInfoRow>('basicInfo', apiKey, sigungu.eduSidoCode, sigungu.sggCode),
    fetchData<SchoolBusRow>('schoolBus', apiKey, sigungu.eduSidoCode, sigungu.sggCode),
    fetchData<SchoolMealRow>('schoolMeal', apiKey, sigungu.eduSidoCode, sigungu.sggCode),
    fetchData<ClassAreaRow>('classArea', apiKey, sigungu.eduSidoCode, sigungu.sggCode),
    fetchData<AfterSchoolRow>('afterSchoolPresent', apiKey, sigungu.eduSidoCode, sigungu.sggCode),
  ]);

  const busMap = new Map(schoolBus.map((item) => [item.kindercode, item]));
  const mealMap = new Map(schoolMeal.map((item) => [item.kindercode, item]));
  const areaMap = new Map(classArea.map((item) => [item.kindercode, item]));
  const afterSchoolMap = new Map(afterSchool.map((item) => [item.kindercode, item]));

  console.log('=== Transformed Data Sample (First 3) ===\n');

  for (const basic of basicInfo.slice(0, 3)) {
    const busData = busMap.get(basic.kindercode);
    const mealData = mealMap.get(basic.kindercode);
    const areaData = areaMap.get(basic.kindercode);
    const afterSchoolData = afterSchoolMap.get(basic.kindercode);

    const capacity = basic.ppCnt
      ? parseInt(basic.ppCnt, 10)
      : (parseInt(basic.ppcnt3 || '0', 10) +
         parseInt(basic.ppcnt4 || '0', 10) +
         parseInt(basic.ppcnt5 || '0', 10) +
         parseInt(basic.mixppcnt || '0', 10) +
         parseInt(basic.shppcnt || '0', 10));

    const totalArea = parseArea(areaData?.clsrarea);
    const areaPerChild = capacity > 0 ? Math.round((totalArea / capacity) * 10) / 10 : 0;
    const outdoorArea = parseArea(areaData?.otsparea);

    const transformed = {
      kindercode: basic.kindercode,
      name: basic.kindername,
      address: basic.addr,
      sido_code: sigungu.eduSidoCode,
      sigungu_code: sigungu.sggCode,
      type: basic.establish.includes('공립') ? 'public' : 'private',
      capacity,
      has_bus: busData?.vhcl_oprn_yn === 'Y',
      bus_count: parseInt(busData?.opra_vhcnt || '0', 10),
      meal_type: mealData?.mlsr_oprn_way_tp_cd?.includes('직영') ? 'direct' : mealData?.mlsr_oprn_way_tp_cd?.includes('위탁') ? 'outsourced' : null,
      has_after_school: parseInt(afterSchoolData?.inor_clcnt || '0', 10) > 0 || parseInt(afterSchoolData?.pm_rrgn_clcnt || '0', 10) > 0,
      area_per_child: areaPerChild,
      phone: basic.telno,
      has_playground: outdoorArea > 0,
    };

    console.log(JSON.stringify(transformed, null, 2));
    console.log('---');
  }

  console.log(`\nTotal kindergartens: ${basicInfo.length}`);
}

main().catch(console.error);
