import { describe, expect, it } from 'vitest';
import { extractReadableTextFromHtml } from '@/lib/utils/review-html';
import {
  assessReviewBody,
  assessReviewFallback,
  assessReviewMetadata,
  buildKindergartenCoreName,
  classifyReviewWithoutBody,
  isGenericCoreName,
  resolveUncertainReviewStatus,
} from '@/lib/utils/review-verification';

const baseContext = {
  kindergartenId: 'kid-1',
  kindergartenName: '행복한유치원',
  kindergartenAddress: '서울특별시 강남구 테헤란로 1',
  sidoCode: '11',
  sigunguCode: '11680',
  coreNameFrequency: 4,
};

describe('review verification metadata', () => {
  it('구조화된 Studyholic 리뷰 row 는 source evidence 만으로 verified 처리한다', () => {
    const result = assessReviewMetadata(
      {
        title: '계성유치원 리뷰',
        snippet: '인성을 중요시하는 유치원 | 서울 용산구 | 별점 ★★★★★',
        source: 'studyholic',
        evidenceType: 'structured_list_row',
        rating: 5,
        structuredFields: {
          institutionName: '계성유치원',
          reviewTitle: '인성을 중요시하는 유치원',
          region: '서울',
          sigungu: '용산구',
          rating: 5,
        },
      },
      {
        ...baseContext,
        kindergartenName: '계성유치원',
        kindergartenAddress: '서울특별시 용산구 산천동 1',
        sigunguCode: '11170',
        coreNameFrequency: 1,
      }
    );

    expect(result.decision).toBe('verified');
    expect(result.reasons[0]).toContain('구조화 리뷰 목록');
  });

  it('구조화된 row 의 기관명이 다르면 mismatch reject 한다', () => {
    const result = assessReviewMetadata(
      {
        title: '행복한유치원 리뷰',
        snippet: '좋은 유치원',
        source: 'studyholic',
        evidenceType: 'structured_list_row',
        rating: 5,
        structuredFields: {
          institutionName: '무지개유치원',
          reviewTitle: '좋은 유치원',
          rating: 5,
        },
      },
      {
        ...baseContext,
        kindergartenName: '행복한유치원',
        coreNameFrequency: 1,
      }
    );

    expect(result.decision).toBe('reject');
    expect(result.preliminaryStatus).toBe('mismatch');
  });

  it('정식명과 후기 신호가 있으면 metadata만으로 verified 처리한다', () => {
    const result = assessReviewMetadata(
      {
        title: '행복한유치원 입학설명회 후기',
        snippet: '재원생 학부모가 급식과 선생님 분위기를 자세히 적은 글',
      },
      {
        ...baseContext,
        coreNameFrequency: 1,
      }
    );

    expect(result.decision).toBe('verified');
    expect(result.preliminaryStatus).toBe('verified');
    expect(result.signals.directNameMatch).toBe(true);
  });

  it('longform_post 는 1인칭 경험과 학교 상세가 없으면 자동 verified 하지 않는다', () => {
    const result = assessReviewMetadata(
      {
        title: '옥인유치원 행사 후기',
        snippet: '옥인유치원으로 찾아가는 공연 후기입니다.',
        source: 'naver_blog',
        evidenceType: 'longform_post',
      },
      {
        ...baseContext,
        kindergartenName: '옥인유치원',
        kindergartenAddress: '서울특별시 종로구 자하문로 69',
        sigunguCode: '11110',
        coreNameFrequency: 1,
      }
    );

    expect(result.decision).toBe('needs_body_check');
  });

  it('generic core name만 보이면 body check 대상으로 남긴다', () => {
    const result = assessReviewMetadata(
      {
        title: '행복한 보내보니 어떤가요?',
        snippet: '강남 쪽 유치원 고민 중인데 추천 부탁드려요.',
      },
      baseContext
    );

    expect(result.decision).toBe('needs_body_check');
    expect(result.whyFlagged).toContain('generic core name만 매칭됨');
  });

  it('질문/정보글이면서 타겟 직접 언급이 없으면 generic_info로 reject 한다', () => {
    const result = assessReviewMetadata(
      {
        title: '강남 유치원 총정리',
        snippet: '추천해주세요. 모집요강과 지원금 정보를 모았습니다.',
      },
      baseContext
    );

    expect(result.decision).toBe('reject');
    expect(result.preliminaryStatus).toBe('generic_info');
  });

  it('여러 유치원을 나열하는 비교글은 generic_info로 reject 한다', () => {
    const result = assessReviewMetadata(
      {
        title: '안양 유치원 비교',
        snippet:
          '비산성모유치원 / 아이비유치원 / 창의나라유치원 / 안양유치원 설명회 일정을 정리했어요.',
      },
      {
        ...baseContext,
        kindergartenName: '행복한유치원',
        coreNameFrequency: 1,
      }
    );

    expect(result.decision).toBe('reject');
    expect(result.preliminaryStatus).toBe('generic_info');
  });
});

