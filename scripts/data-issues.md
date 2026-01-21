# 데이터 품질 이슈 및 수정 사항

## 발견된 이슈

### 1. sido_code 체계 불일치
- **현상**: sido_code는 교육부 코드, sigungu_code는 행정안전부 코드
- **영향**: 검색 로직 복잡화
- **해결 방안**:
  - 옵션 A: sido_code를 adminSidoCode로 변경 (sigungu_code[:2]와 일치)
  - 옵션 B: 현행 유지하고 매핑 테이블 활용

### 2. area_per_child 이상치
- **현상**: 100㎡ 초과 221개 (최대 6,762.7㎡)
- **원인**: 병설유치원의 초등학교 시설 포함
- **해결 방안**:
  - 50㎡ 초과 시 null 처리
  - 또는 상한선(50㎡) 적용

### 3. 정원 0인 유치원
- **현상**: 8개 (0.10%)
- **원인**: 휴원, 데이터 미입력
- **해결 방안**: 검색 결과에서 제외 옵션

## 코드 수정 필요

### sync-kindergartens.ts 수정

```typescript
// sido_code를 행정안전부 코드로 변경
sido_code: sigungu.adminSidoCode,  // 기존: sigungu.eduSidoCode

// area_per_child 이상치 처리
const areaPerChild = capacity > 0
  ? Math.round((totalArea / capacity) * 10) / 10
  : 0;
// 50㎡ 초과시 null 처리
const normalizedAreaPerChild = areaPerChild > 50 ? null : areaPerChild;
```

## 데이터 품질 요약

| 지표 | 값 | 평가 |
|-----|---|-----|
| 전체 레코드 | 7,950개 | 양호 |
| 필수 필드 완성도 | 100% | 양호 |
| 정원 0 | 0.10% | 허용 |
| 면적 이상치 | 2.78% | 수정 필요 |
| 급식유형 누락 | 2.49% | 허용 |
