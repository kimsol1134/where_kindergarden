# 우리동네 유치원 - Claude Code 개발 가이드

> 모바일 기반 위치 검색으로 주변 유치원/어린이집을 비교하는 서비스

---

## 절대 규칙 (반드시 준수)

다음 규칙은 예외 없이 반드시 지켜야 합니다:

### 코드 품질
- **console.log 절대 남기지 않기** - 디버깅 후 반드시 제거
- **any 타입 사용 금지** - 명시적 타입 정의 필수
- **주석 처리된 코드 커밋 금지** - 삭제하거나 복원
- **TODO 주석 남기고 PR 올리지 않기** - 해결하거나 이슈로 등록

### 보안
- **API 키를 코드에 하드코딩 금지** - 환경 변수 사용
- **사용자 입력 직접 신뢰 금지** - 항상 검증/새니타이징
- **.env 파일 커밋 금지** - .gitignore 확인

### 파일 보호 (건드리지 말 것)
- `next.config.ts` - 보안 설정 포함, 수정 시 반드시 확인 요청
- `.env.local` - 환경 변수, 직접 수정 금지
- `package.json`의 engines 필드 - Node.js 버전 고정

### Git 브랜치 규칙
- **main 브랜치에서 직접 작업 금지** - 반드시 feature 브랜치 생성 후 작업
- **모든 기능 개발은 Git Worktree 사용** - 아래 Git 워크플로우 섹션 참고

---

## Git 워크플로우

### 저장소 정보

- **GitHub**: https://github.com/kimsol1134/where_kindergarden.git

### Git Worktree 기반 개발

> **중요**: 새로운 기능 개발 시 **반드시** Git Worktree를 사용합니다.
> main 브랜치에서 직접 커밋하지 마세요!

#### 워크플로우

```bash
# 1. 새 기능 작업 시작 - worktree 생성
git worktree add ../where_kindergarden-feature-name feature/feature-name

# 2. worktree 디렉토리로 이동하여 작업
cd ../where_kindergarden-feature-name

# 3. 작업 완료 후 커밋 및 푸시
git add .
git commit -m "feat: 기능 설명"
git push -u origin feature/feature-name

# 4. GitHub에서 PR 생성

# 5. PR 머지 후 worktree 정리
cd ../where_kindergarden
git worktree remove ../where_kindergarden-feature-name
git branch -d feature/feature-name
```

#### Worktree 관리 명령어

```bash
# 현재 worktree 목록 확인
git worktree list

# worktree 제거 (강제)
git worktree remove --force ../where_kindergarden-feature-name

# 고아 worktree 정리
git worktree prune
```

#### 브랜치 네이밍 규칙

- `feature/기능명` - 새 기능 개발
- `fix/버그명` - 버그 수정
- `refactor/대상` - 리팩토링
- `docs/문서명` - 문서 수정

#### PR 체크리스트

- [ ] 테스트 통과 (`pnpm test`)
- [ ] 린트 통과 (`pnpm lint`)
- [ ] 타입 체크 통과 (`pnpm type-check`)
- [ ] console.log 제거 확인
- [ ] any 타입 사용 없음

### 기능 구현 후 필수 절차

**기능 구현 완료 후 반드시 아래 순서로 진행합니다:**

```bash
# 1. 유닛 테스트 실행
pnpm test

# 2. 타입 체크
pnpm type-check

# 3. 모두 통과하면 커밋
git add .
git commit -m "feat: 기능 설명"
```

- 테스트가 실패하면 커밋하지 않고 수정 후 재시도
- 새로운 기능에는 반드시 해당 기능의 유닛 테스트 작성
- API 관련 기능은 transformer, 유틸리티 함수 테스트 필수

---

## 세션 인계 (HANDOFF.md)

### 컨텍스트 리셋 전 필수 작업

세션 종료나 컨텍스트 리셋 전에 반드시 `HANDOFF.md` 파일을 작성해야 합니다.

```markdown
# HANDOFF.md

## 마지막 작업 일시
2025-01-21

## 완료된 작업
- [ ] 프로젝트 초기 설정
- [x] Supabase 스키마 생성
- [x] 유치원 알리미 API 연동

## 진행 중인 작업
- 검색 결과 목록 컴포넌트 구현 중
  - `src/components/search/KindergartenList.tsx` 작업 중
  - 정렬 로직 완료, 페이지네이션 미구현

## 다음에 할 작업
1. 페이지네이션 구현 (Load More 방식)
2. 지도 뷰 컴포넌트 작성
3. 비교 선택 기능 추가

## 주의사항 / 알려진 이슈
- Kakao Maps API 일일 호출 제한 있음 (확인 필요)
- 유치원 알리미 API 응답 시간 느림 (2-3초)

## 현재 브랜치
feature/search-list

## 참고 파일
- DETAILED_SPEC.md - 전체 기술 스펙
- CLAUDE.md - 개발 가이드
```

