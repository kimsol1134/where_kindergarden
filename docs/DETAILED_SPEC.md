# 우리동네 유치원 - 상세 기술 스펙

> **서비스명**: 우리동네 유치원
> **한 줄 요약**: 모바일에서 현재 위치 기반으로 주변 유치원/어린이집을 자동 수집하고, 비교표를 원클릭으로 생성하는 서비스

---

## 1. 기술 스택

### 프론트엔드

| 기술 | 버전 | 선택 이유 |
|-----|-----|---------|
| **Next.js** | 16.1.x | CVE-2025-66478 보안 패치, Cache Components, Turbopack 기본 |
| **React** | 19.2.x | Next.js 16 필수 요구사항, View Transitions 지원 |
| **Node.js** | 20.9+ | Next.js 16 필수 요구사항 (Node 18 지원 종료) |
| **TypeScript** | 5.1.0+ | Next.js 16 필수 요구사항 |
| **TailwindCSS** | 4.x | 모바일 우선 반응형, 유틸리티 클래스 |
| **shadcn/ui + Radix** | latest | 접근성 내장, 고품질 컴포넌트 |
| **Zustand** | 5.x | 가벼운 상태관리 (URL과 보조적 사용) |

### Next.js 16 보안 및 주요 기능

#### 보안 업데이트 (필수)

2025년 12월 **CVE-2025-66478** (CVSS 10.0) 발견으로 인해 Next.js 16.0.10+ 또는 16.1.0+ 사용 필수:
- React Server Components(RSC) "Flight" 프로토콜의 역직렬화 취약점
- 원격 코드 실행(RCE) 가능한 치명적 보안 이슈
- React 19.2.1+ 함께 업그레이드 필요

#### 새로운 보안 설정

```typescript
// next.config.ts
const nextConfig = {
  images: {
    dangerouslyAllowLocalIP: false,  // 로컬 IP 최적화 차단 (기본값)
    maximumRedirects: 3,              // 리다이렉트 제한 (기본값)
    remotePatterns: [                 // domains 대신 사용 (더 안전)
      { protocol: 'https', hostname: '**.example.com' }
    ]
  }
};
```

#### 활용할 주요 기능

| 기능 | 설명 | 활용 |
|-----|-----|-----|
| **Cache Components** | `"use cache"` 지시어로 명시적 캐싱 | API 응답 캐싱 |
| **Turbopack** | 기본 번들러, 2-5배 빠른 빌드 | 개발/빌드 성능 |
| **React Compiler** | 자동 메모이제이션 | 성능 최적화 |
| **proxy.ts** | middleware.ts 대체 | 요청 인터셉트 |
| **updateTag()** | 즉시 캐시 갱신 | 실시간 데이터 반영 |

#### Breaking Changes 대응

```typescript
// ❌ 기존 (동기)
const { id } = params;
const { q } = searchParams;
const cookie = cookies().get('token');

// ✅ Next.js 16 (비동기)
const { id } = await params;
const { q } = await searchParams;
const cookie = (await cookies()).get('token');
```

### 백엔드/인프라

| 기술 | 용도 |
|-----|-----|
| **Supabase PostgreSQL** | 지오코딩 결과 저장 (무료 500MB) |
| **Vercel** | 배포, Edge Functions |
| **Vercel Analytics** | Core Web Vitals 모니터링 |

### 외부 API

| API | 용도 | 인증 |
|-----|-----|-----|
| 유치원 알리미 Open API | 유치원/어린이집 데이터 | SNS 로그인 (운영 계정) |
| Kakao Maps API | 지도 표시, 마커 | API 키 |
| Kakao 주소 검색 API | 주소 → 좌표 변환 | API 키 |
| Geolocation API | GPS 위치 감지 | 브라우저 내장 |

---

## 2. 아키텍처

### 2.1 API 호출 흐름

```
[클라이언트]
    ↓
[Next.js API Routes] ← 프록시 역할
    ├─ API 키 보안
    ├─ Rate Limit 관리
    ├─ 24시간 캐싱
    └─ 병렬 호출 후 통합 응답
    ↓
[유치원 알리미 API] + [Kakao API]
    ↓
[Supabase] ← 지오코딩 결과 영구 저장
```

### 2.2 데이터 흐름

