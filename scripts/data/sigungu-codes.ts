/**
 * 전국 시군구 코드 목록
 *
 * - eduSidoCode: 교육부 시도코드 (유치원 알리미 API용)
 * - adminSidoCode: 행정안전부 시도코드
 * - sggCode: 행정안전부 시군구코드 (5자리)
 * - sidoName: 시도명
 * - sggName: 시군구명
 */

export interface SigunguCode {
  eduSidoCode: string;
  adminSidoCode: string;
  sggCode: string;
  sidoName: string;
  sggName: string;
}

// 교육부 시도코드 매핑 (행정안전부 → 교육부)
export const ADMIN_TO_EDU_SIDO: Record<string, string> = {
  '11': '11', // 서울
  '26': '21', // 부산
  '27': '22', // 대구
  '28': '23', // 인천
  '29': '24', // 광주
  '30': '25', // 대전
  '31': '26', // 울산
  '36': '29', // 세종
  '41': '27', // 경기
  '42': '28', // 강원 (구)
  '51': '28', // 강원특별자치도 (신)
  '43': '34', // 충북
  '44': '35', // 충남
  '45': '36', // 전북 (구)
  '52': '36', // 전북특별자치도 (신)
  '46': '37', // 전남
  '47': '38', // 경북
  '48': '39', // 경남
  '50': '40', // 제주
};