### 새 세션 시작 시

```bash
# 새 세션 시작하면 이 파일들을 먼저 읽어주세요
1. CLAUDE.md      # 개발 가이드
2. HANDOFF.md     # 작업 인계 내용
3. DETAILED_SPEC.md  # 필요시 참고
```

### HANDOFF.md 업데이트 시점

- 2시간 이상 연속 작업 후
- 복잡한 기능 구현 완료 후
- 세션 종료 요청 시
- 에러 해결 후 (해결 방법 기록)

---

## 프로젝트 개요

- **서비스명**: 우리동네 유치원
- **목적**: 현재 위치 기반 유치원/어린이집 검색 및 비교표 생성
- **주요 기능**: GPS/주소 검색, 반경 필터(1/2/5km), 목록/지도 뷰, 최대 3개 기관 비교, 카카오톡 공유

---

## 기술 스택

| 분류 | 기술 | 버전 |
|-----|-----|-----|
| Framework | Next.js | 16.1.x |
| UI Library | React | 19.2.x |
| Runtime | Node.js | 20.9+ |
| Language | TypeScript | 5.1.0+ |
| Styling | TailwindCSS | 4.x |
| Components | shadcn/ui + Radix | latest |
| State | Zustand + URL params | 5.x |
| Database | Supabase PostgreSQL | - |
| Testing | Vitest + Playwright | - |
| Deployment | Vercel | - |

---

## TDD 개발 원칙

### 테스트 우선 개발 프로세스

```
1. RED   - 실패하는 테스트 먼저 작성
2. GREEN - 테스트를 통과하는 최소한의 코드 구현
3. REFACTOR - 코드 개선 (테스트는 계속 통과해야 함)
```

### 테스트 구조

```
src/
├── __tests__/           # 통합 테스트
├── components/
│   └── __tests__/       # 컴포넌트 테스트
├── lib/
│   └── __tests__/       # 유틸리티 테스트
└── e2e/                 # Playwright E2E 테스트
```

### Unit 테스트 (Vitest)

필수 테스트 대상:
- 거리 계산 함수 (Haversine formula)
- API 응답 파싱 및 변환
- 비교표 데이터 정규화
- 유틸리티 함수 (시군구 코드 변환 등)

```typescript
// 테스트 파일 네이밍: *.test.ts 또는 *.spec.ts
// 예: haversine.test.ts

import { describe, it, expect } from 'vitest';
import { calculateDistance } from '@/lib/geo';

describe('calculateDistance', () => {
  it('should calculate distance between two points correctly', () => {
    const distance = calculateDistance(
      { lat: 37.5665, lng: 126.9780 }, // 서울시청
      { lat: 37.5512, lng: 126.9882 }  // 남산타워
    );
    expect(distance).toBeCloseTo(1.89, 1); // km
  });
});
```

### E2E 테스트 (Playwright)

핵심 사용자 플로우 테스트:
- 위치 검색 → 목록 표시 → 비교 선택 → 비교표 생성 → 공유

```typescript
// e2e/search-flow.spec.ts
import { test, expect } from '@playwright/test';

test('search and compare kindergartens', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /현재 위치로 검색/ }).click();
  // ... 테스트 흐름
});
```

### 테스트 실행 명령어

```bash
# Unit 테스트
pnpm test              # 전체 실행
pnpm test:watch        # 감시 모드
pnpm test:coverage     # 커버리지 포함

# E2E 테스트
pnpm test:e2e          # 헤드리스 모드
pnpm test:e2e:ui       # UI 모드
```

---

## React/Next.js 개발 규칙

### Critical: 워터폴 제거

```typescript
// BAD: 순차적 await (워터폴 발생)
const user = await getUser(id);
const posts = await getPosts(userId);
const comments = await getComments(postId);

// GOOD: 독립적인 작업은 병렬 실행
const [user, posts] = await Promise.all([
  getUser(id),
  getPosts(userId)
]);
```

### Critical: 번들 사이즈 최적화

```typescript
// BAD: barrel file import
import { Check, X, Menu } from 'lucide-react';

// GOOD: 직접 import
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';

// GOOD: 무거운 컴포넌트는 dynamic import
import dynamic from 'next/dynamic';
const KakaoMap = dynamic(() => import('@/components/KakaoMap'), {
  ssr: false,
  loading: () => <MapSkeleton />
});
```