```
1. 사용자 위치 획득 (GPS or 주소 검색)
2. 위치 → 시군구 코드 변환
3. 해당 시군구 + 인접 시군구 API 조회
4. 서버에서 5-8개 API 병렬 호출 (일반현황, 통학차량, 급식, 방과후, 면적)
5. 클라이언트에서 Haversine formula로 반경 필터링
6. 거리순 정렬 후 표시
```

### 2.3 캐싱 전략

| 레이어 | 대상 | TTL |
|-------|-----|-----|
| API Routes | 유치원 알리미 응답 | 24시간 |
| Supabase | 지오코딩 결과 | 영구 (주소 변경 시 갱신) |
| Browser | 정적 자원 | Vercel 기본 설정 |

---

## 3. 데이터베이스 스키마

### Supabase PostgreSQL

```sql
-- 지오코딩 결과 저장 테이블
CREATE TABLE kindergartens (
  id SERIAL PRIMARY KEY,
  kindercode VARCHAR(20) UNIQUE NOT NULL,  -- 유치원 알리미 고유 코드
  name VARCHAR(100) NOT NULL,
  address VARCHAR(200) NOT NULL,
  lat DECIMAL(10, 7) NOT NULL,
  lng DECIMAL(10, 7) NOT NULL,
  sido_code VARCHAR(10),                    -- 시도 코드
  sigungu_code VARCHAR(10),                 -- 시군구 코드
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_kindergartens_sigungu ON kindergartens(sigungu_code);
CREATE INDEX idx_kindergartens_location ON kindergartens(lat, lng);
```

### 데이터 수집 전략

- **점진적 수집 (on-demand)**: 사용자 검색 시 없는 유치원만 지오코딩
- 새로운 지역 첫 검색 시 초기 로딩 1-2초 추가 소요
- 이후 검색은 DB에서 즉시 조회

---

## 4. 페이지 구조

```
/
├── /                           # 홈 - 위치 검색
├── /search                     # 검색 결과 (목록/지도 뷰)
│   ?lat=37.5&lng=127.0         # 위치 좌표
│   &radius=1                   # 반경 (1, 2, 5 km)
│   &type=all|kindergarten|daycare  # 기관 유형 필터
├── /compare                    # 비교표
│   ?ids=K001,K002,K003        # 비교할 유치원 코드
├── /privacy                    # 개인정보처리방침
└── /about                      # 서비스 소개
```

### 라우팅 전략

- **URL 기반 상태 관리**: 모든 검색 조건은 query params로 관리
- 공유 가능한 URL
- 브라우저 뒤로가기 정상 동작
- SEO 친화적 (기본 수준)

---

## 5. MVP 기능 상세

### 5.1 위치 기반 검색

#### GPS 위치 감지 플로우

```
[앱 접속]
    ↓
[위치 권한 요청]
    ↓
    ├─ [허용] → GPS 좌표 획득 → 시군구 코드 변환 → 검색
    │
    └─ [거부] → 주소 검색 UI 표시 (Kakao 주소 검색 API)
```

#### 주소 검색 (GPS 거부 시)

- Kakao 주소 검색 API 사용
- 자동완성으로 정확한 주소 입력 유도
- 선택 시 즉시 좌표 획득

#### 반경 옵션

| 반경 | 설명 | 기본값 |
|-----|-----|-------|
| 1km | 도보 10분 이내 | ✅ |
| 2km | 자전거/차량 5분 | |
| 5km | 통학차량 이용 가능 | |

#### 경계 지역 처리

- 사용자 위치의 시군구 + **인접 시군구** 함께 조회
- 2-4개 시군구 API 동시 호출

### 5.2 검색 결과 화면

#### 목록 뷰 (기본)

```
┌─────────────────────────────────────┐
│ 📍 서울 강남구 역삼동 (변경)          │
│ 반경: [1km ▼]  유형: [전체 ▼]       │
├─────────────────────────────────────┤
│ 🔍 8개 기관 발견                     │
├─────────────────────────────────────┤
│ ☐ 역삼유치원 (공립)         0.3km   │
│    정원 40명 | 현원 38명 | 🚌 있음   │
│    [▼ 상세보기]                      │ ← 클릭 시 expand
├─────────────────────────────────────┤
│ ☐ 해맑은어린이집 (민간)      0.5km   │
│    정원 60명 | 현원 55명 | 🚌 없음   │
├─────────────────────────────────────┤
│ [더보기] (초기 20개, 이후 Load More) │
├─────────────────────────────────────┤
│ [선택한 3개 비교하기 →]              │
└─────────────────────────────────────┘
```