// 전국 시군구 코드 목록
export const SIGUNGU_CODES: SigunguCode[] = [
  // 서울특별시 (eduSido: 11, adminSido: 11)
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11110', sidoName: '서울특별시', sggName: '종로구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11140', sidoName: '서울특별시', sggName: '중구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11170', sidoName: '서울특별시', sggName: '용산구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11200', sidoName: '서울특별시', sggName: '성동구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11215', sidoName: '서울특별시', sggName: '광진구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11230', sidoName: '서울특별시', sggName: '동대문구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11260', sidoName: '서울특별시', sggName: '중랑구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11290', sidoName: '서울특별시', sggName: '성북구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11305', sidoName: '서울특별시', sggName: '강북구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11320', sidoName: '서울특별시', sggName: '도봉구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11350', sidoName: '서울특별시', sggName: '노원구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11380', sidoName: '서울특별시', sggName: '은평구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11410', sidoName: '서울특별시', sggName: '서대문구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11440', sidoName: '서울특별시', sggName: '마포구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11470', sidoName: '서울특별시', sggName: '양천구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11500', sidoName: '서울특별시', sggName: '강서구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11530', sidoName: '서울특별시', sggName: '구로구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11545', sidoName: '서울특별시', sggName: '금천구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11560', sidoName: '서울특별시', sggName: '영등포구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11590', sidoName: '서울특별시', sggName: '동작구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11620', sidoName: '서울특별시', sggName: '관악구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11650', sidoName: '서울특별시', sggName: '서초구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11680', sidoName: '서울특별시', sggName: '강남구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11710', sidoName: '서울특별시', sggName: '송파구' },
  { eduSidoCode: '11', adminSidoCode: '11', sggCode: '11740', sidoName: '서울특별시', sggName: '강동구' },

  // 부산광역시 (eduSido: 21, adminSido: 26)
  { eduSidoCode: '21', adminSidoCode: '26', sggCode: '26110', sidoName: '부산광역시', sggName: '중구' },
  { eduSidoCode: '21', adminSidoCode: '26', sggCode: '26140', sidoName: '부산광역시', sggName: '서구' },
  { eduSidoCode: '21', adminSidoCode: '26', sggCode: '26170', sidoName: '부산광역시', sggName: '동구' },
  { eduSidoCode: '21', adminSidoCode: '26', sggCode: '26200', sidoName: '부산광역시', sggName: '영도구' },
  { eduSidoCode: '21', adminSidoCode: '26', sggCode: '26230', sidoName: '부산광역시', sggName: '부산진구' },
  { eduSidoCode: '21', adminSidoCode: '26', sggCode: '26260', sidoName: '부산광역시', sggName: '동래구' },
  { eduSidoCode: '21', adminSidoCode: '26', sggCode: '26290', sidoName: '부산광역시', sggName: '남구' },
  { eduSidoCode: '21', adminSidoCode: '26', sggCode: '26320', sidoName: '부산광역시', sggName: '북구' },
  { eduSidoCode: '21', adminSidoCode: '26', sggCode: '26350', sidoName: '부산광역시', sggName: '해운대구' },
  { eduSidoCode: '21', adminSidoCode: '26', sggCode: '26380', sidoName: '부산광역시', sggName: '사하구' },
  { eduSidoCode: '21', adminSidoCode: '26', sggCode: '26410', sidoName: '부산광역시', sggName: '금정구' },
  { eduSidoCode: '21', adminSidoCode: '26', sggCode: '26440', sidoName: '부산광역시', sggName: '강서구' },
  { eduSidoCode: '21', adminSidoCode: '26', sggCode: '26470', sidoName: '부산광역시', sggName: '연제구' },
  { eduSidoCode: '21', adminSidoCode: '26', sggCode: '26500', sidoName: '부산광역시', sggName: '수영구' },
  { eduSidoCode: '21', adminSidoCode: '26', sggCode: '26530', sidoName: '부산광역시', sggName: '사상구' },
  { eduSidoCode: '21', adminSidoCode: '26', sggCode: '26710', sidoName: '부산광역시', sggName: '기장군' },

  // 대구광역시 (eduSido: 22, adminSido: 27)
  { eduSidoCode: '22', adminSidoCode: '27', sggCode: '27110', sidoName: '대구광역시', sggName: '중구' },
  { eduSidoCode: '22', adminSidoCode: '27', sggCode: '27140', sidoName: '대구광역시', sggName: '동구' },
  { eduSidoCode: '22', adminSidoCode: '27', sggCode: '27170', sidoName: '대구광역시', sggName: '서구' },
  { eduSidoCode: '22', adminSidoCode: '27', sggCode: '27200', sidoName: '대구광역시', sggName: '남구' },
  { eduSidoCode: '22', adminSidoCode: '27', sggCode: '27230', sidoName: '대구광역시', sggName: '북구' },
  { eduSidoCode: '22', adminSidoCode: '27', sggCode: '27260', sidoName: '대구광역시', sggName: '수성구' },
  { eduSidoCode: '22', adminSidoCode: '27', sggCode: '27290', sidoName: '대구광역시', sggName: '달서구' },
  { eduSidoCode: '22', adminSidoCode: '27', sggCode: '27710', sidoName: '대구광역시', sggName: '달성군' },
  { eduSidoCode: '22', adminSidoCode: '27', sggCode: '27720', sidoName: '대구광역시', sggName: '군위군' },

  // 인천광역시 (eduSido: 23, adminSido: 28)
  { eduSidoCode: '23', adminSidoCode: '28', sggCode: '28110', sidoName: '인천광역시', sggName: '중구' },
  { eduSidoCode: '23', adminSidoCode: '28', sggCode: '28140', sidoName: '인천광역시', sggName: '동구' },
  { eduSidoCode: '23', adminSidoCode: '28', sggCode: '28177', sidoName: '인천광역시', sggName: '미추홀구' },
  { eduSidoCode: '23', adminSidoCode: '28', sggCode: '28185', sidoName: '인천광역시', sggName: '연수구' },
  { eduSidoCode: '23', adminSidoCode: '28', sggCode: '28200', sidoName: '인천광역시', sggName: '남동구' },
  { eduSidoCode: '23', adminSidoCode: '28', sggCode: '28237', sidoName: '인천광역시', sggName: '부평구' },
  { eduSidoCode: '23', adminSidoCode: '28', sggCode: '28245', sidoName: '인천광역시', sggName: '계양구' },
  { eduSidoCode: '23', adminSidoCode: '28', sggCode: '28260', sidoName: '인천광역시', sggName: '서구' },
  { eduSidoCode: '23', adminSidoCode: '28', sggCode: '28710', sidoName: '인천광역시', sggName: '강화군' },
  { eduSidoCode: '23', adminSidoCode: '28', sggCode: '28720', sidoName: '인천광역시', sggName: '옹진군' },

  // 광주광역시 (eduSido: 24, adminSido: 29)
  { eduSidoCode: '24', adminSidoCode: '29', sggCode: '29110', sidoName: '광주광역시', sggName: '동구' },
  { eduSidoCode: '24', adminSidoCode: '29', sggCode: '29140', sidoName: '광주광역시', sggName: '서구' },
  { eduSidoCode: '24', adminSidoCode: '29', sggCode: '29155', sidoName: '광주광역시', sggName: '남구' },
  { eduSidoCode: '24', adminSidoCode: '29', sggCode: '29170', sidoName: '광주광역시', sggName: '북구' },
  { eduSidoCode: '24', adminSidoCode: '29', sggCode: '29200', sidoName: '광주광역시', sggName: '광산구' },

  // 대전광역시 (eduSido: 25, adminSido: 30)
  { eduSidoCode: '25', adminSidoCode: '30', sggCode: '30110', sidoName: '대전광역시', sggName: '동구' },
  { eduSidoCode: '25', adminSidoCode: '30', sggCode: '30140', sidoName: '대전광역시', sggName: '중구' },
  { eduSidoCode: '25', adminSidoCode: '30', sggCode: '30170', sidoName: '대전광역시', sggName: '서구' },
  { eduSidoCode: '25', adminSidoCode: '30', sggCode: '30200', sidoName: '대전광역시', sggName: '유성구' },
  { eduSidoCode: '25', adminSidoCode: '30', sggCode: '30230', sidoName: '대전광역시', sggName: '대덕구' },

  // 울산광역시 (eduSido: 26, adminSido: 31)
  { eduSidoCode: '26', adminSidoCode: '31', sggCode: '31110', sidoName: '울산광역시', sggName: '중구' },
  { eduSidoCode: '26', adminSidoCode: '31', sggCode: '31140', sidoName: '울산광역시', sggName: '남구' },
  { eduSidoCode: '26', adminSidoCode: '31', sggCode: '31170', sidoName: '울산광역시', sggName: '동구' },
  { eduSidoCode: '26', adminSidoCode: '31', sggCode: '31200', sidoName: '울산광역시', sggName: '북구' },
  { eduSidoCode: '26', adminSidoCode: '31', sggCode: '31710', sidoName: '울산광역시', sggName: '울주군' },

  // 세종특별자치시 (eduSido: 29, adminSido: 36)
  { eduSidoCode: '29', adminSidoCode: '36', sggCode: '36110', sidoName: '세종특별자치시', sggName: '세종시' },

  // 경기도 (eduSido: 27, adminSido: 41)
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41111', sidoName: '경기도', sggName: '수원시 장안구' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41113', sidoName: '경기도', sggName: '수원시 권선구' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41115', sidoName: '경기도', sggName: '수원시 팔달구' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41117', sidoName: '경기도', sggName: '수원시 영통구' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41131', sidoName: '경기도', sggName: '성남시 수정구' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41133', sidoName: '경기도', sggName: '성남시 중원구' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41135', sidoName: '경기도', sggName: '성남시 분당구' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41150', sidoName: '경기도', sggName: '의정부시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41171', sidoName: '경기도', sggName: '안양시 만안구' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41173', sidoName: '경기도', sggName: '안양시 동안구' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41190', sidoName: '경기도', sggName: '부천시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41210', sidoName: '경기도', sggName: '광명시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41220', sidoName: '경기도', sggName: '평택시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41250', sidoName: '경기도', sggName: '동두천시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41271', sidoName: '경기도', sggName: '안산시 상록구' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41273', sidoName: '경기도', sggName: '안산시 단원구' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41281', sidoName: '경기도', sggName: '고양시 덕양구' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41285', sidoName: '경기도', sggName: '고양시 일산동구' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41287', sidoName: '경기도', sggName: '고양시 일산서구' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41290', sidoName: '경기도', sggName: '과천시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41310', sidoName: '경기도', sggName: '구리시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41360', sidoName: '경기도', sggName: '남양주시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41370', sidoName: '경기도', sggName: '오산시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41390', sidoName: '경기도', sggName: '시흥시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41410', sidoName: '경기도', sggName: '군포시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41430', sidoName: '경기도', sggName: '의왕시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41450', sidoName: '경기도', sggName: '하남시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41461', sidoName: '경기도', sggName: '용인시 처인구' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41463', sidoName: '경기도', sggName: '용인시 기흥구' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41465', sidoName: '경기도', sggName: '용인시 수지구' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41480', sidoName: '경기도', sggName: '파주시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41500', sidoName: '경기도', sggName: '이천시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41550', sidoName: '경기도', sggName: '안성시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41570', sidoName: '경기도', sggName: '김포시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41590', sidoName: '경기도', sggName: '화성시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41610', sidoName: '경기도', sggName: '광주시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41630', sidoName: '경기도', sggName: '양주시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41650', sidoName: '경기도', sggName: '포천시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41670', sidoName: '경기도', sggName: '여주시' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41800', sidoName: '경기도', sggName: '연천군' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41820', sidoName: '경기도', sggName: '가평군' },
  { eduSidoCode: '27', adminSidoCode: '41', sggCode: '41830', sidoName: '경기도', sggName: '양평군' },

  // 강원특별자치도 (eduSido: 28, adminSido: 51)
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51110', sidoName: '강원특별자치도', sggName: '춘천시' },
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51130', sidoName: '강원특별자치도', sggName: '원주시' },
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51150', sidoName: '강원특별자치도', sggName: '강릉시' },
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51170', sidoName: '강원특별자치도', sggName: '동해시' },
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51190', sidoName: '강원특별자치도', sggName: '태백시' },
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51210', sidoName: '강원특별자치도', sggName: '속초시' },
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51230', sidoName: '강원특별자치도', sggName: '삼척시' },
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51720', sidoName: '강원특별자치도', sggName: '홍천군' },
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51730', sidoName: '강원특별자치도', sggName: '횡성군' },
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51750', sidoName: '강원특별자치도', sggName: '영월군' },
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51760', sidoName: '강원특별자치도', sggName: '평창군' },
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51770', sidoName: '강원특별자치도', sggName: '정선군' },
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51780', sidoName: '강원특별자치도', sggName: '철원군' },
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51790', sidoName: '강원특별자치도', sggName: '화천군' },
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51800', sidoName: '강원특별자치도', sggName: '양구군' },
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51810', sidoName: '강원특별자치도', sggName: '인제군' },
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51820', sidoName: '강원특별자치도', sggName: '고성군' },
  { eduSidoCode: '28', adminSidoCode: '51', sggCode: '51830', sidoName: '강원특별자치도', sggName: '양양군' },

  // 충청북도 (eduSido: 34, adminSido: 43)
  { eduSidoCode: '34', adminSidoCode: '43', sggCode: '43111', sidoName: '충청북도', sggName: '청주시 상당구' },
  { eduSidoCode: '34', adminSidoCode: '43', sggCode: '43112', sidoName: '충청북도', sggName: '청주시 서원구' },
  { eduSidoCode: '34', adminSidoCode: '43', sggCode: '43113', sidoName: '충청북도', sggName: '청주시 흥덕구' },
  { eduSidoCode: '34', adminSidoCode: '43', sggCode: '43114', sidoName: '충청북도', sggName: '청주시 청원구' },
  { eduSidoCode: '34', adminSidoCode: '43', sggCode: '43130', sidoName: '충청북도', sggName: '충주시' },
  { eduSidoCode: '34', adminSidoCode: '43', sggCode: '43150', sidoName: '충청북도', sggName: '제천시' },
  { eduSidoCode: '34', adminSidoCode: '43', sggCode: '43720', sidoName: '충청북도', sggName: '보은군' },
  { eduSidoCode: '34', adminSidoCode: '43', sggCode: '43730', sidoName: '충청북도', sggName: '옥천군' },
  { eduSidoCode: '34', adminSidoCode: '43', sggCode: '43740', sidoName: '충청북도', sggName: '영동군' },
  { eduSidoCode: '34', adminSidoCode: '43', sggCode: '43750', sidoName: '충청북도', sggName: '증평군' },
  { eduSidoCode: '34', adminSidoCode: '43', sggCode: '43760', sidoName: '충청북도', sggName: '진천군' },
  { eduSidoCode: '34', adminSidoCode: '43', sggCode: '43770', sidoName: '충청북도', sggName: '괴산군' },
  { eduSidoCode: '34', adminSidoCode: '43', sggCode: '43800', sidoName: '충청북도', sggName: '음성군' },
  { eduSidoCode: '34', adminSidoCode: '43', sggCode: '43810', sidoName: '충청북도', sggName: '단양군' },

  // 충청남도 (eduSido: 35, adminSido: 44)
  { eduSidoCode: '35', adminSidoCode: '44', sggCode: '44131', sidoName: '충청남도', sggName: '천안시 동남구' },
  { eduSidoCode: '35', adminSidoCode: '44', sggCode: '44133', sidoName: '충청남도', sggName: '천안시 서북구' },
  { eduSidoCode: '35', adminSidoCode: '44', sggCode: '44150', sidoName: '충청남도', sggName: '공주시' },
  { eduSidoCode: '35', adminSidoCode: '44', sggCode: '44180', sidoName: '충청남도', sggName: '보령시' },
  { eduSidoCode: '35', adminSidoCode: '44', sggCode: '44200', sidoName: '충청남도', sggName: '아산시' },
  { eduSidoCode: '35', adminSidoCode: '44', sggCode: '44210', sidoName: '충청남도', sggName: '서산시' },
  { eduSidoCode: '35', adminSidoCode: '44', sggCode: '44230', sidoName: '충청남도', sggName: '논산시' },
  { eduSidoCode: '35', adminSidoCode: '44', sggCode: '44250', sidoName: '충청남도', sggName: '계룡시' },
  { eduSidoCode: '35', adminSidoCode: '44', sggCode: '44270', sidoName: '충청남도', sggName: '당진시' },
  { eduSidoCode: '35', adminSidoCode: '44', sggCode: '44710', sidoName: '충청남도', sggName: '금산군' },
  { eduSidoCode: '35', adminSidoCode: '44', sggCode: '44760', sidoName: '충청남도', sggName: '부여군' },
  { eduSidoCode: '35', adminSidoCode: '44', sggCode: '44770', sidoName: '충청남도', sggName: '서천군' },
  { eduSidoCode: '35', adminSidoCode: '44', sggCode: '44790', sidoName: '충청남도', sggName: '청양군' },
  { eduSidoCode: '35', adminSidoCode: '44', sggCode: '44800', sidoName: '충청남도', sggName: '홍성군' },
  { eduSidoCode: '35', adminSidoCode: '44', sggCode: '44810', sidoName: '충청남도', sggName: '예산군' },
  { eduSidoCode: '35', adminSidoCode: '44', sggCode: '44825', sidoName: '충청남도', sggName: '태안군' },

  // 전북특별자치도 (eduSido: 36, adminSido: 52)
  { eduSidoCode: '36', adminSidoCode: '52', sggCode: '52111', sidoName: '전북특별자치도', sggName: '전주시 완산구' },
  { eduSidoCode: '36', adminSidoCode: '52', sggCode: '52113', sidoName: '전북특별자치도', sggName: '전주시 덕진구' },
  { eduSidoCode: '36', adminSidoCode: '52', sggCode: '52130', sidoName: '전북특별자치도', sggName: '군산시' },
  { eduSidoCode: '36', adminSidoCode: '52', sggCode: '52140', sidoName: '전북특별자치도', sggName: '익산시' },
  { eduSidoCode: '36', adminSidoCode: '52', sggCode: '52180', sidoName: '전북특별자치도', sggName: '정읍시' },
  { eduSidoCode: '36', adminSidoCode: '52', sggCode: '52190', sidoName: '전북특별자치도', sggName: '남원시' },
  { eduSidoCode: '36', adminSidoCode: '52', sggCode: '52210', sidoName: '전북특별자치도', sggName: '김제시' },
  { eduSidoCode: '36', adminSidoCode: '52', sggCode: '52710', sidoName: '전북특별자치도', sggName: '완주군' },
  { eduSidoCode: '36', adminSidoCode: '52', sggCode: '52720', sidoName: '전북특별자치도', sggName: '진안군' },
  { eduSidoCode: '36', adminSidoCode: '52', sggCode: '52730', sidoName: '전북특별자치도', sggName: '무주군' },
  { eduSidoCode: '36', adminSidoCode: '52', sggCode: '52740', sidoName: '전북특별자치도', sggName: '장수군' },
  { eduSidoCode: '36', adminSidoCode: '52', sggCode: '52750', sidoName: '전북특별자치도', sggName: '임실군' },
  { eduSidoCode: '36', adminSidoCode: '52', sggCode: '52770', sidoName: '전북특별자치도', sggName: '순창군' },
  { eduSidoCode: '36', adminSidoCode: '52', sggCode: '52790', sidoName: '전북특별자치도', sggName: '고창군' },
  { eduSidoCode: '36', adminSidoCode: '52', sggCode: '52800', sidoName: '전북특별자치도', sggName: '부안군' },

  // 전라남도 (eduSido: 37, adminSido: 46)
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46110', sidoName: '전라남도', sggName: '목포시' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46130', sidoName: '전라남도', sggName: '여수시' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46150', sidoName: '전라남도', sggName: '순천시' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46170', sidoName: '전라남도', sggName: '나주시' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46230', sidoName: '전라남도', sggName: '광양시' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46710', sidoName: '전라남도', sggName: '담양군' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46720', sidoName: '전라남도', sggName: '곡성군' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46730', sidoName: '전라남도', sggName: '구례군' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46770', sidoName: '전라남도', sggName: '고흥군' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46780', sidoName: '전라남도', sggName: '보성군' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46790', sidoName: '전라남도', sggName: '화순군' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46800', sidoName: '전라남도', sggName: '장흥군' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46810', sidoName: '전라남도', sggName: '강진군' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46820', sidoName: '전라남도', sggName: '해남군' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46830', sidoName: '전라남도', sggName: '영암군' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46840', sidoName: '전라남도', sggName: '무안군' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46860', sidoName: '전라남도', sggName: '함평군' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46870', sidoName: '전라남도', sggName: '영광군' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46880', sidoName: '전라남도', sggName: '장성군' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46890', sidoName: '전라남도', sggName: '완도군' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46900', sidoName: '전라남도', sggName: '진도군' },
  { eduSidoCode: '37', adminSidoCode: '46', sggCode: '46910', sidoName: '전라남도', sggName: '신안군' },

  // 경상북도 (eduSido: 38, adminSido: 47)
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47111', sidoName: '경상북도', sggName: '포항시 남구' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47113', sidoName: '경상북도', sggName: '포항시 북구' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47130', sidoName: '경상북도', sggName: '경주시' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47150', sidoName: '경상북도', sggName: '김천시' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47170', sidoName: '경상북도', sggName: '안동시' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47190', sidoName: '경상북도', sggName: '구미시' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47210', sidoName: '경상북도', sggName: '영주시' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47230', sidoName: '경상북도', sggName: '영천시' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47250', sidoName: '경상북도', sggName: '상주시' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47280', sidoName: '경상북도', sggName: '문경시' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47290', sidoName: '경상북도', sggName: '경산시' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47730', sidoName: '경상북도', sggName: '의성군' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47750', sidoName: '경상북도', sggName: '청송군' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47760', sidoName: '경상북도', sggName: '영양군' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47770', sidoName: '경상북도', sggName: '영덕군' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47820', sidoName: '경상북도', sggName: '청도군' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47830', sidoName: '경상북도', sggName: '고령군' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47840', sidoName: '경상북도', sggName: '성주군' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47850', sidoName: '경상북도', sggName: '칠곡군' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47900', sidoName: '경상북도', sggName: '예천군' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47920', sidoName: '경상북도', sggName: '봉화군' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47930', sidoName: '경상북도', sggName: '울진군' },
  { eduSidoCode: '38', adminSidoCode: '47', sggCode: '47940', sidoName: '경상북도', sggName: '울릉군' },

  // 경상남도 (eduSido: 39, adminSido: 48)
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48121', sidoName: '경상남도', sggName: '창원시 의창구' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48123', sidoName: '경상남도', sggName: '창원시 성산구' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48125', sidoName: '경상남도', sggName: '창원시 마산합포구' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48127', sidoName: '경상남도', sggName: '창원시 마산회원구' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48129', sidoName: '경상남도', sggName: '창원시 진해구' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48170', sidoName: '경상남도', sggName: '진주시' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48220', sidoName: '경상남도', sggName: '통영시' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48240', sidoName: '경상남도', sggName: '사천시' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48250', sidoName: '경상남도', sggName: '김해시' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48270', sidoName: '경상남도', sggName: '밀양시' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48310', sidoName: '경상남도', sggName: '거제시' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48330', sidoName: '경상남도', sggName: '양산시' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48720', sidoName: '경상남도', sggName: '의령군' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48730', sidoName: '경상남도', sggName: '함안군' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48740', sidoName: '경상남도', sggName: '창녕군' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48820', sidoName: '경상남도', sggName: '고성군' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48840', sidoName: '경상남도', sggName: '남해군' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48850', sidoName: '경상남도', sggName: '하동군' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48860', sidoName: '경상남도', sggName: '산청군' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48870', sidoName: '경상남도', sggName: '함양군' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48880', sidoName: '경상남도', sggName: '거창군' },
  { eduSidoCode: '39', adminSidoCode: '48', sggCode: '48890', sidoName: '경상남도', sggName: '합천군' },

  // 제주특별자치도 (eduSido: 40, adminSido: 50)
  { eduSidoCode: '40', adminSidoCode: '50', sggCode: '50110', sidoName: '제주특별자치도', sggName: '제주시' },
  { eduSidoCode: '40', adminSidoCode: '50', sggCode: '50130', sidoName: '제주특별자치도', sggName: '서귀포시' },
];

// 시도별 그룹핑 헬퍼 함수
export function getSigunguBySido(eduSidoCode: string): SigunguCode[] {
  return SIGUNGU_CODES.filter((sgg) => sgg.eduSidoCode === eduSidoCode);
}

/**
 * API 호출 시 사용할 시도코드 반환
 * 유치원 알리미 API는 행정안전부 시도코드를 사용합니다.
 * (sggCode의 앞 2자리와 동일)
 */
export function getApiSidoCode(sigungu: SigunguCode): string {
  return sigungu.adminSidoCode;
}

// 전체 시군구 수
export const TOTAL_SIGUNGU_COUNT = SIGUNGU_CODES.length;