### High: 서버 사이드 성능

```typescript
// Server Action에서 항상 인증 검증
'use server';

export async function updateKindergarten(id: string, data: FormData) {
  const session = await auth(); // 항상 검증
  if (!session) throw new Error('Unauthorized');
  // ...
}

// RSC 경계에서 최소한의 데이터만 전달
// BAD: 전체 객체 전달
<ClientComponent data={kindergartens} />

// GOOD: 필요한 필드만 전달
<ClientComponent
  data={kindergartens.map(({ id, name, distance }) => ({ id, name, distance }))}
/>
```

### Medium: 리렌더 최적화

```typescript
// BAD: 객체 직접 비교
useEffect(() => {
  // searchParams 객체가 변경될 때마다 실행
}, [searchParams]);

// GOOD: 필요한 primitive 값만 의존성에 추가
const lat = searchParams.get('lat');
const lng = searchParams.get('lng');
useEffect(() => {
  // lat, lng 값이 변경될 때만 실행
}, [lat, lng]);

// Lazy state initialization
// BAD
const [state] = useState(expensiveComputation());

// GOOD
const [state] = useState(() => expensiveComputation());
```

### Medium: 렌더링 성능

```typescript
// 정적 JSX는 컴포넌트 외부로 호이스팅
const staticHeader = <header className="...">우리동네 유치원</header>;

function Page() {
  return (
    <div>
      {staticHeader}  {/* 매 렌더마다 재생성되지 않음 */}
      <DynamicContent />
    </div>
  );
}

// 조건부 렌더링시 && 대신 삼항 연산자 사용
// BAD: count가 0일 때 "0"이 렌더됨
{count && <Badge>{count}</Badge>}

// GOOD
{count > 0 ? <Badge>{count}</Badge> : null}
```

### Low: JavaScript 성능

```typescript
// 반복 조회는 Map/Set 사용
// BAD: O(n) 조회 반복
const found = items.find(item => item.id === targetId);

// GOOD: O(1) 조회
const itemMap = new Map(items.map(item => [item.id, item]));
const found = itemMap.get(targetId);

// 배열 불변 정렬
// BAD: 원본 배열 변경
items.sort((a, b) => a.distance - b.distance);

// GOOD: 새 배열 반환
const sorted = items.toSorted((a, b) => a.distance - b.distance);
```

---

## 프로젝트 구조

```
.claude/
└── agents/
    ├── review-curator.md         # 후기 큐레이션 Subagent
    └── chrome-review-extractor.md # URL 배치 추출 Subagent

scripts/
├── collect-reviews.ts        # 후기 수집 (v2)
├── collect-reviews-v3.ts     # 후기 수집 (v3 - 지역 검증)
├── enrich-chrome-reviews.ts  # Chrome 수집 URL 보강 (네이버 API)
├── merge-chrome-reviews.ts   # Chrome 수집 결과 병합
├── filter-reviews.ts         # 자동 스팸 필터링
├── curate-reviews.ts         # 큐레이션
└── sync-kindergartens.ts     # 유치원 데이터 동기화

src/
├── app/
│   ├── page.tsx              # 홈 (위치 검색)
│   ├── search/
│   │   └── page.tsx          # 검색 결과
│   ├── compare/
│   │   └── page.tsx          # 비교표
│   ├── privacy/
│   │   └── page.tsx          # 개인정보처리방침
│   ├── about/
│   │   └── page.tsx          # 서비스 소개
│   └── api/
│       ├── kindergartens/
│       │   └── route.ts      # 유치원 검색 API
│       └── geocode/
│           └── route.ts      # 지오코딩 API
├── components/
│   ├── ui/                   # shadcn/ui 컴포넌트
│   ├── search/               # 검색 관련 컴포넌트
│   ├── compare/              # 비교표 관련 컴포넌트
│   └── map/                  # 지도 관련 컴포넌트
├── lib/
│   ├── api/                  # API 클라이언트
│   ├── geo/                  # 지리 계산 유틸
│   ├── supabase/             # Supabase 클라이언트
│   └── utils/                # 공통 유틸리티
├── hooks/                    # 커스텀 훅
├── stores/                   # Zustand 스토어
└── types/                    # TypeScript 타입 정의
```

---

## Next.js 16 주의사항

### 비동기 API 변경 (Breaking Change)

```typescript
// BAD: 동기 접근 (더 이상 지원 안 함)
const { id } = params;
const { q } = searchParams;
const cookie = cookies().get('token');

// GOOD: 비동기 접근 필수
const { id } = await params;
const { q } = await searchParams;
const cookie = (await cookies()).get('token');
```