#### 상세 정보 (expand in-place)

목록 아이템 클릭 시 해당 위치에서 확장:

```
├─────────────────────────────────────┤
│ ☑ 역삼유치원 (공립)         0.3km   │
│    정원 40명 | 현원 38명 | 🚌 있음   │
│    ─────────────────────────────    │
│    📍 서울 강남구 역삼로 123         │
│    📞 02-1234-5678                  │
│    🍽️ 급식: 직영                     │
│    📐 1인당 면적: 3.2㎡              │
│    ⏰ 방과후: 운영                   │
│    [▲ 접기]                         │
├─────────────────────────────────────┤
```

#### 지도 뷰 (토글)

- Kakao Maps 기반
- 유치원/어린이집 마커 표시
- 마커 클릭 → 인포 윈도우 (기관명, 거리, 유형)
- 인포 윈도우에서 체크박스로 비교 선택 가능

#### 필터

- **기관 유형**: 전체 / 유치원만 / 어린이집만
- 탭 또는 드롭다운으로 제공

#### 결과 없음 처리

```
┌─────────────────────────────────────┐
│ 주변 1km 내에 유치원이 없습니다.     │
│                                     │
│ [반경 2km로 검색하기]               │
│ [반경 5km로 검색하기]               │
│                                     │
│ 또는 다른 위치로 검색해보세요.       │
│ [위치 변경]                         │
└─────────────────────────────────────┘
```

### 5.3 비교표

#### 선택 제한

- **최대 3개** 동시 비교
- 3개 초과 선택 시 toast: "최대 3개까지 비교할 수 있습니다"

#### 비교표 UI (모바일, accordion)

```
┌─────────────────────────────────────┐
│ 📊 비교 결과 (3개 기관)              │
├─────────────────────────────────────┤
│ [기본 정보 ▼]                       │
│  ┌───────┬──────────┬───────┬──────┐
│  │       │ 역삼유치원│ 해맑은 │ 꿈나무│
│  ├───────┼──────────┼───────┼──────┤
│  │ 유형  │ 공립     │ 민간  │ 사립 │
│  │ 거리  │ 🟢0.3km │ 0.5km │ 0.8km│  ← 최소값 강조
│  └───────┴──────────┴───────┴──────┘
├─────────────────────────────────────┤
│ [정원/현원 ▶]                       │  ← 접힌 상태
├─────────────────────────────────────┤
│ [통학/급식 ▶]                       │
├─────────────────────────────────────┤
│ [시설/면적 ▶]                       │
├─────────────────────────────────────┤
│ [📤 카카오톡 공유] [🔗 링크 복사]    │
└─────────────────────────────────────┘
```

#### 비교 항목

| 섹션 | 항목 | 강조 기준 |
|-----|-----|---------|
| 기본 정보 | 기관명, 설립유형, 거리 | 거리 최소 |
| 정원/현원 | 정원, 현원, 여유석 | 여유석 최대 |
| 통학/급식 | 통학차량 유무/대수, 급식 방식 | - |
| 시설/면적 | 1인당 면적, 놀이터 유무 | 면적 최대 |
| 방과후 | 운영 여부, 시간 | - |

#### 강조 표시

- 각 항목에서 가장 좋은 값: `bg-green-50` + 볼드
- 예: 거리 최소, 면적 최대, 여유석 최대

### 5.4 공유 기능

#### 카카오톡 공유

- Kakao SDK `shareCustom` 사용
- URL 공유 방식 (이미지 공유 X)
- og:image: 정적 대표 이미지 1개

```javascript
// 공유 데이터
{
  title: "우리동네 유치원 비교",
  description: "역삼유치원 외 2곳 비교 결과",
  imageUrl: "/og-image.png",  // 정적 이미지
  link: {
    mobileWebUrl: "https://xxx.vercel.app/compare?ids=K001,K002,K003",
    webUrl: "https://xxx.vercel.app/compare?ids=K001,K002,K003"
  }
}
```

#### 링크 복사

