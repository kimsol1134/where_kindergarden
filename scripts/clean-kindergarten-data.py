#!/usr/bin/env python3
"""
유치원 데이터 정제 스크립트
- raw_data에서 필요한 필드 추출
- 불필요한 필드 제거
- 94MB → ~4-5MB로 경량화
"""

import json
from pathlib import Path
from datetime import datetime


def parse_int(value, default=0):
    """안전하게 정수로 변환"""
    if value is None:
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def parse_area(value):
    """면적 문자열에서 숫자 추출 (예: '269㎡' → 269)"""
    if value is None:
        return None
    try:
        return int(value.replace('㎡', '').replace(',', '').strip())
    except (ValueError, AttributeError):
        return None


def extract_year(value):
    """연도 추출 (예: '1993년' → 1993)"""
    if value is None:
        return None
    try:
        return int(value.replace('년', '').strip())
    except (ValueError, AttributeError):
        return None


def clean_kindergarten(item):
    """단일 유치원 데이터 정제"""
    raw = item.get('raw_data', {}) or {}

    # 각 API 데이터 추출
    basic = raw.get('basicInfo2') or {}
    building = raw.get('building') or {}
    teachers = raw.get('teachersInfo') or {}
    class_area = raw.get('classArea') or {}
    safety = raw.get('safetyEdu') or {}
    year_work = raw.get('yearOfWork') or {}

    # 정제된 데이터 구성
    cleaned = {
        # 기본 정보 (기존 top-level 유지)
        'kindercode': item.get('kindercode'),
        'name': item.get('name'),
        'address': item.get('address'),
        'lat': item.get('lat'),
        'lng': item.get('lng'),
        'type': item.get('type'),
        'phone': item.get('phone'),
        'homepage': item.get('homepage'),
        'operation_hours': item.get('operation_hours'),

        # 지역 코드
        'sido_code': item.get('sido_code'),
        'sigungu_code': item.get('sigungu_code'),

        # 정원/현원 (기존)
        'capacity': item.get('capacity'),
        'current_count': item.get('current_count'),

        # 연령별 학급수 (raw_data에서 추출)
        'class_count_age3': parse_int(basic.get('clcnt3')),
        'class_count_age4': parse_int(basic.get('clcnt4')),
        'class_count_age5': parse_int(basic.get('clcnt5')),

        # 연령별 정원 (raw_data에서 추출)
        'capacity_age3': parse_int(basic.get('ppcnt3')),
        'capacity_age4': parse_int(basic.get('ppcnt4')),
        'capacity_age5': parse_int(basic.get('ppcnt5')),

        # 연령별 현원 (raw_data에서 추출)
        'current_age3': parse_int(basic.get('ag3fpcnt')),
        'current_age4': parse_int(basic.get('ag4fpcnt')),
        'current_age5': parse_int(basic.get('ag5fpcnt')),

        # 혼합반 (raw_data에서 추출)
        'class_count_mix': parse_int(basic.get('mixclcnt')),
        'capacity_mix': parse_int(basic.get('mixppcnt')),
        'current_mix': parse_int(basic.get('mixfpcnt')),

        # 특수학급 (raw_data에서 추출)
        'capacity_special': parse_int(basic.get('shppcnt')),
        'current_special': parse_int(basic.get('spcnfpcnt')),

        # 설립일 (raw_data에서 추출)
        'establish_date': basic.get('edate'),

        # 서비스 정보 (기존)
        'has_bus': item.get('has_bus'),
        'bus_count': item.get('bus_count'),
        'meal_type': item.get('meal_type'),
        'has_after_school': item.get('has_after_school'),

        # 시설 정보 (기존 + raw_data에서 추출)
        'area_per_child': item.get('area_per_child'),
        'has_playground': item.get('has_playground'),
        'building_year': extract_year(building.get('archyy')),
        'floor_info': building.get('floorcnt'),
        'classroom_area': parse_area(class_area.get('clsrarea')),
        'indoor_playground_area': parse_area(class_area.get('phgrindrarea')),
        'outdoor_playground_area': parse_area(class_area.get('otsparea')),

        # 교사 정보 (raw_data에서 추출)
        'teacher_count': parse_int(teachers.get('gnrl_thcnt')),
        'senior_teacher_count': parse_int(year_work.get('yy6_abv_thcnt')),

        # 안전 정보 (raw_data에서 추출)
        'cctv_count': parse_int(safety.get('cctv_ist_total')),
    }

    return cleaned


def main():
    # 입력 파일 경로 (legacy 폴더에서 원본 데이터 로드)
    input_path = Path(__file__).parent / 'data-output' / 'legacy' / 'kindergartens-full-2026-01-21.json'

    # 출력 파일 경로
    output_dir = Path(__file__).parent / 'data-output'
    output_path = output_dir / 'kindergartens-cleaned.json'

    print(f'입력 파일: {input_path}')
    print(f'출력 파일: {output_path}')

    # 데이터 로드
    print('\n데이터 로드 중...')
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f'총 {len(data)}개 유치원 데이터')

    # 데이터 정제
    print('\n데이터 정제 중...')
    cleaned_data = [clean_kindergarten(item) for item in data]

    # 저장
    print('\n저장 중...')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(cleaned_data, f, ensure_ascii=False, indent=2)

    # 결과 확인
    input_size = input_path.stat().st_size / 1024 / 1024
    output_size = output_path.stat().st_size / 1024 / 1024

    print(f'\n=== 결과 ===')
    print(f'원본 크기: {input_size:.1f} MB')
    print(f'정제 후 크기: {output_size:.1f} MB')
    print(f'절감률: {(1 - output_size/input_size) * 100:.1f}%')

    # 샘플 출력
    print(f'\n=== 샘플 데이터 (첫 번째) ===')
    sample = cleaned_data[0]
    for k, v in sample.items():
        print(f'  {k}: {v}')

    # 필드 통계
    print(f'\n=== 필드별 null 개수 ===')
    fields_to_check = [
        'teacher_count', 'cctv_count', 'building_year',
        'classroom_area', 'outdoor_playground_area', 'senior_teacher_count'
    ]
    for field in fields_to_check:
        null_count = sum(1 for d in cleaned_data if d.get(field) is None or d.get(field) == 0)
        print(f'  {field}: {null_count}개 null/0')


if __name__ == '__main__':
    main()