### Cache Components 활용

```typescript
// 명시적 캐싱
'use cache';

export async function getKindergartens(sigunguCode: string) {
  // 24시간 캐싱
  return await fetchKindergartenData(sigunguCode);
}
```

### 보안 설정 (CVE-2025-66478 대응)

```typescript
// next.config.ts
const nextConfig = {
  images: {
    dangerouslyAllowLocalIP: false,
    maximumRedirects: 3,
    remotePatterns: [
      { protocol: 'https', hostname: 'your-cdn.com' }
    ]
  }
};
```

---

## 코딩 컨벤션

### 파일 네이밍

- 컴포넌트: `PascalCase.tsx` (예: `SearchResult.tsx`)
- 유틸리티: `camelCase.ts` (예: `calculateDistance.ts`)
- 타입 정의: `types.ts` 또는 `*.types.ts`
- 테스트: `*.test.ts` 또는 `*.spec.ts`

### 컴포넌트 구조

```typescript
// 1. imports
import { useState } from 'react';

// 2. types
interface Props {
  items: Kindergarten[];
}

// 3. component
export function KindergartenList({ items }: Props) {
  // hooks first
  const [selected, setSelected] = useState<string[]>([]);

  // derived state
  const sortedItems = items.toSorted((a, b) => a.distance - b.distance);

  // handlers
  const handleSelect = (id: string) => {
    setSelected(prev => [...prev, id]);
  };

  // render
  return (
    <ul>
      {sortedItems.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

### 에러 처리

```typescript
// API 응답 타입
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// 에러 바운더리 사용
<ErrorBoundary fallback={<ErrorFallback />}>
  <KindergartenList />
</ErrorBoundary>
```

---

## 개발 명령어

```bash
# 개발 서버 실행
pnpm dev

# 빌드
pnpm build

# 프로덕션 실행
pnpm start

# 린트
pnpm lint

# 타입 체크
pnpm type-check

# 테스트
pnpm test
pnpm test:e2e

# Supabase 마이그레이션
pnpm db:migrate
pnpm db:generate

# TestFlight 배포 (수동 - Xcode 사용)
# 아래 "iOS 배포" 섹션 참고

# TestFlight 배포 (자동화 - Fastlane)
pnpm deploy:testflight        # 전체 배포 (빌드 + 업로드)
pnpm deploy:testflight:build  # 빌드만 (업로드 없이)
pnpm deploy:testflight:api    # API Key 방식 배포 (권장)
```

---

## iOS 배포 (TestFlight)

### 현재 배포 방식: 수동 (Xcode)

> **참고**: Fastlane 자동화 스크립트도 있지만, 현재는 Xcode 수동 배포를 사용합니다.

```bash
# 1. 웹 앱 빌드
pnpm build

# 2. iOS 프로젝트에 동기화
npx cap sync ios

# 3. Xcode에서 열기
npx cap open ios
```

**Xcode에서 수동 작업:**
1. Product → Archive
2. Distribute App → App Store Connect
3. Upload
4. TestFlight에서 빌드 확인 후 테스터에게 배포

### App Store 메타데이터

App Store Connect 제출 시 필요한 메타데이터는 별도 문서에 정리되어 있습니다.

| 문서 | 설명 |
|------|------|
| `docs/APP_STORE_METADATA.md` | App Store Connect 메타데이터 (복사용) |
| `ios/App/fastlane/metadata/` | Fastlane 형식 메타데이터 (참고용) |

---

## 환경 변수

```env
# .env.local

# 유치원 알리미 API
KINDERGARTEN_API_KEY=

# Kakao API
KAKAO_REST_API_KEY=
NEXT_PUBLIC_KAKAO_JS_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Analytics (optional)
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=
```

---

## 외부 API 참고

- [유치원 알리미 Open API](https://e-childschoolinfo.moe.go.kr/)
- [Kakao Maps API](https://apis.map.kakao.com/)
- [Kakao 주소 검색 API](https://developers.kakao.com/docs/latest/ko/local/dev-guide)

### 유치원 알리미 API 엔드포인트 (공식)

Base URL: `https://e-childschoolinfo.moe.go.kr/api/notice`