- `navigator.clipboard.writeText()`
- 성공 시 toast: "링크가 복사되었습니다"

---

## 6. API 설계

### 6.1 Next.js API Routes

#### GET /api/kindergartens

검색 결과 조회

```typescript
// Request
GET /api/kindergartens?lat=37.5&lng=127.0&radius=1&type=all

// Response
{
  success: true,
  data: {
    count: 15,
    items: [
      {
        kindercode: "K12345",
        name: "역삼유치원",
        type: "public",        // public, private, home
        address: "서울 강남구 역삼로 123",
        lat: 37.501,
        lng: 127.001,
        distance: 0.3,         // km
        capacity: 40,          // 정원
        currentCount: 38,      // 현원
        hasBus: true,
        busCount: 2,
        mealType: "direct",    // direct, outsourced, none
        hasAfterSchool: true,
        areaPerChild: 3.2      // ㎡
      },
      // ...
    ]
  }
}
```

#### GET /api/kindergartens/:kindercode

단일 유치원 상세 조회

#### POST /api/geocode

주소 → 좌표 변환 (Kakao API 프록시)

### 6.2 Rate Limiting

```typescript
// 서버 사이드 Rate Limit 관리
const rateLimiter = {
  windowMs: 60 * 1000,  // 1분
  max: 100,             // 분당 100회
  message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
};
```

---

## 7. 에러 처리

### 7.1 에러 유형별 처리

| 에러 유형 | 처리 방식 | 사용자 메시지 |
|---------|---------|-------------|
| 위치 권한 거부 | 주소 검색 UI 표시 | "위치 권한이 필요합니다. 주소를 직접 입력해주세요." |
| API 일부 실패 | 성공한 데이터만 표시, 실패 항목 N/A | - |
| API 전체 실패 | 에러 화면 + 재시도 버튼 | "데이터를 불러오는 중 오류가 발생했습니다." |
| 네트워크 오류 | 에러 토스트 | "네트워크 연결을 확인해주세요." |
| Rate Limit 초과 | 에러 토스트 | "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." |

### 7.2 에러 UI

- **인라인 토스트**: 화면 하단, 3초 후 자동 사라짐
- 심각한 에러: 전체 화면 에러 + 재시도 버튼

---

## 8. 성능 목표

| 지표 | 목표 | 측정 도구 |
|-----|-----|---------|
| First Contentful Paint (FCP) | < 1.5s | Vercel Analytics |
| Largest Contentful Paint (LCP) | < 2.5s | Vercel Analytics |
| Time to Interactive (TTI) | < 3s | Vercel Analytics |
| Cumulative Layout Shift (CLS) | < 0.1 | Vercel Analytics |

### 최적화 전략

- Skeleton UI로 체감 로딩 시간 단축
- 이미지 최적화 (next/image)
- 번들 사이즈 최소화
- API 응답 24시간 캐싱

---

## 9. 테스트 전략

### 9.1 Unit 테스트 (Vitest)

- 거리 계산 함수 (Haversine)
- API 응답 파싱
- 비교표 데이터 변환
- 유틸리티 함수

### 9.2 E2E 테스트 (Playwright)

- 핵심 플로우: 위치 검색 → 목록 → 비교표 생성 → 공유
- 모바일 뷰포트에서 테스트

---

## 10. 보안

### 10.1 API 키 관리

- 모든 외부 API 키는 서버 사이드에서만 사용
- 환경 변수로 관리 (Vercel Environment Variables)
- 클라이언트에 API 키 노출 없음

### 10.2 개인정보

- GPS 위치 데이터: **서버에 저장하지 않음**
- 클라이언트에서만 사용 후 폐기
- 익명 통계: Vercel Analytics만 사용

---

## 11. UI/UX 가이드

### 11.1 디자인 시스템

