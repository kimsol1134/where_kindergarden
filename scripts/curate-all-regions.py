#!/usr/bin/env python3
"""
전체 지역 AI 큐레이션 스크립트
패턴 기반 필터(filter-reviews.ts)로 잡지 못한 맥락 기반 스팸을 제거합니다.

보수적 접근: 명확한 스팸만 제거, 애매한 것은 유지
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path


# =============================================================================
# 맥락 기반 스팸 판단 로직
# (filter-reviews.ts의 패턴 기반과 겹치지 않는 추가 규칙)
# =============================================================================

# 제목에서 명확한 스팸 (유치원 관련성 0%)
TITLE_SPAM_EXACT = [
    # 카페/맛집/음식점
    re.compile(r'카페\s*(붐비다|송도|아트리움|잇슈|리아커피|향옥)', re.I),
    re.compile(r'(죽도시장|안강)\s*(맛집|밀면)', re.I),
    re.compile(r'(숯불닭구이|감자탕|덮밥|석갈비|브런치|통닭|라멘|쭈꾸미|돈까스|청국장|아구찜|도우넛|칼국수|쌈밥|고기맛있는)', re.I),
    re.compile(r'맛집\s*(후기|방문|추천|뿌시기|솔직)', re.I),
    re.compile(r'(맛집|카페)\s*\S+\s*(후기|방문)', re.I),
    re.compile(r'과메기\s*맛집', re.I),
    re.compile(r'회일번지|오리박사|삼덕통닭|금문왕손|쌍촌본가|고이지아나', re.I),

    # 업체 광고
    re.compile(r'(푸드트럭|커피차)\s*(가격|후기|이벤트)', re.I),
    re.compile(r'(서커스|벌룬쇼|마술)\s*(추천|섭외|후기)', re.I),
    re.compile(r'(천연염색|비누만들기)\s*체험', re.I),
    re.compile(r'NST\s*에코그린|새집증후군\s*시공', re.I),
    re.compile(r'교사교육.*러닝온', re.I),
    re.compile(r'VR\s*댄스\s*추천', re.I),
    re.compile(r'원생모집대행', re.I),
    re.compile(r'댄스\s*스튜디오.*이용\s*후기', re.I),

    # 여행/관광
    re.compile(r'(울릉도|독도)\s*여행', re.I),
    re.compile(r'BMW\s*(망년회|모임)', re.I),
    re.compile(r'천주교\s*사회복지사', re.I),
    re.compile(r'템플스테이', re.I),

    # 학원 홍보 블로그
    re.compile(r'(기탄사고력|캐슬골드)\s*학원.*오픈', re.I),
    re.compile(r'(놀작끌레르|브레인드로)\s*미술학원\s*(전시|수업)', re.I),
    re.compile(r'시매쓰\s*(관악|청명)\s*학원', re.I),
    re.compile(r'(한결태권도|ITA\s*일동태권도)', re.I),
    re.compile(r'(글로리아|음악)\s*학원\s*(실제|찐)\s*후기', re.I),
    re.compile(r'시지아동미술전문학원', re.I),

    # 이벤트/레크레이션 업체
    re.compile(r'전문\s*(이벤트업체|MC)\s*섭외', re.I),
    re.compile(r'레크레이션\s*(반야월|운동회)', re.I),

    # 키즈카페/키즈풀
    re.compile(r'(키즈카페|키즈풀)\s*(넓고|체험|공간대여|대관)', re.I),
    re.compile(r'(너티차일드|탄탄비키즈풀)', re.I),

    # 성당순례/종교
    re.compile(r'성당순례|미사시간', re.I),
]

# 소스명으로 판단되는 업체 블로그
SPAM_SOURCE_NAMES = [
    '푸드트럭', '봉봉푸드트럭', 'VRR 푸드트럭',
    '교육 인형극 전문가', '인형극단 콜럼버스', '어린이 인형극 전문',
    '어린이 공연 마술', '유인 엔터', '리치매직', '샤인매직',
    '울릉도 섬여행 전문여행사',
    '오프라인 학원홍보 키움기획',
    '기탄사고력교실', '기탄사고력황금캐슬골드학원',
    '놀작끌레르미술학원', '브레인드로미술학원',
    '시매쓰 관악 청명학원',
    'ITA 일동태권도', '학정동태권도', '동아대박사 한결태권도',
    '글로리아 음악학원',
    '시지아동미술전문학원',
    '창동간호학원',
]

# 제목+snippet에서 유치원 관련성이 없으면 제거하는 키워드
CONTEXT_SPAM_KEYWORDS = {
    # keyword: (min_matches, description)
    '조합놀이대': (1, '놀이기구 시공'),
    '모래놀이장 덮개': (1, '시공 업체'),
    '앵글코리아': (1, '선반 시공'),
    '자석낚시놀이제작': (1, '교구 업체'),
    '간판 제작 시공': (1, '간판 업체'),
    '계단 반사거울 설치': (1, '시설 업체'),
    '전동 어닝': (1, '시공 업체'),
}


def is_contextual_spam(review):
    """맥락 기반 스팸 판단. (title, snippet, sourceName 검사)"""
    title = review.get('title', '')
    snippet = review.get('snippet', '')
    source_name = review.get('sourceName', '')
    summary = review.get('summary', '')
    text = f"{title} {snippet} {summary}"

    # 1. 제목 패턴 매칭
    for pattern in TITLE_SPAM_EXACT:
        if pattern.search(title):
            return True, f"제목 스팸: {pattern.pattern[:40]}"

    # 2. 소스명 기반
    for spam_source in SPAM_SOURCE_NAMES:
        if spam_source.lower() in source_name.lower():
            # 예외: 유치원 자체 블로그인 경우 유지
            if '유치원' in source_name and '학원' not in source_name:
                continue
            return True, f"업체 블로그: {spam_source}"

    # 3. 키워드 + 유치원 관련성 없음
    for keyword, (min_matches, desc) in CONTEXT_SPAM_KEYWORDS.items():
        if keyword in text:
            # 유치원 관련 맥락이 있는지 확인
            kg_context = sum(1 for kw in ['후기', '다녀', '보내', '입학', '설명회', '선생님', '교육', '급식']
                           if kw in text)
            if kg_context < 2:
                return True, f"업체 광고: {desc}"

    # 4. 카페/맛집 리뷰 (유치원은 위치 참조로만 언급)
    if any(k in title for k in ['맛집', '카페', '맛있는', '먹방', '맛있어요']):
        # 유치원이 위치 참조로만 나온 경우
        if '유치원' not in title:
            return True, "맛집/카페 후기 (유치원 위치만 언급)"

    # 5. 뮤지컬/공연 관람 후기
    if '뮤지컬' in title and '커튼콜' in title:
        return True, "뮤지컬 관람 후기"

    return False, ""


def curate_file(file_path, dry_run=False):
    """파일 큐레이션 실행"""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    original_total = data.get('totalCount', 0)
    original_kg = data.get('kindergartenCount', 0)

    removed = []
    new_reviews = {}

    for kg_id, reviews in data.get('reviews', {}).items():
        kept = []
        for review in reviews:
            is_spam, reason = is_contextual_spam(review)
            if is_spam:
                removed.append({
                    'id': review.get('id', '?'),
                    'title': review.get('title', '?')[:60],
                    'reason': reason
                })
            else:
                kept.append(review)
        if kept:
            new_reviews[kg_id] = kept

    new_total = sum(len(r) for r in new_reviews.values())
    new_kg = len(new_reviews)

    print(f"\n--- {file_path.name} ---")
    print(f"  원본: {original_total}건 ({original_kg}개 유치원)")
    print(f"  제거: {len(removed)}건")
    print(f"  남음: {new_total}건 ({new_kg}개 유치원)")

    if removed:
        for i, item in enumerate(removed[:10], 1):
            print(f"    {i}. [{item['id']}] {item['title']}")
            print(f"       사유: {item['reason']}")
        if len(removed) > 10:
            print(f"    ... 외 {len(removed) - 10}건")

    if not dry_run and removed:
        data['reviews'] = new_reviews
        data['totalCount'] = new_total
        data['kindergartenCount'] = new_kg
        data['lastCuratedAt'] = datetime.now(timezone.utc).isoformat()
        data['version'] = datetime.now(timezone.utc).strftime('%Y-%m-%d')

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"  -> 저장 완료")

    return len(removed)


def main():
    import sys
    dry_run = '--dry-run' in sys.argv

    base = Path('/Users/solkim/Dev/where_kindergarden-review-cleanup/public/data/reviews')
    files = sorted(base.glob('[0-9][0-9].json'))

    print("=== 전체 지역 맥락 기반 큐레이션 ===")
    print(f"모드: {'미리보기 (dry-run)' if dry_run else '실제 수정'}")
    print(f"대상: {len(files)}개 파일")

    total_removed = 0
    for f in files:
        if f.name == 'unknown.json':
            continue
        total_removed += curate_file(f, dry_run)

    print(f"\n=== 총 제거: {total_removed}건 ===")
    if dry_run:
        print("(dry-run 모드: 파일 수정 없음)")


if __name__ == '__main__':
    main()