| 기능 | 엔드포인트 | 비고 |
|-----|-----------|------|
| 기본현황 | `basicInfo` | 유치원 기본 정보 |
| 기본현황(신규) | `basicInfo2` | |
| 건물현황 | `building` | |
| 교실면적현황 | `classArea` | 면적 정보 |
| 직위·자격별 교직원현황 | `teachersInfo` | |
| 수업일수현황 | `lessonDay` | |
| 급식운영현황 | `schoolMeal` | 급식 정보 |
| 통학차량현황 | `schoolBus` | 차량 운영 여부 |
| 근속연수현황 | `yearOfWork` | |
| 환경위생 관리현황 | `environmentHygiene` | |
| 안전점검·교육 실시현황 | `safetyEdu` | |
| 공제회 가입현황 | `deductionSociety` | |
| 보험별 가입현황 | `insurance` | |
| 방과후 과정 편성 운영 현황 | `afterSchoolPresent` | 방과후 운영 여부 |

> **주의**: "현원현황" API (`childAbstnt`)는 공식적으로 제공되지 않음

#### 현재 사용 중인 엔드포인트

```typescript
// scripts/sync-kindergartens.ts - 13개 엔드포인트 전체 수집
'basicInfo2'         // 기본현황(신규) - 좌표(lat, lng) 포함
'building'           // 건물현황
'classArea'          // 교실면적현황
'teachersInfo'       // 직위·자격별 교직원현황
'lessonDay'          // 수업일수현황
'schoolMeal'         // 급식운영현황
'schoolBus'          // 통학차량현황
'yearOfWork'         // 근속연수현황
'environmentHygiene' // 환경위생 관리현황
'safetyEdu'          // 안전점검·교육 실시현황
'deductionSociety'   // 공제회 가입현황
'insurance'          // 보험별 가입현황
'afterSchoolPresent' // 방과후 과정
```

---

## 유치원 데이터 동기화 스크립트

### 개요

`scripts/sync-kindergartens.ts` 스크립트를 사용하여 유치원 알리미 API에서 전국 유치원 데이터를 수집합니다.

### 실행 방법

```bash
# 전체 동기화 (250개 시군구, 13개 엔드포인트)
pnpm sync:kindergartens

# 테스트 모드 (서울 종로구만)
pnpm sync:kindergartens -- --test

# JSON 파일로 저장
pnpm sync:kindergartens -- --save-json

# 테스트 + JSON 저장
pnpm sync:kindergartens -- --test --save-json
```

### 필요한 환경 변수

```env
# .env.local
KINDERGARTEN_API_KEY=your_api_key_here

# Supabase에 저장하려면 (선택사항)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 출력 파일

- **위치**: `scripts/data-output/`
- **파일명**: `kindergartens-full-YYYY-MM-DD.json`
- **크기**: 약 94MB (7,950개 유치원, 13개 엔드포인트 데이터 포함)

### 데이터 구조

```typescript
interface KindergartenRecord {
  // 핵심 필드 (DB 저장용)
  kindercode: string;
  name: string;
  address: string;
  sido_code: string;
  sigungu_code: string;
  type: 'public' | 'private' | 'home';
  capacity: number;
  current_count: number;
  has_bus: boolean;
  bus_count: number;
  meal_type: 'direct' | 'outsourced' | null;
  has_after_school: boolean;
  area_per_child: number;
  phone: string | null;
  homepage: string | null;
  operation_hours: string | null;
  has_playground: boolean;
  lat: number | null;    // 위도 (basicInfo2에서 제공)
  lng: number | null;    // 경도 (basicInfo2에서 제공)

  // 원시 데이터 (JSON 저장시에만 포함)
  raw_data: {
    basicInfo2: {...};
    building: {...};
    teachersInfo: {...};
    lessonDay: {...};
    schoolBus: {...};
    schoolMeal: {...};
    classArea: {...};
    yearOfWork: {...};
    environmentHygiene: {...};
    safetyEdu: {...};
    deductionSociety: {...};
    afterSchool: {...};
    insurance: [...];  // 보험은 유치원당 여러 행
  };
}
```

### 수집 프로세스

1. **시군구 코드 로드**: `scripts/data/sigungu-codes.ts`에서 250개 시군구 정보 로드
2. **병렬 API 호출**: 각 시군구별로 13개 엔드포인트 동시 호출
3. **데이터 병합**: `kindercode`를 키로 모든 데이터 병합
4. **저장**: Supabase 또는 JSON 파일로 저장

### 주의사항

- API 호출 간 300ms 딜레이 적용 (Rate limiting 대응)
- `insurance` 엔드포인트는 유치원당 여러 행 반환 (보험 종류별)
- `basicInfo2`에서 좌표(`lttdcdnt`, `lngtcdnt`) 제공
- Supabase 저장 시 `raw_data` 필드는 제외됨

---

## 유치원 후기 수집 및 큐레이션

### 개요

유치원별 학부모 후기를 네이버 블로그/카페, Google에서 자동 수집하고, 큐레이션을 거쳐 `public/data/reviews/[sido_code].json`에 지역별로 분리 저장합니다.

### 실시간 리뷰 업데이트 (앱 심사 없음)

앱은 리뷰 데이터를 **외부 웹 서버(Vercel)**에서 우선적으로 가져오도록 설정되어 있습니다. 따라서 앱 업데이트(심사) 없이 리뷰만 실시간으로 추가할 수 있습니다.

**업데이트 워크플로우:**

1. **리뷰 데이터 추가**: `src/data/reviews.json` (또는 원본 데이터 파일) 수정
2. **Git Push**: 변경 사항을 `main` 브랜치에 푸시
3. **자동 배포**: Vercel이 웹사이트를 자동으로 재배포
4. **반영 완료**: 앱을 재실행하면 사용자가 즉시 새로운 리뷰를 볼 수 있음

> **원리**: 앱 실행 시 `https://[도메인]/data/reviews.json`을 먼저 확인하고, 실패 시에만 앱 내부 데이터를 사용합니다.