- **스타일**: 미니멀 화이트
- **색상**:
  - Primary: 회색 계열 (#1f2937, #6b7280)
  - Accent: 초록색 (강조 표시, #10b981)
  - Background: 흰색 (#ffffff)
  - Border: 밝은 회색 (#e5e7eb)

### 11.2 타이포그래피

- 한글: Pretendard 또는 시스템 폰트
- 숫자: 고정폭 (tabular-nums)

### 11.3 터치 친화적 디자인

| 요소 | 최소 크기 |
|-----|---------|
| 버튼 | 48x48px |
| 체크박스 | 44x44px |
| 간격 | 8px 이상 |

### 11.4 로딩 상태

- **Skeleton UI** 사용
- 목록: 회색 카드 플레이스홀더
- 지도: 로딩 오버레이

---

## 12. 배포

### 12.1 환경

| 환경 | URL | 용도 |
|-----|-----|-----|
| Production | xxx.vercel.app | 실서비스 |
| Preview | xxx-xxx.vercel.app | PR 미리보기 |
| Development | localhost:3000 | 로컬 개발 |

### 12.2 환경 변수

```env
# 유치원 알리미 API
KINDERGARTEN_API_KEY=xxx

# Kakao API
KAKAO_REST_API_KEY=xxx
NEXT_PUBLIC_KAKAO_JS_KEY=xxx

# Supabase
SUPABASE_URL=xxx
SUPABASE_ANON_KEY=xxx

# Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=xxx
```

---

## 13. 피드백 수집

- 하단에 "건의하기" 버튼
- Google Form 연동
- 수집 항목: 기능 제안, 버그 신고, 기타

---

## 14. 페이지별 상세

### 14.1 홈페이지 (/)

```
┌─────────────────────────────────────┐
│                                     │
│         🏫 우리동네 유치원           │
│                                     │
│  주변 유치원을 찾고 한눈에 비교하세요  │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📍 현재 위치로 검색하기      │   │ ← 메인 CTA
│  └─────────────────────────────┘   │
│                                     │
│  또는                               │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🔍 주소로 검색하기           │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

### 14.2 개인정보처리방침 (/privacy)

포함 항목:
- 수집하는 정보: **없음** (위치 정보 저장 안 함)
- 제3자 제공: Vercel Analytics, Kakao Maps
- 쿠키 사용: 필수 쿠키만
- 연락처

---

## 15. MVP 범위 요약

### 포함 ✅

- GPS/주소 기반 위치 검색
- 반경 선택 (1/2/5km)
- 인접 시군구 포함 검색
- 목록 뷰 + 지도 뷰
- 유치원/어린이집 필터
- 상세 정보 (expand in-place)
- 비교표 (최대 3개, accordion)
- 최적값 강조 표시
- 카카오톡/링크 공유
- 피드백 버튼 (Google Form)
- 개인정보처리방침
- 서비스 소개

### 제외 (Phase 2) ❌

- 이미지 저장
- 광고 (AdSense)
- PWA
- 별도 상세 페이지
- 정렬 옵션
- SEO 랜딩 페이지
- 즐겨찾기
- 사용자 리뷰

---

## 16. 개발 우선순위

### Week 1: 기반 구축

1. Next.js 16 프로젝트 셋업
2. Supabase 연동 및 스키마 생성
3. 유치원 알리미 API 연동 (API Routes)
4. Kakao Maps/주소 API 연동

### Week 2: 핵심 기능

1. 홈페이지 (위치 검색)
2. 검색 결과 목록 뷰
3. 지도 뷰
4. 상세 정보 (expand)

### Week 3: 비교 & 마무리

1. 비교표 기능
2. 공유 기능
3. 에러 처리 & 로딩 UI
4. 테스트 작성
5. 배포 및 QA

---

## 17. 기술적 결정 요약

| 결정 사항 | 선택 | 이유 |
|---------|-----|-----|
| Next.js 버전 | 16.1.x | CVE-2025-66478 보안 패치 필수, Cache Components |
| 상태 관리 | URL params | 공유 가능, 뒤로가기 지원 |
| DB | Supabase | 무료 500MB, PostGIS 지원 |
| 캐싱 시간 | 24시간 | API 호출 최소화, 데이터 자주 안 변함 |
| 반경 검색 | Haversine (클라이언트) | 간단, DB 없이 가능 |
| UI 컴포넌트 | shadcn/ui | 접근성 내장, 커스터마이징 용이 |
| 비교 최대 수 | 3개 | 모바일 UX 최적 |
| 로딩 UI | Skeleton | 체감 로딩 시간 단축 |
| 상세 정보 | expand in-place | 페이지 이동 없이 정보 확인 |
| 공유 방식 | URL | 최신 데이터 보장 |
| 초기 데이터 | on-demand | 비용 없이 점진적 구축 |