describe('review verification body', () => {
  it('본문에서 다른 유치원만 드러나면 mismatch 처리한다', () => {
    const result = assessReviewBody(
      {
        title: '입학설명회 다녀온 후기',
        snippet: '강남 유치원 고민 중이에요.',
        bodyText:
          '사실 이번 글은 무지개유치원 설명회 후기예요. 선생님 설명이 자세했고 급식 안내도 들었습니다.',
      },
      baseContext
    );

    expect(result.finalStatus).toBe('mismatch');
  });

  it('업체 홍보 본문은 advertorial 처리한다', () => {
    const result = assessReviewBody(
      {
        title: '행복한유치원 행사 후기',
        snippet: '출장 공연 업체 추천',
        bodyText:
          '유치원 행사 전문 업체 포트폴리오입니다. 버블쇼 출장 섭외와 상담 문의는 아래 연락처로 주세요.',
      },
      baseContext
    );

    expect(result.finalStatus).toBe('advertorial');
  });

  it('타겟 유치원과 구체적 경험이 본문에 있으면 verified 처리한다', () => {
    const result = assessReviewBody(
      {
        title: '행복한유치원 보내보니',
        snippet: '강남에서 고민하다 선택한 곳',
        bodyText:
          '행복한유치원에 올해 아이를 보내고 있어요. 선생님 피드백이 꼼꼼하고 급식이 깔끔했습니다. 통학버스 동선과 방과후 프로그램도 만족스러웠어요.',
      },
      baseContext
    );

    expect(result.finalStatus).toBe('verified');
  });
});

describe('review verification fallback', () => {
  it('기관 전용 리뷰 페이지는 본문이 막혀도 fallback verified 처리한다', () => {
    const result = assessReviewFallback(
      {
        title: '[계성유치원 리뷰] 인성을 중요시하는 유치원',
        snippet: '지역: 서울 용산구 | 시설유무: 실외놀이터, 강당 | 전체만족도: ★★★★★',
        source: 'studyholic',
        evidenceType: 'native_review_page',
        rating: 5,
        structuredFields: {
          institutionName: '계성유치원',
          reviewTitle: '인성을 중요시하는 유치원',
          region: '서울 용산구',
          rating: 5,
          시설유무: '실외놀이터, 강당',
        },
      },
      {
        ...baseContext,
        kindergartenName: '계성유치원',
        kindergartenAddress: '서울특별시 용산구 산천동 1',
        sigunguCode: '11170',
        coreNameFrequency: 1,
      }
    );

    expect(result.finalStatus).toBe('verified');
    expect(result.reasons[0]).toContain('기관 전용 리뷰 페이지');
  });

  it('접근 제한 카페글도 제목/snippet이 명확하면 verified 처리한다', () => {
    const result = assessReviewFallback(
      {
        title: '성동구 성수동 서울경동유치원 후기 - 선생님도 친절, 체계적인 교육이 있는 유치원!',
        snippet:
          '[ 서울경동유치원 종합평가 ] 성동구에 재학하는 유치원생이라면 모두가 아는 곳으로 시설도 좋고 선생님들도 매우 친절합니다.',
      },
      {
        ...baseContext,
        kindergartenName: '서울경동유치원',
        kindergartenAddress: '서울특별시 성동구 광나루로 1',
        coreNameFrequency: 1,
      }
    );

    expect(result.finalStatus).toBe('verified');
  });

  it('명단 공개/정리글은 generic_info 처리한다', () => {
    const result = assessReviewFallback(
      {
        title: '비리 유치원은 더이상 No! 서울 안심 유치원 명단 공개',
        snippet:
          '서울 안심 유치원에 대한 별점 정보, 후기가 있는 곳들의 명단을 공개합니다.',
      },
      {
        ...baseContext,
        kindergartenName: '서울경동유치원',
        coreNameFrequency: 1,
      }
    );

    expect(result.finalStatus).toBe('generic_info');
  });

  it('본문 없이도 비교/정보글은 shipped-safe generic_info로 분류한다', () => {
    const result = classifyReviewWithoutBody(
      {
        title: '안양 유치원 입학 가이드',
        snippet:
          '비산성모유치원 / 아이비유치원 / 창의나라유치원 / 안양유치원 우선모집 일정을 정리합니다.',
      },
      {
        ...baseContext,
        kindergartenName: '행복한유치원',
        coreNameFrequency: 1,
      }
    );

    expect(result.finalStatus).toBe('generic_info');
  });

  it('부동산 실거주 글은 advertorial 처리한다', () => {
    const result = assessReviewFallback(
      {
        title: '용산 산천동 리버힐삼성 아파트 실거주 후기',
        snippet:
          '일민, 계성유치원 및 유명 영어유치원 역시 단지 상가 및 주변에 있습니다.',
      },
      baseContext
    );

    expect(result.finalStatus).toBe('advertorial');
  });
});