---

## AdMob 및 수익화

### AdMob 설정 상태
- **iOS**: `Info.plist`에 App ID 및 추적 권한 문구(`NSUserTrackingUsageDescription`) 적용 완료
- **Android**: `AndroidManifest.xml`에 App ID 적용 완료
- **컴포넌트**: `MobileAdBanner.tsx`에서 배너 광고 단위 ID 사용

### 주의사항 (Critical)
1. **자신의 광고 클릭 금지**: 개발/테스트 중 실제 광고를 클릭하면 **계정 정지** 위험이 있습니다.
2. **테스트 모드**: 개발 시에는 `isTesting: true` 또는 테스트 기기를 등록하여 사용하세요.
3. **IDFA 필수**: iOS에서는 맞춤형 광고를 위해 앱 추적 투명성(ATT) 권한을 요청합니다. 심사 시 이 부분을 명시해야 합니다.

---

### 수집 대상 및 진행 현황

- **수집 방식**: 지역별(시도) 일괄 수집
- **현재 진행**:
  - [x] 인천 (28) 완료: `public/data/reviews/28.json` (185건)
  - [x] 서울 (11) 완료: `public/data/reviews/11.json` (1,562건)
  - [x] 경기 (41) 완료: `public/data/reviews/41.json` (2,654건)

### 스크립트 실행

```bash
# 통합 워크플로우 (권장)
# 수집 -> 큐레이션 -> 스팸필터 -> 분할을 한 번에 실행
pnpm collect:all -- --sido 11           # 서울 전체 실행
pnpm collect:all -- --sido 41           # 경기 전체 실행

# V3 수집 스크립트 (지역 검증 + 엄격 필터링)
pnpm collect:reviews:v3 -- --sido 11           # 서울 수집
pnpm collect:reviews:v3 -- --sido 41 --strict  # 경기, 엄격 모드 (3점 이상)
pnpm collect:reviews:v3 -- --sido 11 --test    # 테스트 (3개만)

# 개별 단계 실행 (수동)
pnpm collect:reviews -- --sido 11       # 1. 수집 (v2)
pnpm collect:reviews -- --sido 11 --test # (테스트: 처음 3개만)
pnpm curate:reviews                     # 2. 큐레이션
pnpm filter:reviews -- --sido 11        # 3. 스팸 필터링
pnpm split:reviews -- --sido 11         # 4. 지역 분할

# Chrome 반자동 수집 결과 병합
pnpm merge:chrome-reviews -- --input chrome-reviews.json --sido 11
pnpm merge:chrome-reviews -- --input chrome-reviews.json --sido 41 --dry-run
```

### Claude in Chrome 반자동 수집

API로 접근할 수 없는 후기(폐쇄 카페, 동적 콘텐츠 등)를 Claude in Chrome 확장 프로그램을 통해 수집합니다.

#### 프롬프트 가이드
- **위치**: `scripts/prompts/chrome-collect-reviews.md`
- **사용법**: Claude.com에서 해당 프롬프트를 참고하여 반자동 수집

#### 워크플로우 (기본)
1. Claude.com → Claude in Chrome 활성화
2. `scripts/prompts/chrome-collect-reviews.md` 가이드 따라 수집
3. JSON 형식으로 결과 저장
4. `pnpm merge:chrome-reviews` 로 기존 데이터에 병합

### URL 보강 워크플로우 (자동화)

Chrome으로 수집한 URL 목록을 네이버 검색 API로 자동 보강합니다.

