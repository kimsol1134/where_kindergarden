#!/usr/bin/env python3
"""4차 큐레이션 Phase 1: 자동 패턴 스팸 제거"""
import json
import os
import glob

reviews_dir = 'public/data/reviews'

# Collect all spam IDs by scanning
spam_ids = set()

for sido in sorted(os.listdir(reviews_dir)):
    dpath = os.path.join(reviews_dir, sido)
    if not os.path.isdir(dpath) or not sido.isdigit():
        continue
    for sf in sorted(glob.glob(os.path.join(dpath, '*.json'))):
        d = json.load(open(sf))
        for kid, revs in d.get('reviews', {}).items():
            for r in revs:
                t = r.get('title', '')
                rid = r['id']

                # === ACADEMY (not English kindergartens) ===
                if any(p in t for p in ['미술학원', '수학학원', '바둑학원', '줄넘기학원',
                                        '음악학원', '피아노학원', '코딩학원', '발레학원',
                                        '검도', '수학 학원']):
                    spam_ids.add(rid)
                    continue
                # Foreign language/language academies without kindergarten
                if ('외국어학원' in t or ('어학원' in t and '유치원' not in t and '영유' not in t)):
                    spam_ids.add(rid)
                    continue

                # === INFO COMPILATION ===
                if any(p in t for p in ['학원 정보 총정리', '학원 정보 모음',
                                        '학원정보(+', '학원가 ']):
                    spam_ids.add(rid)
                    continue

                # === TRAVEL / HIKING ===
                if any(p in t for p in ['km(', '코스,', '산행', '등산로', '트레킹', '둘레길']):
                    spam_ids.add(rid)
                    continue
                if '여행' in t and '유치원' not in t:
                    spam_ids.add(rid)
                    continue

                # === RESTAURANT ===
                if any(p in t for p in ['횟집', '곱창', '삼겹살', '꼬목살', '샤브샤브']):
                    spam_ids.add(rid)
                    continue

                # === HOSPITAL / MEDICAL ===
                if any(p in t for p in ['아동병원', '소아과 ', '입원 후기']):
                    spam_ids.add(rid)
                    continue

                # === CAMPING PRODUCTS ===
                if any(p in t for p in ['캠핑의자', '캠핑 의자', '캠핑체어', '캠핑 체어']):
                    spam_ids.add(rid)
                    continue

                # === EVENT/PERFORMANCE SERVICES ===
                if any(p in t for p in ['출장 가능', '전국 출장', '벌룬쇼', '출장마술']):
                    spam_ids.add(rid)
                    continue

                # === TV/MEDIA ===
                if ('MBC' in t or 'KBS' in t or 'SBS' in t) and '유치원' not in t:
                    spam_ids.add(rid)
                    continue

                # === PET / CRAFT ===
                if any(p in t for p in ['반려견', '애견', '공방 소개']):
                    spam_ids.add(rid)
                    continue

                # === CHURCH/TEMPLE VISITS (not kindergarten) ===
                if any(p in t for p in ['수도원', '바티칸']) and '유치원' not in t:
                    spam_ids.add(rid)
                    continue
                if any(p in t for p in ['사찰 추천', '사찰 다녀']) and '유치원' not in t:
                    spam_ids.add(rid)
                    continue
                if any(p in t for p in ['예산성당', '여주성당', '이천성당']) and '유치원' not in t:
                    spam_ids.add(rid)
                    continue

                # === PHOTO ZONE / FLOWER BUSINESS ===
                if any(p in t for p in ['자이언트플라워', '카페포토존', '포토존 제작']):
                    spam_ids.add(rid)
                    continue

                # === PHOTO STUDIO ===
                if any(p in t for p in ['사진관 ', '증명사진', '여권사진']):
                    spam_ids.add(rid)
                    continue

                # === GRADUATE SCHOOL ===
                if '대학원' in t:
                    spam_ids.add(rid)
                    continue

                # === HIGH SCHOOL ===
                if any(p in t for p in ['영화고', '고등학교', '중학교']):
                    spam_ids.add(rid)
                    continue

                # === ELEMENTARY ACADEMY ===
                if any(p in t for p in ['초등영어 ', '초등 영어']):
                    spam_ids.add(rid)
                    continue

                # === APARTMENT/REAL ESTATE with 학원가 ===
                if '아파트' in t and '학원가' in t:
                    spam_ids.add(rid)
                    continue

                # === GARDEN/PARK (not kindergarten) ===
                if '베고니아' in t and '유치원' not in t:
                    spam_ids.add(rid)
                    continue

                # === FESTIVAL (not kindergarten) ===
                if '축제' in t and '유치원' not in t:
                    spam_ids.add(rid)
                    continue

                # === VOLUNTEER ===
                if '자원봉사' in t and '유치원' not in t:
                    spam_ids.add(rid)
                    continue

                # === MISC UNRELATED ===
                if '아시아프' in t:
                    spam_ids.add(rid)
                    continue

print(f"Total spam IDs to remove: {len(spam_ids)}")

# Now remove from all sigungu files
total_removed = 0
files_modified = 0

for sido in sorted(os.listdir(reviews_dir)):
    dpath = os.path.join(reviews_dir, sido)
    if not os.path.isdir(dpath) or not sido.isdigit():
        continue
    for sf in sorted(glob.glob(os.path.join(dpath, '*.json'))):
        d = json.load(open(sf))
        removed_in_file = 0
        for kid in list(d['reviews'].keys()):
            original_count = len(d['reviews'][kid])
            d['reviews'][kid] = [r for r in d['reviews'][kid] if r['id'] not in spam_ids]
            removed_in_file += original_count - len(d['reviews'][kid])
            if not d['reviews'][kid]:
                del d['reviews'][kid]

        if removed_in_file > 0:
            d['totalCount'] = sum(len(v) for v in d['reviews'].values())
            d['kindergartenCount'] = len(d['reviews'])
            d['version'] = '2026-02-18'
            json.dump(d, open(sf, 'w'), ensure_ascii=False, indent=2)
            print(f"  {sf.replace('public/data/reviews/', '')}: removed {removed_in_file}")
            total_removed += removed_in_file
            files_modified += 1

print(f"\nTotal removed: {total_removed} reviews from {files_modified} files")
print(f"Remaining: {2154 - total_removed} reviews")