describe('review verification uncertain resolution', () => {
  it('access wall only uncertain은 유지한다', () => {
    const resolution = resolveUncertainReviewStatus(
      'uncertain',
      {
        directNameMatch: true,
        coreNameMatch: true,
        genericCoreOnly: false,
        genericCoreName: false,
        locationValid: true,
        contentType: 'unknown',
        reviewIndicators: [],
        firstHandIndicators: [],
        schoolDetailIndicators: [],
        genericInfoIndicators: [],
        advertorialIndicators: [],
        institutionMentions: ['행복한유치원'],
        otherInstitutionMentions: [],
      },
      ['본문 접근 제한/카페 로그인 화면: 로그인필요']
    );

    expect(resolution.status).toBe('uncertain');
  });

  it('negative evidence가 남은 uncertain은 remove 상태로 승격한다', () => {
    const resolution = resolveUncertainReviewStatus(
      'uncertain',
      {
        directNameMatch: false,
        coreNameMatch: true,
        genericCoreOnly: true,
        genericCoreName: true,
        locationValid: true,
        contentType: 'info_list',
        reviewIndicators: [],
        firstHandIndicators: [],
        schoolDetailIndicators: [],
        genericInfoIndicators: ['info_list'],
        advertorialIndicators: [],
        institutionMentions: ['행복한유치원', '무지개유치원', '창의나라유치원'],
        otherInstitutionMentions: ['무지개유치원', '창의나라유치원'],
      },
      ['fallback에서도 확정하기 어려움']
    );

    expect(resolution.status).toBe('generic_info');
  });
});

describe('review html utilities', () => {
  it('대표 컨테이너에서 본문 텍스트를 추출한다', () => {
    const text = extractReadableTextFromHtml(`
      <html>
        <body>
          <div class="se-main-container">
            <p>행복한유치원 설명회 다녀왔어요.</p>
            <p>급식과 선생님 이야기가 자세했습니다.</p>
          </div>
        </body>
      </html>
    `);

    expect(text).toContain('행복한유치원 설명회 다녀왔어요.');
    expect(text).toContain('급식과 선생님 이야기가 자세했습니다.');
  });
});

describe('review verification naming helpers', () => {
  it('병설 suffix를 제거해 core name을 만든다', () => {
    expect(buildKindergartenCoreName('서울재동초등학교병설유치원')).toBe(
      '서울재동초등학교'
    );
  });

  it('반복되는 짧은 core name은 generic 으로 본다', () => {
    expect(isGenericCoreName('행복한', 4)).toBe(true);
  });
});