#### Subagent
- **위치**: `.claude/agents/chrome-review-extractor.md`
- **역할**: URL 배치 처리, 메타데이터 추출

#### 스크립트 사용법

```bash
# 1. Chrome으로 URL 수집 후 JSON 저장
#    예: scripts/data-output/chrome-reviews-20260128.json

# 2. 네이버 API로 메타데이터 보강
pnpm enrich:chrome-reviews -- --input chrome-reviews-*.json --sido 11
pnpm enrich:chrome-reviews -- --input chrome-reviews-*.json --sido 11 --dry-run

# 3. 보강된 결과 병합
pnpm merge:chrome-reviews -- --input enriched-reviews-*.json --sido 11
```

#### 보강 스크립트 기능
- query에서 유치원명 추출
- 네이버 검색 API로 제목/스니펫/날짜 추출
- query에 유치원명 없으면 검색 결과에서 추출
- 관련성 필터링 + 스팸 제거
- ChromeCollectedReview 형식으로 저장

#### 입력 형식 (chrome-reviews-*.json)
```json
{
  "reviews": [
    {
      "url": "https://blog.naver.com/...",
      "source": "naver_blog",
      "query": "강서구 장미유치원 후기",
      "district": "강서구"
    }
  ]
}
```

#### 출력 형식 (enriched-reviews-*.json)
```json
{
  "reviews": [
    {
      "kindergartenName": "장미유치원",
      "sidoCode": "11",
      "title": "장미유치원 입학설명회 후기",
      "url": "https://blog.naver.com/...",
      "source": "naver_blog",
      "snippet": "...",
      "date": "2024-11-02"
    }
  ]
}
```

#### 병합 스크립트 옵션
| 옵션 | 설명 |
|------|------|
| `--input <file>` | 수집한 JSON 파일 경로 |
| `--sido <code>` | 시도 코드 (11=서울, 41=경기, 28=인천) |
| `--dry-run` | 저장 없이 시뮬레이션만 |

### V3 수집 스크립트 개선사항

`scripts/collect-reviews-v3.ts`는 다음 기능이 추가되었습니다:

- **지역 검증 로직**: 서울/경기 상호 오염 방지
  - 서울(11) 수집 시: 경기 지역 언급 자동 필터
  - 경기(41) 수집 시: 서울 구 이름 언급 자동 필터
- **`--strict` 모드**: 관련성 점수 3점 이상만 수집 (기본 2점)
- **제외어 자동 추가**: 검색 쿼리에 `-태권도 -부동산 -등산` 등 자동 추가
- **필터링 통계**: 스팸/지역불일치/점수미달 각각 표시

### 데이터 구조 (v2)

파일 경로: `public/data/reviews/[sido_code].json` (예: `28.json`, `11.json`)

```json
{
  "version": "YYYY-MM-DD",
  "totalCount": number,
  "kindergartenCount": number,
  "reviews": {
    "kindergarten_uuid": [
      {
        "id": "rev-XXXX",
        "title": "...",
        "url": "...",
        "source": "naver_blog",
        "snippet": "...",
        "date": "YYYY-MM-DD",
        "collectedAt": "ISOString"
      }
    ]
  }
}
```

### 필터링 정책 (큐레이션)

`scripts/curate-reviews.ts` 및 `/review-curation` 스킬에 정의된 규칙 적용:
- **블랙리스트 키워드 제외**: 음악학원, 태권도, 부동산, 꽃집, 맛집 등
- **중복 제거**: 동일 URL 제외
- **유효성 검사**: 유치원 관련성이 낮은 글 제외

### 수집 프로세스

1. `public/data/kindergartens.json`에서 대상 유치원 로드
2. 유치원명 + 지역명으로 다중 쿼리 검색 (블로그/카페)
3. `calculateRelevanceScore()`로 관련성 필터링 (score > 0만 유지)
4. 중복 URL 제거 및 ID 부여 (`rev-NNNN`)
5. `kindergartenId` 기준으로 그룹화하여 저장

### 관련 파일

| 파일 | 역할 |
|------|------|
| `scripts/collect-reviews.ts` | 수집 스크립트 (v2) |
| `scripts/collect-reviews-v3.ts` | 수집 스크립트 (v3 - 지역 검증) |
| `scripts/merge-chrome-reviews.ts` | Chrome 수집 결과 병합 |
| `scripts/prompts/chrome-collect-reviews.md` | Chrome 수집 프롬프트 가이드 |
| `scripts/filter-reviews.ts` | 자동 스팸 필터링 |
| `scripts/curate-reviews.ts` | 큐레이션 스크립트 |
| `src/lib/utils/review-utils.ts` | 관련성 점수, 지역 검증, 키워드 |
| `src/types/review.ts` | 타입 정의 |
| `src/stores/reviewStore.ts` | Zustand 스토어 |
| `.claude/agents/review-curator.md` | 큐레이션 Subagent |
| `public/data/reviews/` | 시도별 후기 데이터 |

### reviews.json 구조

```json
{
  "version": "YYYY-MM-DD",
  "lastCuratedAt": "ISO-8601 timestamp",
  "totalCount": number,
  "kindergartenCount": number,
  "reviews": {
    "kindergartenId": [{ "id", "title", "snippet", "url", "source", "date", "collectedAt" }]
  }
}
```

### 필요한 환경 변수

```env
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
GOOGLE_CSE_API_KEY=       # 선택
GOOGLE_CSE_CX=            # 선택
```

### 후기 큐레이션 Subagent (`review-curator`)

수집된 후기 중 스팸/무관 콘텐츠를 식별하고 제거하는 전문 Subagent입니다.

- **파일 위치**: `.claude/agents/review-curator.md`
- **모델**: `sonnet` (맥락 이해 정확도를 위해)
- **사용 가능 도구**: Read, Glob, Grep, Edit, Write

#### 호출 방법

```bash
# Claude Code에서 자동 위임 (권장)
"서울 리뷰 파일 큐레이션 해줘"
"경기 후기 데이터 정제해줘"

# 명시적 호출
"review-curator subagent로 11.json 검토해줘"
```

#### 제거 기준

| 유형 | 예시 |
|------|------|
| 잘못 연결된 후기 | 다른 지역/다른 유치원 글이 잘못 매핑된 경우 |
| 업체 광고 | 음식배달, 미용, 마사지, 부동산, 마술공연 섭외 등 |
| 학원 (유치원 아님) | 태권도, 피아노, 축구클럽, 발레학원 |
| 무관한 활동 | 등산, 산행, 키즈카페, 맛집, 여행 |

#### Subagent 컨텍스트 초과 방지 (Critical)

> **교훈**: 대용량 리뷰 파일(500건 이상)을 subagent에 통째로 넘기면 컨텍스트 초과로 실패함.

**반드시 지켜야 할 규칙:**

1. **스크립트 우선 접근**: 대량 큐레이션은 `filter-reviews.ts` 패턴 추가 → `pnpm filter:reviews` 실행이 가장 효율적
2. **subagent 사용 시 파일 크기 제한**: 한 subagent당 리뷰 **200건 이하** 파일만 처리
3. **대용량 파일 처리 방법**:
   - 먼저 Python/Node 스크립트로 스팸 패턴 스캔 → 자동 제거
   - 나머지 애매한 케이스만 subagent에 위임 (시군구 단위로 분할)
4. **병렬 subagent**: 3-4개 이상 동시 실행 시 독립적이고 작은 단위로 분할
5. **대용량 파일 목록** (subagent 직접 처리 금지):
   - `41.json` (경기): 1,300건+ → 시군구 파일(`41/*.json`)로 분할 처리
   - `11.json` (서울): 650건+ → 시군구 파일(`11/*.json`)로 분할 처리
   - `48.json` (경남): 260건+ → 시군구 파일(`48/*.json`)로 분할 처리

**권장 큐레이션 워크플로우:**
```
1. filter-reviews.ts 패턴으로 자동 제거 (pnpm filter:reviews -- --dry-run)
2. 추가 스팸 패턴 발견 시 filter-reviews.ts에 패턴 추가 후 재실행
3. 자동 필터로 잡히지 않는 애매한 케이스만 subagent로 소규모 파일 검토
```

#### Sonnet → Haiku 전환

다음 조건 충족 시 `.claude/agents/review-curator.md`에서 `model: haiku`로 변경 가능:
- 3-5회 사용 후 정확도 확인
- 잘못 연결된 후기 판단이 정확함
- 애매한 케이스에서 오판이 적음

### 주의사항

- 동명 유치원 주의: "예은유치원", "중앙유치원" 등 전국에 같은 이름 다수 존재
- 수집 시 유치원명이 snippet에 단순 나열만 된 글도 잡힐 수 있음 → 큐레이션 필수
- 스팸 패턴 업데이트 시 동기화 필요:
  - `src/lib/utils/review-utils.ts` (NEGATIVE_KEYWORDS, SPAM_TITLE_PATTERNS)
  - `scripts/filter-reviews.ts` (SPAM_TITLE_PATTERNS)
  - `.claude/agents/review-curator.md` (제거 기준)
